import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';
import { ComputedFarmer } from '../lib/snapshotLoader';
import { Exempt } from './Exempt';

interface MapShellProps {
  farmers: ComputedFarmer[];
}

const WARDHA_CENTER: [number, number] = [78.6022, 20.7453];

const STYLES = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  esri: {
    version: 8 as const,
    sources: {
      'esri-imagery': {
        type: 'raster' as const,
        tiles: [
          'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community',
      },
    },
    layers: [
      {
        id: 'esri-layer',
        type: 'raster' as const,
        source: 'esri-imagery',
      },
    ],
  },
  gibs: {
    version: 8 as const,
    sources: {
      'gibs-imagery': {
        type: 'raster' as const,
        tiles: [
          'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_CorrectedReflectance_TrueColor/default/2026-10-04/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
        ],
        tileSize: 256,
        attribution: 'NASA EOSDIS GIBS',
      },
    },
    layers: [
      {
        id: 'gibs-layer',
        type: 'raster' as const,
        source: 'gibs-imagery',
      },
    ],
  },
  dark: {
    version: 8 as const,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background' as const,
        paint: { 'background-color': '#07090D' },
      },
    ],
  },
};

export const MapShell: React.FC<MapShellProps> = ({ farmers }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const {
    layerVisibility,
    setBasemap,
    mapEngine,
    selectedFarmerId,
    setSelectedFarmerId,
  } = useStore();

  const [tileHealthWarning, setTileHealthWarning] = useState<string | null>(null);

  // Runtime tile health check (§8.7)
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(
          'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/0/0/0',
          { method: 'HEAD' }
        );
        if (!res.ok) {
          setTileHealthWarning('Provider changed (as of 2026-10-05): Esri imagery unavailable');
        }
      } catch {
        // Tile health warning
        setTileHealthWarning('Tile health notice: operating in offline or cached fallback mode');
      }
    }
    checkHealth();
  }, []);

  // Initialize MapLibre Map
  useEffect(() => {
    if (!mapContainer.current || mapEngine === 'leaflet') return;

    const initialStyle =
      layerVisibility.basemap === 'liberty'
        ? STYLES.liberty
        : STYLES[layerVisibility.basemap];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: initialStyle,
      center: WARDHA_CENTER,
      zoom: 12,
      pitch: 30,
    });

    mapRef.current = map;

    // Add navigation and globe controls
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    if (typeof (maplibregl as unknown as { GlobeControl: new () => maplibregl.IControl }).GlobeControl === 'function') {
      const GlobeCtrl = (maplibregl as unknown as { GlobeControl: new () => maplibregl.IControl }).GlobeControl;
      map.addControl(new GlobeCtrl(), 'top-right');
    }

    map.on('load', () => {
      // Set projection to globe per installed typings
      try {
        if (typeof (map as unknown as { setProjection: (p: { type: string }) => void }).setProjection === 'function') {
          (map as unknown as { setProjection: (p: { type: string }) => void }).setProjection({ type: 'globe' });
        }
      } catch {
        // mercator fallback
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [mapEngine]);

  // Update basemap style
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const newStyle =
      layerVisibility.basemap === 'liberty'
        ? STYLES.liberty
        : STYLES[layerVisibility.basemap];
    map.setStyle(newStyle);
  }, [layerVisibility.basemap]);

  // Render Well / Farmer markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    farmers.forEach((f) => {
      const el = document.createElement('div');
      el.className = `map-well-marker ${selectedFarmerId === f.id ? 'marker-selected' : ''}`;
      el.innerHTML = `
        <div class="marker-pin" style="border-color: ${f.flags.includes('REVIEW') ? '#FFB547' : '#3DDC97'}">
          <span class="marker-id" data-prov-exempt="id">${f.id}</span>
        </div>
      `;
      el.addEventListener('click', () => {
        setSelectedFarmerId(f.id);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(f.coords)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [farmers, selectedFarmerId, setSelectedFarmerId]);

  const flyToWardha = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: WARDHA_CENTER,
        zoom: 13,
        pitch: 45,
        essential: true,
      });
    }
  };

  if (mapEngine === 'leaflet') {
    return (
      <div className="map-shell leaflet-fallback">
        <div className="map-fallback-banner">
          <span>Leaflet Engine Fallback Mode (?map=leaflet active)</span>
          <button onClick={() => useStore.getState().setMapEngine('maplibre')}>
            Switch to MapLibre Globe
          </button>
        </div>
        <div className="leaflet-view-box">
          <p>Wardha Zone-A: Lat 20.7453° N, Lng 78.6022° E</p>
          <div className="leaflet-farmer-dots">
            {farmers.map((f) => (
              <div key={f.id} className="fallback-marker">
                Farmer {f.id} ({f.coords.join(', ')})
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-shell" role="region" aria-label="Interactive Aquifer Map">
      {tileHealthWarning && (
        <div className="tile-health-alert" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{tileHealthWarning}</span>
        </div>
      )}

      <div className="map-overlay-controls">
        <div className="basemap-switcher" role="group" aria-label="Basemap Style Selector">
          <button
            className={`style-btn ${layerVisibility.basemap === 'liberty' ? 'active' : ''}`}
            onClick={() => setBasemap('liberty')}
          >
            Liberty (OFM)
          </button>
          <button
            className={`style-btn ${layerVisibility.basemap === 'esri' ? 'active' : ''}`}
            onClick={() => setBasemap('esri')}
          >
            Esri Satellite
          </button>
          <button
            className={`style-btn ${layerVisibility.basemap === 'gibs' ? 'active' : ''}`}
            onClick={() => setBasemap('gibs')}
          >
            NASA GIBS
          </button>
          <button
            className={`style-btn ${layerVisibility.basemap === 'dark' ? 'active' : ''}`}
            onClick={() => setBasemap('dark')}
          >
            Dark Void
          </button>
        </div>

        <button className="fly-btn" onClick={flyToWardha} aria-label="Fly to Wardha Zone-A">
          📍 Fly to Wardha
        </button>
      </div>

      <div ref={mapContainer} className="map-container" />
    </div>
  );
};
