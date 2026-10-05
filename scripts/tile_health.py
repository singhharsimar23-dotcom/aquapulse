#!/usr/bin/env python3
"""scripts/tile_health.py
Tile health check per AQUAPULSE_V9_2_LEAN.md §8.7 and S6.
Fetches known tiles / styles, checks status and hashes, reports status.
"""

import hashlib
import json
import sys
import urllib.request

BASELINES = {
    "esri": {
        "url": "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/0/0/0",
        "sha256": "fbdcf5bf29c479e3f5f465c80f48c1552bf0efb6e0d25c01c7b0c5a97a0ced57",
        "name": "Esri World Imagery",
    },
    "openfreemap": {
        "url": "https://tiles.openfreemap.org/styles/liberty",
        "sha256": "6010998863b4876911ac9a2d62c9a28d97c8877f6d20cd158b74808572257b60",
        "name": "OpenFreeMap Liberty Style",
    },
}

def check_tile_health():
    results = {}
    all_ok = True
    for provider, config in BASELINES.items():
        req = urllib.request.Request(config["url"], headers={"User-Agent": "AquaPulse-TileHealth/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                h = hashlib.sha256(data).hexdigest()
                is_match = (h == config["sha256"])
                results[provider] = {
                    "ok": True,
                    "status": resp.status,
                    "sha256": h,
                    "matches_baseline": is_match,
                }
                if not is_match:
                    print(f"WARN: Provider {config['name']} hash changed (got {h[:16]}..., expected {config['sha256'][:16]}...)")
        except Exception as e:
            results[provider] = {"ok": False, "error": str(e)}
            all_ok = False
            print(f"ERR: Provider {config['name']} failed: {e}")

    return all_ok, results

if __name__ == "__main__":
    ok, res = check_tile_health()
    print(json.dumps(res, indent=2))
    if not ok:
        sys.exit(1)
    print("TILE HEALTH OK")
