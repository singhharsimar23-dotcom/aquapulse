#!/usr/bin/env python3
"""pipelines/stac_ndvi.py
Sentinel-2 L2A STAC query, windowed COG ingestion, and NDVI processing conforming to:
- AQUAPULSE_V9_2_LEAN.md §6.3 (Signal S weak corroboration, NDVI formula)
- AQUAPULSE_V9_2_LEAN.md §7 (Data layer, Earth Search, WorldCover fallback)
- AQUAPULSE_V9_2_LEAN.md §10 S4 (Real-data pipeline, minimal variant)
"""

import argparse
import datetime
import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image
try:
    import pyproj
    import pystac_client
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.warp import transform_bounds
    from rasterio.windows import Window, from_bounds, transform as win_transform
except ImportError:
    pyproj = None
    pystac_client = None
    rasterio = None
    Resampling = None
    transform_bounds = None
    Window = None
    from_bounds = None
    win_transform = None

REPO_ROOT = Path(__file__).resolve().parent.parent
STAC_API_URL = "https://earth-search.aws.element84.com/v1"
PRIMARY_COLLECTION = "sentinel-2-c1-l2a"
FALLBACK_COLLECTION = "sentinel-2-l2a"

# Default Zone-A bbox centered in Wardha, Maharashtra (~20.7453 N, 78.6022 E)
DEFAULT_ZONE = "Zone-A"
DEFAULT_BBOX = [78.58, 20.73, 78.62, 20.76]  # [min_lon, min_lat, max_lon, max_lat]
DEFAULT_DATE_RANGE = "2026-01-01/2026-05-31"  # Dry season per §6.3 / §10 S4


def get_code_hash() -> str:
    """Computes SHA-256 of this file."""
    content = Path(__file__).read_bytes()
    return hashlib.sha256(content).hexdigest()


def search_sentinel_scene(
    bbox: List[float],
    date_range: str = DEFAULT_DATE_RANGE,
    max_cloud: float = 20.0,
) -> Tuple[pystac_client.ItemSearch, str, Any]:
    """Queries Earth Search STAC API for Sentinel-2 scene.
    Tries sentinel-2-c1-l2a first, falls back to sentinel-2-l2a.
    """
    client = pystac_client.Client.open(STAC_API_URL)
    collections = [PRIMARY_COLLECTION, FALLBACK_COLLECTION]

    for col in collections:
        try:
            search = client.search(
                collections=[col],
                bbox=bbox,
                datetime=date_range,
                query={"eo:cloud_cover": {"lt": max_cloud}},
                max_items=10,
            )
            items = list(search.items())
            if items:
                # Pick item with lowest cloud cover
                items.sort(key=lambda x: x.properties.get("eo:cloud_cover", 100.0))
                best_item = items[0]
                return search, col, best_item
        except Exception as e:
            print(f"Warning: query to {col} failed: {e}", file=sys.stderr)
            continue

    raise RuntimeError(f"No Sentinel-2 scenes found for bbox={bbox}, date_range={date_range}")


def extract_scale_offset(item: Any, band_key: str) -> Tuple[float, float]:
    """Extracts scale and offset from raster:bands or extra_fields.
    Expected scale=0.0001, offset=-0.1 per §B. Never hardcode blindly.
    """
    asset = item.assets.get(band_key)
    if not asset:
        raise KeyError(f"Asset '{band_key}' not found in STAC item {item.id}")

    raster_bands = asset.extra_fields.get("raster:bands", [])
    if raster_bands and isinstance(raster_bands, list) and len(raster_bands) > 0:
        b0 = raster_bands[0]
        scale = float(b0.get("scale", 0.0001))
        offset = float(b0.get("offset", -0.1))
        return scale, offset

    # Default fallback per §B / Sentinel-2 Processing Baseline 04.00+
    return 0.0001, -0.1


def read_windowed_bands(
    item: Any,
    bbox: List[float],
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, float, float, List[List[float]], Window, Any]:
    """Reads windowed COG data for red (B04), nir (B08), and scl (SCL).
    Resamples SCL (20m) to match red/nir (10m) using nearest neighbor per §6.3.
    Returns:
        red_dn, nir_dn, scl, scale, offset, corners_wgs84, win_red, src_red_profile
    """
    red_asset = item.assets.get("red")
    nir_asset = item.assets.get("nir")
    scl_asset = item.assets.get("scl")

    if not (red_asset and nir_asset and scl_asset):
        raise ValueError(f"STAC item {item.id} is missing required assets (red, nir, scl)")

    red_url = red_asset.href
    nir_url = nir_asset.href
    scl_url = scl_asset.href

    scale, offset = extract_scale_offset(item, "red")

    with rasterio.open(red_url) as src_red:
        tb = transform_bounds("EPSG:4326", src_red.crs, *bbox)
        win_float = from_bounds(*tb, src_red.transform)
        # Integer window boundaries
        col_off = int(np.floor(win_float.col_off))
        row_off = int(np.floor(win_float.row_off))
        width = int(np.ceil(win_float.width))
        height = int(np.ceil(win_float.height))
        win_int = Window(col_off, row_off, width, height)

        red_dn = src_red.read(1, window=win_int)
        src_crs = src_red.crs
        src_transform = src_red.transform

    with rasterio.open(nir_url) as src_nir:
        nir_dn = src_nir.read(1, window=win_int)

    with rasterio.open(scl_url) as src_scl:
        tb_scl = transform_bounds("EPSG:4326", src_scl.crs, *bbox)
        win_scl = from_bounds(*tb_scl, src_scl.transform)
        col_scl = int(np.floor(win_scl.col_off))
        row_scl = int(np.floor(win_scl.row_off))
        w_scl = int(np.ceil(win_scl.width))
        h_scl = int(np.ceil(win_scl.height))
        win_scl_int = Window(col_scl, row_scl, w_scl, h_scl)

        scl = src_scl.read(
            1,
            window=win_scl_int,
            out_shape=red_dn.shape,
            resampling=Resampling.nearest,
        )

    # Compute WGS84 corners for MapLibre image source
    # MapLibre format: [ [topLeftLon, topLeftLat], [topRightLon, topRightLat], [bottomRightLon, bottomRightLat], [bottomLeftLon, bottomLeftLat] ]
    w_trans = win_transform(win_int, src_transform)
    corners_pix = [(0, 0), (width, 0), (width, height), (0, height)]
    corners_crs = [w_trans * c for c in corners_pix]

    transformer = pyproj.Transformer.from_crs(src_crs, "EPSG:4326", always_xy=True)
    corners_wgs84 = [list(transformer.transform(x, y)) for x, y in corners_crs]

    return red_dn, nir_dn, scl, scale, offset, corners_wgs84, win_int, src_crs


def compute_ndvi_and_stats(
    red_dn: np.ndarray,
    nir_dn: np.ndarray,
    scl: np.ndarray,
    scale: float,
    offset: float,
) -> Tuple[np.ndarray, np.ndarray, Dict[str, float]]:
    """Computes NDVI and cropland statistics per §6.3:
    X = DN·scale + offset
    NDVI = (NIR - RED) / (NIR + RED)
    valid = SCL ∈ {4, 5} (ASSUMPTION per §6.3)
    Cropland mask: zone polygon fallback per §7 and §10 S4
    Returns:
        ndvi (float array with NaN for invalid), valid_mask (bool array), stats (dict)
    """
    red_refl = red_dn.astype(np.float32) * scale + offset
    nir_refl = nir_dn.astype(np.float32) * scale + offset

    # Valid mask: SCL 4 (Vegetation) or 5 (Bare / Non-vegetated) and positive reflectance
    valid_mask = np.isin(scl, [4, 5]) & (red_dn > 0) & (nir_dn > 0)

    denom = nir_refl + red_refl
    # Avoid zero division
    valid_denom = denom > 1e-6
    active_mask = valid_mask & valid_denom

    ndvi = np.full(red_dn.shape, np.nan, dtype=np.float32)
    ndvi[active_mask] = (nir_refl[active_mask] - red_refl[active_mask]) / denom[active_mask]

    # Cropland-masked valid values (fallback zone polygon per §7/§10 S4)
    valid_vals = ndvi[active_mask & ~np.isnan(ndvi)]

    if len(valid_vals) == 0:
        raise ValueError("No valid pixels found after SCL filtering.")

    p5 = float(np.percentile(valid_vals, 5))
    p95 = float(np.percentile(valid_vals, 95))
    mean_val = float(np.mean(valid_vals))
    min_val = float(np.min(valid_vals))
    max_val = float(np.max(valid_vals))
    valid_fraction = float(len(valid_vals) / ndvi.size)

    stats = {
        "p5": p5,
        "p95": p95,
        "mean": mean_val,
        "min": min_val,
        "max": max_val,
        "valid_fraction": valid_fraction,
        "total_pixels": int(ndvi.size),
        "valid_pixels": int(len(valid_vals)),
        "NDVI_soil": p5,
        "NDVI_full": p95,
    }
    return ndvi, active_mask, stats


def render_ndvi_png(
    ndvi: np.ndarray,
    valid_mask: np.ndarray,
    p5: float,
    p95: float,
    output_path: Path,
) -> None:
    """Renders NDVI array to transparent RGBA PNG suitable for MapLibre image source.
    Valid vegetation is colormapped smoothly (bare soil tan -> lime green -> lush dark green).
    Invalid/cloud pixels are transparent (alpha=0).
    """
    height, width = ndvi.shape
    rgba = np.zeros((height, width, 4), dtype=np.uint8)

    # Normalized vegetation index fc clamped to [0, 1] per §6.3
    # fc = ((NDVI - NDVI_soil) / (NDVI_full - NDVI_soil))^2
    span = max(p95 - p5, 1e-4)
    norm = np.clip((ndvi - p5) / span, 0.0, 1.0)
    fc = np.clip(norm**2, 0.0, 1.0)

    # Smooth colormap interpolation:
    # 0.0 -> Bare soil / fallow: [210, 180, 130, 210] (#D2B482)
    # 0.5 -> Moderate green: [124, 179, 66, 220] (#7CB342)
    # 1.0 -> Lush irrigated crop: [61, 220, 151, 235] (#3DDC97 ok token)
    c0 = np.array([210, 180, 130], dtype=np.float32)
    c1 = np.array([124, 179, 66], dtype=np.float32)
    c2 = np.array([61, 220, 151], dtype=np.float32)

    # Interpolate
    mask_low = valid_mask & (fc < 0.5)
    t_low = (fc[mask_low] / 0.5)[:, None]
    rgb_low = (c0 * (1.0 - t_low) + c1 * t_low).astype(np.uint8)

    mask_high = valid_mask & (fc >= 0.5)
    t_high = ((fc[mask_high] - 0.5) / 0.5)[:, None]
    rgb_high = (c1 * (1.0 - t_high) + c2 * t_high).astype(np.uint8)

    rgba[mask_low, :3] = rgb_low
    rgba[mask_low, 3] = 210

    rgba[mask_high, :3] = rgb_high
    rgba[mask_high, 3] = 230

    img = Image.fromarray(rgba, mode="RGBA")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, "PNG", optimize=True)


def run_pipeline(
    zone: str = DEFAULT_ZONE,
    bbox: Optional[List[float]] = None,
    date_range: str = DEFAULT_DATE_RANGE,
    output_root: Optional[Path] = None,
) -> Dict[str, Any]:
    """Runs the STAC NDVI pipeline and generates the 4 JSON files + NDVI PNG:
    1. ndvi.png
    2. bounds.json
    3. stats.json
    4. provenance.json
    5. metadata.json (scene metadata)
    """
    if bbox is None:
        bbox = DEFAULT_BBOX
    if output_root is None:
        output_root = REPO_ROOT / "public" / "data"

    print(f"=== AquaPulse STAC NDVI Pipeline [Zone: {zone}] ===")
    print(f"Querying Earth Search STAC ({STAC_API_URL})...")
    search, col_name, item = search_sentinel_scene(bbox, date_range=date_range)

    dt_str = item.datetime.strftime("%Y-%m-%d")
    out_dir = output_root / zone / dt_str
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Selected Scene: {item.id}")
    print(f"  Collection: {col_name}")
    print(f"  Datetime: {item.datetime.isoformat()}")
    print(f"  Cloud Cover: {item.properties.get('eo:cloud_cover', 0):.2f}%")
    print(f"  Target Dir: {out_dir}")

    # Read windowed bands
    red_dn, nir_dn, scl, scale, offset, corners_wgs84, win_int, src_crs = read_windowed_bands(item, bbox)

    # Compute NDVI & Statistics
    ndvi, valid_mask, stats = compute_ndvi_and_stats(red_dn, nir_dn, scl, scale, offset)
    stats["zone"] = zone
    stats["date"] = dt_str
    stats["scene_id"] = item.id
    stats["crs"] = str(src_crs)

    # Render PNG
    png_path = out_dir / "ndvi.png"
    render_ndvi_png(ndvi, valid_mask, stats["p5"], stats["p95"], png_path)
    print(f"Wrote NDVI image: {png_path} ({png_path.stat().st_size} bytes)")

    # 1. bounds.json (MapLibre image source WGS84 corners)
    bounds_data = {
        "coordinates": corners_wgs84,
        "bbox": bbox,
        "crs": "EPSG:4326",
        "order": ["top-left", "top-right", "bottom-right", "bottom-left"],
    }
    bounds_path = out_dir / "bounds.json"
    bounds_path.write_text(json.dumps(bounds_data, indent=2), encoding="utf-8")

    # 2. stats.json
    stats_path = out_dir / "stats.json"
    stats_path.write_text(json.dumps(stats, indent=2), encoding="utf-8")

    # Raw item dict hash for input_artifact_sha256
    raw_item_bytes = json.dumps(item.to_dict(), sort_keys=True).encode("utf-8")
    item_sha256 = hashlib.sha256(raw_item_bytes).hexdigest()

    # 3. provenance.json per §A and §10 S4
    prov_data = {
        "kind": "REPLAY",
        "scene_id": item.id,
        "collection": col_name,
        "stac_item_url": f"{STAC_API_URL}/collections/{col_name}/items/{item.id}",
        "datetime": item.datetime.isoformat(),
        "cloud_cover_pct": float(item.properties.get("eo:cloud_cover", 0.0)),
        "code_hash": get_code_hash(),
        "input_artifact_sha256": item_sha256,
        "source": f"Earth Search AWS Sentinel-2 {col_name}",
        "asOf": item.datetime.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cropland_mask_method": "zone_polygon_fallback",
        "valid_classes_scl": [4, 5],
        "scale": scale,
        "offset": offset,
    }
    prov_path = out_dir / "provenance.json"
    prov_path.write_text(json.dumps(prov_data, indent=2), encoding="utf-8")

    # 4. metadata.json (scene metadata)
    metadata_data = {
        "id": item.id,
        "collection": col_name,
        "datetime": item.datetime.isoformat(),
        "cloud_cover": float(item.properties.get("eo:cloud_cover", 0.0)),
        "platform": item.properties.get("platform", "sentinel-2"),
        "constellation": item.properties.get("constellation", "sentinel-2"),
        "instruments": item.properties.get("instruments", ["msi"]),
        "bbox": item.bbox,
        "assets": {
            "red": {"href": item.assets["red"].href, "scale": scale, "offset": offset},
            "nir": {"href": item.assets["nir"].href, "scale": scale, "offset": offset},
            "scl": {"href": item.assets["scl"].href},
        },
    }
    metadata_path = out_dir / "metadata.json"
    metadata_path.write_text(json.dumps(metadata_data, indent=2), encoding="utf-8")

    # Also sync artifacts to frontend/public/data/{zone}/{date} for Tier-0 dev server
    frontend_dir = REPO_ROOT / "frontend" / "public" / "data" / zone / dt_str
    if (REPO_ROOT / "frontend").exists():
        frontend_dir.mkdir(parents=True, exist_ok=True)
        for f in [png_path, bounds_path, stats_path, prov_path, metadata_path]:
            target = frontend_dir / f.name
            target.write_bytes(f.read_bytes())
        print(f"Synced artifacts to frontend directory: {frontend_dir}")

    # Return summary dict
    result = {
        "zone": zone,
        "date": dt_str,
        "scene_id": item.id,
        "artifacts_dir": str(out_dir),
        "files": ["ndvi.png", "bounds.json", "stats.json", "provenance.json", "metadata.json"],
        "stats": stats,
        "sample_pixels": {
            "red_sample": red_dn[:5, :5].tolist(),
            "nir_sample": nir_dn[:5, :5].tolist(),
            "scl_sample": scl[:5, :5].tolist(),
            "ndvi_sample": np.where(np.isnan(ndvi[:5, :5]), None, ndvi[:5, :5]).tolist(),
        },
    }
    return result


def main():
    parser = argparse.ArgumentParser(description="AquaPulse STAC NDVI Pipeline")
    parser.add_argument("--zone", default=DEFAULT_ZONE, help="Zone identifier (default: Zone-A)")
    parser.add_argument("--date-range", default=DEFAULT_DATE_RANGE, help="Search date range (default: 2026-01-01/2026-05-31)")
    args = parser.parse_args()

    run_pipeline(zone=args.zone, date_range=args.date_range)


if __name__ == "__main__":
    main()
