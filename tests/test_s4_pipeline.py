#!/usr/bin/env python3
"""tests/test_s4_pipeline.py
Unit and integration tests for Session S4 Real-Data Pipeline conforming to:
- AQUAPULSE_V9_2_LEAN.md §6.3
- AQUAPULSE_V9_2_LEAN.md §7
- AQUAPULSE_V9_2_LEAN.md §10 S4 Acceptance criteria
"""

import json
from pathlib import Path
import numpy as np
import pytest

from pipelines.stac_ndvi import compute_ndvi_and_stats

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "public" / "data"


def test_artifact_files_exist():
    """Acceptance criterion: S4 artifact dir has ndvi.png + 4 JSON files."""
    zone_dir = DATA_DIR / "Zone-A"
    assert zone_dir.exists(), f"Zone directory {zone_dir} does not exist"

    date_dirs = [d for d in zone_dir.iterdir() if d.is_dir()]
    assert len(date_dirs) >= 1, f"Expected at least one date directory under {zone_dir}"

    scene_dir = date_dirs[0]
    expected_files = ["ndvi.png", "bounds.json", "stats.json", "provenance.json", "metadata.json"]
    for filename in expected_files:
        p = scene_dir / filename
        assert p.exists(), f"Missing required S4 artifact: {p}"
        assert p.stat().st_size > 0, f"Artifact file {p} is empty"


def test_bounds_json_structure():
    """Verify bounds.json format for MapLibre image source."""
    zone_dir = DATA_DIR / "Zone-A"
    scene_dir = next(d for d in zone_dir.iterdir() if d.is_dir())
    bounds = json.loads((scene_dir / "bounds.json").read_text(encoding="utf-8"))

    assert "coordinates" in bounds, "bounds.json missing 'coordinates'"
    coords = bounds["coordinates"]
    assert len(coords) == 4, f"Expected 4 corners for MapLibre image source, got {len(coords)}"
    for corner in coords:
        assert len(corner) == 2, f"Each corner must be [lon, lat], got {corner}"
        lon, lat = corner
        assert 78.0 <= lon <= 79.5, f"Longitude out of expected range for Wardha: {lon}"
        assert 20.0 <= lat <= 21.5, f"Latitude out of expected range for Wardha: {lat}"


def test_stats_json_invariants():
    """Verify stats.json NDVI percentiles and valid fraction per §6.3."""
    zone_dir = DATA_DIR / "Zone-A"
    scene_dir = next(d for d in zone_dir.iterdir() if d.is_dir())
    stats = json.loads((scene_dir / "stats.json").read_text(encoding="utf-8"))

    assert "p5" in stats and "p95" in stats
    assert stats["p5"] < stats["p95"], f"p5 ({stats['p5']}) must be less than p95 ({stats['p95']})"
    assert -0.2 <= stats["p5"] <= 0.4, f"Unreasonable p5 NDVI value: {stats['p5']}"
    assert 0.2 <= stats["p95"] <= 1.0, f"Unreasonable p95 NDVI value: {stats['p95']}"
    assert stats["valid_fraction"] > 0.8, f"Expected high valid fraction in dry-season scene, got {stats['valid_fraction']}"
    assert stats["NDVI_soil"] == stats["p5"]
    assert stats["NDVI_full"] == stats["p95"]


def test_provenance_json_invariants():
    """Verify provenance.json fields per §A and §10 S4."""
    zone_dir = DATA_DIR / "Zone-A"
    scene_dir = next(d for d in zone_dir.iterdir() if d.is_dir())
    prov = json.loads((scene_dir / "provenance.json").read_text(encoding="utf-8"))

    required_fields = [
        "kind", "scene_id", "stac_item_url", "datetime",
        "cloud_cover_pct", "code_hash", "input_artifact_sha256", "source", "asOf"
    ]
    for field in required_fields:
        assert field in prov, f"provenance.json missing required field '{field}'"
        assert prov[field] is not None, f"provenance.json field '{field}' is None"

    assert prov["kind"] in ("LIVE", "REPLAY", "SYNTH"), f"Invalid provenance kind: {prov['kind']}"
    assert len(prov["code_hash"]) == 64, f"Invalid SHA-256 for code_hash: {prov['code_hash']}"
    assert len(prov["input_artifact_sha256"]) == 64, f"Invalid SHA-256 for input_artifact_sha256"


def test_independent_second_computation_matches_within_1e3():
    """Acceptance criterion: independent second computation on pixels matches within 1e-3."""
    scale = 0.0001
    offset = -0.1

    # Synthetic sample pixels mimicking Sentinel-2 DNs:
    # Bare soil: red_dn=2500, nir_dn=2800 -> red_refl=0.15, nir_refl=0.18 -> ndvi=0.0909
    # Crop canopy: red_dn=1400, nir_dn=4500 -> red_refl=0.04, nir_refl=0.35 -> ndvi=0.7949
    # Mixed: red_dn=2000, nir_dn=3500 -> red_refl=0.10, nir_refl=0.25 -> ndvi=0.4286
    red_sample = np.array([[2500, 1400], [2000, 1800]], dtype=np.uint16)
    nir_sample = np.array([[2800, 4500], [3500, 3000]], dtype=np.uint16)
    scl_sample = np.array([[5, 4], [4, 5]], dtype=np.uint8)  # all valid

    # Compute using pipeline function
    ndvi_pipeline, valid_mask, _ = compute_ndvi_and_stats(red_sample, nir_sample, scl_sample, scale, offset)

    # Independent second computation (verbatim scalar arithmetic)
    for r in range(2):
        for c in range(2):
            red_val = float(red_sample[r, c]) * scale + offset
            nir_val = float(nir_sample[r, c]) * scale + offset
            expected_ndvi = (nir_val - red_val) / (nir_val + red_val)
            actual_ndvi = float(ndvi_pipeline[r, c])
            diff = abs(actual_ndvi - expected_ndvi)
            assert diff < 1e-3, f"NDVI discrepancy {diff:.6f} at ({r}, {c}) exceeds 1e-3 threshold"


def test_every_artifact_dir_has_provenance():
    """Acceptance criterion: every artifact dir has provenance.json (make verify loop checks)."""
    import os
    checked_dirs = 0
    for root_str, dirs, files in os.walk(DATA_DIR):
        root = Path(root_str)
        # Only check directories that actually contain data files (not empty parent dirs)
        if any(f.endswith((".json", ".png", ".tif", ".csv")) for f in files):
            prov_file = root / "provenance.json"
            assert prov_file.exists(), f"Artifact directory {root} missing provenance.json"
            prov_data = json.loads(prov_file.read_text(encoding="utf-8"))
            assert "source" in prov_data, f"{prov_file} missing 'source'"
            checked_dirs += 1

    assert checked_dirs >= 2, f"Expected at least 2 artifact directories checked, got {checked_dirs}"


def test_weather_pipeline_output():
    """Verify Open-Meteo weather data output."""
    weather_file = DATA_DIR / "Zone-A" / "weather.json"
    if weather_file.exists():
        data = json.loads(weather_file.read_text(encoding="utf-8"))
        assert "attribution" in data
        assert "CC BY 4.0" in data["attribution"]
        assert "series" in data and len(data["series"]) > 0
