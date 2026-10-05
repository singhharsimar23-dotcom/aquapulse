import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';
import { ComputedFarmer } from '../lib/snapshotLoader';
import { theisConeRadius, checkInterference } from '@aquapulse/core';
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

function createGeoJSONCircle(center: [number, number], radiusMeters: number, points = 32) {
  const [lng, lat] = center;
  const coords: [number, number][] = [];
  const km = Math.max(1, radiusMeters) / 1000;
  const distanceX = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  return {
    type: 'Polygon' as const,
    coordinates: [coords],
  };
}

function createGeoJSONSquare(center: [number, number], sizeMeters: number) {
  const [lng, lat] = center;
  const km = sizeMeters / 1000;
  const dx = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const dy = km / 110.574;
  return {
    type: 'Polygon' as const,
    coordinates: [
      [
        [lng - dx, lat - dy],
        [lng + dx, lat - dy],
        [lng + dx, lat + dy],
        [lng - dx, lat + dy],
        [lng - dx, lat - dy],
      ],
    ],
  };
}

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
    assumptions,
    lite,
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
        setTileHealthWarning('Tile health notice: operating in offline or cached fallback mode');
      }
    }
    checkHealth();
  }, []);

  // Sync Layers 2–6 to MapLibre Map
  const syncLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // --- Layer 3: Cones of Depression (Theis Bisection §6.6) ---
    const coneFeatures = farmers.map((f) => {
      const radius = theisConeRadius(
        f.Q * f.U,
        assumptions.T_m2d ?? 45.0,
        assumptions.S_storativity ?? 0.005,
        7,
        assumptions.s_thresh ?? 0.1
      );
      return {
        type: 'Feature' as const,
        geometry: createGeoJSONCircle(f.coords, radius, lite ? 16 : 32),
        properties: {
          id: f.id,
          radius,
          isSelected: selectedFarmerId === f.id,
        },
      };
    });

    const conesData: maplibregl.GeoJSONSourceSpecification['data'] = {
      type: 'FeatureCollection',
      features: coneFeatures,
    };

    const conesSource = map.getSource('cones-source') as maplibregl.GeoJSONSource | undefined;
    if (conesSource) {
      conesSource.setData(conesData);
    } else {
      map.addSource('cones-source', {
        type: 'geojson',
        data: conesData,
      });
      map.addLayer({
        id: 'cones-layer',
        type: 'fill',
        source: 'cones-source',
        paint: {
          'fill-color': '#00E5FF',
          'fill-opacity': ['case', ['boolean', ['get', 'isSelected'], false], 0.45, 0.22],
          'fill-outline-color': '#00E5FF',
        },
      });
    }

    if (map.getLayer('cones-layer')) {
      map.setLayoutProperty('cones-layer', 'visibility', layerVisibility.cones ? 'visible' : 'none');
    }

    // --- Layer 5: Mutual Interference Arcs (§6.6) ---
    const wellObservations = farmers.map((f) => ({
      x: f.coords[0] * 111000 * Math.cos((f.coords[1] * Math.PI) / 180),
      y: f.coords[1] * 110574,
      Q_m3d: f.Q * f.U,
    }));

    const pairs = checkInterference(
      wellObservations,
      assumptions.T_m2d ?? 45.0,
      assumptions.S_storativity ?? 0.005,
      7,
      assumptions.s_thresh ?? 0.1
    );

    const interferenceFeatures = pairs
      .filter((p) => p.interferes)
      .map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [farmers[p.i].coords, farmers[p.j].coords],
        },
        properties: {
          wellA: farmers[p.i].id,
          wellB: farmers[p.j].id,
          distance_m: p.distance_m,
        },
      }));

    const interferenceData: maplibregl.GeoJSONSourceSpecification['data'] = {
      type: 'FeatureCollection',
      features: interferenceFeatures,
    };

    const interSource = map.getSource('interference-source') as maplibregl.GeoJSONSource | undefined;
    if (interSource) {
      interSource.setData(interferenceData);
    } else {
      map.addSource('interference-source', {
        type: 'geojson',
        data: interferenceData,
      });
      map.addLayer({
        id: 'interference-layer',
        type: 'line',
        source: 'interference-source',
        paint: {
          'line-color': '#FF7B72',
          'line-width': 2.5,
          'line-dasharray': [2, 2],
        },
      });
    }

    if (map.getLayer('interference-layer')) {
      map.setLayoutProperty(
        'interference-layer',
        'visibility',
        layerVisibility.interference ? 'visible' : 'none'
      );
    }

    // --- Layer 6: Fill-Extrusion 3D Pumping Columns (§8.5) ---
    const columnFeatures = farmers.map((f) => ({
      type: 'Feature' as const,
      geometry: createGeoJSONSquare(f.coords, 25),
      properties: {
        id: f.id,
        height: f.U * 25,
        color: f.flags.includes('REVIEW') ? '#FFB547' : '#00E5FF',
      },
    }));

    const columnsData: maplibregl.GeoJSONSourceSpecification['data'] = {
      type: 'FeatureCollection',
      features: columnFeatures,
    };

    const colSource = map.getSource('columns-source') as maplibregl.GeoJSONSource | undefined;
    if (colSource) {
      colSource.setData(columnsData);
    } else {
      map.addSource('columns-source', {
        type: 'geojson',
        data: columnsData,
      });
      map.addLayer({
        id: 'columns-layer',
        type: 'fill-extrusion',
        source: 'columns-source',
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.8,
        },
      });
    }

    if (map.getLayer('columns-layer')) {
      map.setLayoutProperty(
        'columns-layer',
        'visibility',
        layerVisibility.columns ? 'visible' : 'none'
      );
    }
  }, [farmers, assumptions, layerVisibility, selectedFarmerId, lite]);

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
      zoom: 12.5,
      pitch: 35,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    if (
      typeof (maplibregl as unknown as { GlobeControl: new () => maplibregl.IControl })
        .GlobeControl === 'function'
    ) {
      const GlobeCtrl = (
        maplibregl as unknown as { GlobeControl: new () => maplibregl.IControl }
      ).GlobeControl;
      map.addControl(new GlobeCtrl(), 'top-right');
    }

    map.on('load', () => {
      try {
        if (
          typeof (map as unknown as { setProjection: (p: { type: string }) => void })
            .setProjection === 'function'
        ) {
          (map as unknown as { setProjection: (p: { type: string }) => void }).setProjection({
            type: 'globe',
          });
        }
      } catch {
        // mercator fallback
      }
      syncLayers();
    });

    map.on('style.load', () => {
      syncLayers();
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

  // Sync layers when dependencies change
  useEffect(() => {
    syncLayers();
  }, [syncLayers]);

  // Render Well / Farmer markers (Layer 4)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!layerVisibility.wells) return;

    farmers.forEach((f) => {
      const isSelected = selectedFarmerId === f.id;
      const hasReview = f.flags.includes('REVIEW');

      const el = document.createElement('div');
      el.className = `map-well-marker ${isSelected ? 'marker-selected' : ''} ${
        hasReview ? 'marker-pulse-review' : ''
      }`;
      el.innerHTML = `
        <div class="marker-pin" style="border-color: ${hasReview ? '#FFB547' : '#3DDC97'}">
          <span class="marker-id" data-prov-exempt="id">${f.id}</span>
        </div>
      `;
      el.addEventListener('click', () => {
        setSelectedFarmerId(isSelected ? null : f.id);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(f.coords)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [farmers, selectedFarmerId, setSelectedFarmerId, layerVisibility.wells]);

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
