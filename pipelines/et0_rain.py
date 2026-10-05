#!/usr/bin/env python3
"""pipelines/et0_rain.py
Fetches daily ET0 evapotranspiration and precipitation from Open-Meteo API conforming to:
- AQUAPULSE_V9_2_LEAN.md §B (Open-Meteo CC BY 4.0, terms & vars)
- AQUAPULSE_V9_2_LEAN.md §7 (Data layer, Open-Meteo ET0+rain, 30-day cache)
- AQUAPULSE_V9_2_LEAN.md §10 S4 (Real-data pipeline, ET0 + precipitation)
"""

import argparse
import datetime
import hashlib
import json
import urllib.request
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = Path(__file__).resolve().parent.parent

# Default centroid for Zone-A Wardha Maharashtra
DEFAULT_LAT = 20.7453
DEFAULT_LON = 78.6022
DEFAULT_ZONE = "Zone-A"


def fetch_open_meteo(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON) -> Dict[str, Any]:
    """Fetches daily ET0 and precipitation from Open-Meteo."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"daily=et0_fao_evapotranspiration,precipitation_sum&"
        f"timezone=auto&past_days=30&forecast_days=7"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "AquaPulse-ET0/1.0 (info@aquapulse.internal)"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw_bytes = resp.read()
        sha = hashlib.sha256(raw_bytes).hexdigest()
        data = json.loads(raw_bytes.decode("utf-8"))

    daily = data.get("daily", {})
    times = daily.get("time", [])
    et0 = daily.get("et0_fao_evapotranspiration", [])
    precip = daily.get("precipitation_sum", [])

    series = []
    for d, e, p in zip(times, et0, precip):
        series.append({
            "date": d,
            "et0_mm": e,
            "precip_mm": p,
        })

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    result = {
        "zone": DEFAULT_ZONE,
        "centroid": {"latitude": lat, "longitude": lon},
        "attribution": "Weather data by Open-Meteo.com, licensed under Creative Commons Attribution 4.0 International (CC BY 4.0)",
        "license_url": "https://creativecommons.org/licenses/by/4.0/",
        "source_url": url,
        "fetchedAt": now_iso,
        "sha256": sha,
        "provenance": {
            "kind": "LIVE",
            "source": "Open-Meteo",
            "asOf": now_iso,
            "hash": sha,
        },
        "elevation": data.get("elevation"),
        "timezone": data.get("timezone"),
        "series": series,
    }
    return result


def run_weather_pipeline(
    zone: str = DEFAULT_ZONE,
    lat: float = DEFAULT_LAT,
    lon: float = DEFAULT_LON,
) -> Path:
    out_dir = REPO_ROOT / "public" / "data" / zone
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "weather.json"

    prov_file = out_dir / "provenance.json"

    data = fetch_open_meteo(lat, lon)
    out_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Saved weather data to {out_file}")

    # Also write a zone-level provenance.json if not present
    if not prov_file.exists():
        zone_prov = {
            "kind": "LIVE",
            "source": "Open-Meteo API",
            "asOf": data["fetchedAt"],
            "hash": data["sha256"],
            "attribution": data["attribution"],
        }
        prov_file.write_text(json.dumps(zone_prov, indent=2), encoding="utf-8")

    # Sync to frontend/public/data/{zone}
    frontend_dir = REPO_ROOT / "frontend" / "public" / "data" / zone
    if (REPO_ROOT / "frontend").exists():
        frontend_dir.mkdir(parents=True, exist_ok=True)
        (frontend_dir / "weather.json").write_bytes(out_file.read_bytes())
        if prov_file.exists():
            (frontend_dir / "provenance.json").write_bytes(prov_file.read_bytes())

    return out_file


def main():
    parser = argparse.ArgumentParser(description="AquaPulse Open-Meteo Weather Pipeline")
    parser.add_argument("--zone", default=DEFAULT_ZONE)
    parser.add_argument("--lat", type=float, default=DEFAULT_LAT)
    parser.add_argument("--lon", type=float, default=DEFAULT_LON)
    args = parser.parse_args()

    run_weather_pipeline(args.zone, args.lat, args.lon)


if __name__ == "__main__":
    main()
