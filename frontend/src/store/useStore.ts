import { create } from 'zustand';

export interface LayerVisibility {
  basemap: 'liberty' | 'esri' | 'gibs' | 'dark';
  ndvi: boolean;
  cones: boolean;
  wells: boolean;
  interference: boolean;
  columns: boolean;
  gibsContext: boolean;
  feeder: boolean;
}

export interface Assumptions {
  lambda_max: number;
  review_mismatch: number;
  floor_m3: number;
  P_rated: number;
  Kc_min: number;
  Kc_max: number;
}

export interface SelectedObject {
  type: 'zone' | 'farmer' | 'well' | 'feeder' | 'signal' | 'receipt' | 'scene';
  id: string;
}

export interface AppState {
  selectedFarmerId: string | null;
  selectedWellId: string | null;
  selectedObject: SelectedObject | null;
  week: number;
  layerVisibility: LayerVisibility;
  assumptions: Assumptions;
  verifiedVsReports: boolean;
  lite: boolean;
  mapEngine: 'maplibre' | 'leaflet';
  isHonestyPanelOpen: boolean;
  isProveItOpen: boolean;

  // Actions
  setSelectedFarmerId: (id: string | null) => void;
  setSelectedWellId: (id: string | null) => void;
  setSelectedObject: (obj: SelectedObject | null) => void;
  setWeek: (week: number) => void;
  setBasemap: (basemap: LayerVisibility['basemap']) => void;
  toggleLayer: (layer: keyof Omit<LayerVisibility, 'basemap'>) => void;
  setAssumption: <K extends keyof Assumptions>(key: K, val: Assumptions[K]) => void;
  resetAssumptions: () => void;
  setVerifiedVsReports: (val: boolean) => void;
  setLite: (val: boolean) => void;
  setMapEngine: (engine: 'maplibre' | 'leaflet') => void;
  setHonestyPanelOpen: (open: boolean) => void;
  setProveItOpen: (open: boolean) => void;
}

const DEFAULT_ASSUMPTIONS: Assumptions = {
  lambda_max: 0.6,
  review_mismatch: 0.5,
  floor_m3: 0.0,
  P_rated: 5.0,
  Kc_min: 0.2,
  Kc_max: 1.15,
};

function getInitialQueryParam(param: string): string | null {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
  }
  return null;
}

export const useStore = create<AppState>((set) => ({
  selectedFarmerId: null,
  selectedWellId: null,
  selectedObject: null,
  week: 10,
  layerVisibility: {
    basemap: 'liberty',
    ndvi: true,
    cones: true,
    wells: true,
    interference: true,
    columns: true,
    gibsContext: false,
    feeder: false,
  },
  assumptions: { ...DEFAULT_ASSUMPTIONS },
  verifiedVsReports: false,
  lite: getInitialQueryParam('lite') === '1',
  mapEngine: getInitialQueryParam('map') === 'leaflet' ? 'leaflet' : 'maplibre',
  isHonestyPanelOpen: false,
  isProveItOpen: false,

  setSelectedFarmerId: (id) =>
    set({
      selectedFarmerId: id,
      selectedObject: id ? { type: 'farmer', id } : null,
    }),
  setSelectedWellId: (id) =>
    set({
      selectedWellId: id,
      selectedObject: id ? { type: 'well', id } : null,
    }),
  setSelectedObject: (obj) =>
    set({
      selectedObject: obj,
      selectedFarmerId: obj?.type === 'farmer' ? obj.id : null,
      selectedWellId: obj?.type === 'well' ? obj.id : null,
    }),
  setWeek: (week) => set({ week: Math.max(1, Math.min(52, week)) }),
  setBasemap: (basemap) =>
    set((state) => ({
      layerVisibility: { ...state.layerVisibility, basemap },
    })),
  toggleLayer: (layer) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: !state.layerVisibility[layer],
      },
    })),
  setAssumption: (key, val) =>
    set((state) => ({
      assumptions: { ...state.assumptions, [key]: val },
    })),
  resetAssumptions: () => set({ assumptions: { ...DEFAULT_ASSUMPTIONS } }),
  setVerifiedVsReports: (val) => set({ verifiedVsReports: val }),
  setLite: (val) => set({ lite: val }),
  setMapEngine: (engine) => set({ mapEngine: engine }),
  setHonestyPanelOpen: (open) => set({ isHonestyPanelOpen: open }),
  setProveItOpen: (open) => set({ isProveItOpen: open }),
}));
