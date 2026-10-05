import { create } from 'zustand';
import { CsvFarmerRow } from '@aquapulse/core';

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
  T_m2d?: number;
  S_storativity?: number;
  s_thresh?: number;
}

export interface WidgetLayout {
  id: string;
  title: string;
  formulaRef?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pinned: boolean;
  collapsed: boolean;
  visible: boolean;
}

export interface SelectedObject {
  type: 'zone' | 'farmer' | 'well' | 'feeder' | 'signal' | 'receipt' | 'scene';
  id: string;
}

export interface FarmerOverride {
  R?: number | null;
  E?: number | null;
  land?: number;
  Q?: number;
}

export interface AppState {
  selectedFarmerId: string | null;
  selectedWellId: string | null;
  selectedObject: SelectedObject | null;
  week: number;
  layerVisibility: LayerVisibility;
  assumptions: Assumptions;
  widgets: Record<string, WidgetLayout>;
  verifiedVsReports: boolean;
  lite: boolean;
  mapEngine: 'maplibre' | 'leaflet';
  isHonestyPanelOpen: boolean;
  isProveItOpen: boolean;
  isCommandBarOpen: boolean;
  proveItContext: Record<string, unknown> | null;

  // S8 State: Sandboxes, Drills, Committee, CSV, Stress
  farmerOverrides: Record<string, FarmerOverride>;
  committeeDecisions: Record<string, 'CONFIRMED' | 'DISMISSED'>;
  activePreset: string;
  poolOverride: number | null;
  uploadedCsvRows: CsvFarmerRow[] | null;
  uploadedCsvHash: string | null;
  stressViewMode: 'verified' | 'reports' | 'meter';
  isCsvModalOpen: boolean;
  isCommitteeModalOpen: boolean;
  committeeFarmerId: string | null;

  // Actions
  setSelectedFarmerId: (id: string | null) => void;
  setSelectedWellId: (id: string | null) => void;
  setSelectedObject: (obj: SelectedObject | null) => void;
  setWeek: (week: number) => void;
  setBasemap: (basemap: LayerVisibility['basemap']) => void;
  toggleLayer: (layer: keyof Omit<LayerVisibility, 'basemap'>) => void;
  setAssumption: <K extends keyof Assumptions>(key: K, val: Assumptions[K]) => void;
  resetAssumptions: () => void;
  updateWidgetLayout: (id: string, updates: Partial<WidgetLayout>) => void;
  toggleWidgetVisible: (id: string) => void;
  resetWidgetLayouts: () => void;
  setVerifiedVsReports: (val: boolean) => void;
  setLite: (val: boolean) => void;
  setMapEngine: (engine: 'maplibre' | 'leaflet') => void;
  setHonestyPanelOpen: (open: boolean) => void;
  setProveItOpen: (open: boolean) => void;
  setCommandBarOpen: (open: boolean) => void;
  openProveIt: (ctx?: Record<string, unknown> | null) => void;

  // S8 Actions
  setFarmerOverride: (farmerId: string, updates: Partial<FarmerOverride>) => void;
  resetFarmerOverrides: () => void;
  applyPreset: (presetName: string) => void;
  setPoolOverride: (pool: number | null) => void;
  setCommitteeDecision: (farmerId: string, decision: 'CONFIRMED' | 'DISMISSED') => void;
  resetCommitteeDecisions: () => void;
  setUploadedCsv: (rows: CsvFarmerRow[] | null, hash: string | null) => void;
  setStressViewMode: (mode: 'verified' | 'reports' | 'meter') => void;
  setCsvModalOpen: (open: boolean) => void;
  setCommitteeModalOpen: (open: boolean, farmerId?: string | null) => void;
}

const DEFAULT_ASSUMPTIONS: Assumptions = {
  lambda_max: 0.6,
  review_mismatch: 0.5,
  floor_m3: 0.0,
  P_rated: 5.0,
  Kc_min: 0.2,
  Kc_max: 1.15,
  T_m2d: 45.0,
  S_storativity: 0.005,
  s_thresh: 0.1,
};

const DEFAULT_WIDGETS: Record<string, WidgetLayout> = {
  w1: {
    id: 'w1',
    title: 'Worked Allocation Table',
    formulaRef: '§6.5',
    x: 40,
    y: 80,
    width: 820,
    height: 380,
    pinned: false,
    collapsed: false,
    visible: true,
  },
  w2: {
    id: 'w2',
    title: 'Signal Board',
    formulaRef: '§6.2',
    x: 40,
    y: 480,
    width: 480,
    height: 320,
    pinned: false,
    collapsed: false,
    visible: true,
  },
  w3: {
    id: 'w3',
    title: 'Zone Stress',
    formulaRef: '§6.4',
    x: 540,
    y: 480,
    width: 320,
    height: 320,
    pinned: false,
    collapsed: false,
    visible: true,
  },
  w4: {
    id: 'w4',
    title: 'Cap Provenance & Trajectories',
    formulaRef: '§6.4',
    x: 40,
    y: 820,
    width: 580,
    height: 420,
    pinned: false,
    collapsed: false,
    visible: true,
  },
  w5: {
    id: 'w5',
    title: 'Allocation Waterfall',
    formulaRef: '§6.5',
    x: 880,
    y: 80,
    width: 460,
    height: 380,
    pinned: false,
    collapsed: false,
    visible: true,
  },
  w6: {
    id: 'w6',
    title: 'Object Graph (Interference)',
    formulaRef: '§6.6',
    x: 880,
    y: 480,
    width: 460,
    height: 360,
    pinned: false,
    collapsed: false,
    visible: false,
  },
  w9: {
    id: 'w9',
    title: 'Merkle Inspector & Tamper Proof',
    formulaRef: '§6.8',
    x: 640,
    y: 820,
    width: 420,
    height: 420,
    pinned: false,
    collapsed: false,
    visible: true,
  },
  inspector: {
    id: 'inspector',
    title: 'Object Inspector',
    formulaRef: '§8.5',
    x: 1080,
    y: 820,
    width: 360,
    height: 420,
    pinned: false,
    collapsed: false,
    visible: true,
  },
};


const STORAGE_KEY = 'aquapulse_widgets_v1';

function loadSavedWidgets(): Record<string, WidgetLayout> {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_WIDGETS, ...parsed };
      }
    } catch {
      // ignore
    }
  }
  return { ...DEFAULT_WIDGETS };
}

function persistWidgets(widgets: Record<string, WidgetLayout>) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch {
      // ignore
    }
  }
}

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
  widgets: loadSavedWidgets(),
  verifiedVsReports: false,
  lite: getInitialQueryParam('lite') === '1',
  mapEngine: getInitialQueryParam('map') === 'leaflet' ? 'leaflet' : 'maplibre',
  isHonestyPanelOpen: false,
  isProveItOpen: false,
  isCommandBarOpen: false,
  proveItContext: null,

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
  updateWidgetLayout: (id, updates) =>
    set((state) => {
      const current = state.widgets[id];
      if (!current) return state;
      const nextWidgets = {
        ...state.widgets,
        [id]: { ...current, ...updates },
      };
      persistWidgets(nextWidgets);
      return { widgets: nextWidgets };
    }),
  toggleWidgetVisible: (id) =>
    set((state) => {
      const current = state.widgets[id];
      if (!current) return state;
      const nextWidgets = {
        ...state.widgets,
        [id]: { ...current, visible: !current.visible },
      };
      persistWidgets(nextWidgets);
      return { widgets: nextWidgets };
    }),
  // S8 State initial values
  farmerOverrides: {},
  committeeDecisions: {},
  activePreset: 'Zone-A benchmark',
  poolOverride: null,
  uploadedCsvRows: null,
  uploadedCsvHash: null,
  stressViewMode: 'verified',
  isCsvModalOpen: false,
  isCommitteeModalOpen: false,
  committeeFarmerId: null,

  resetWidgetLayouts: () => {
    persistWidgets(DEFAULT_WIDGETS);
    set({ widgets: { ...DEFAULT_WIDGETS } });
  },
  setVerifiedVsReports: (val) => set({ verifiedVsReports: val }),
  setLite: (val) => set({ lite: val }),
  setMapEngine: (engine) => set({ mapEngine: engine }),
  setHonestyPanelOpen: (open) => set({ isHonestyPanelOpen: open }),
  setProveItOpen: (open) => set({ isProveItOpen: open }),
  setCommandBarOpen: (open) => set({ isCommandBarOpen: open }),
  openProveIt: (ctx = null) => set({ isProveItOpen: true, proveItContext: ctx }),

  // S8 Actions
  setFarmerOverride: (farmerId, updates) =>
    set((state) => ({
      farmerOverrides: {
        ...state.farmerOverrides,
        [farmerId]: {
          ...(state.farmerOverrides[farmerId] || {}),
          ...updates,
        },
      },
    })),
  resetFarmerOverrides: () => set({ farmerOverrides: {} }),

  applyPreset: (presetName) => {
    switch (presetName) {
      case 'Zone-A benchmark':
        set({
          activePreset: 'Zone-A benchmark',
          farmerOverrides: {},
          poolOverride: 104,
          committeeDecisions: {},
          uploadedCsvRows: null,
          uploadedCsvHash: null,
        });
        break;
      case 'Incorrect data':
        set({
          activePreset: 'Incorrect data',
          farmerOverrides: { C: { R: 20, E: 50 } },
          poolOverride: 130,
          committeeDecisions: {},
        });
        break;
      case 'Severe stress':
        set({
          activePreset: 'Severe stress',
          farmerOverrides: {},
          poolOverride: 78,
          committeeDecisions: {},
        });
        break;
      case 'Different crops':
        set({
          activePreset: 'Different crops',
          farmerOverrides: {
            A: { R: 18, E: 18 },
            B: { R: 40, E: 38 },
            C: { R: 25, E: 25 },
            D: { R: 32, E: 32 },
          },
          poolOverride: 104,
        });
        break;
      case 'Dead meter':
        set({
          activePreset: 'Dead meter',
          farmerOverrides: { C: { R: 20, E: null } },
          poolOverride: 104,
          committeeDecisions: {},
        });
        break;
      case 'Load my CSV':
        set({
          activePreset: 'Load my CSV',
          isCsvModalOpen: true,
        });
        break;
      default:
        set({ activePreset: presetName });
    }
  },

  setPoolOverride: (pool) => set({ poolOverride: pool }),
  setCommitteeDecision: (farmerId, decision) =>
    set((state) => ({
      committeeDecisions: {
        ...state.committeeDecisions,
        [farmerId]: decision,
      },
    })),
  resetCommitteeDecisions: () => set({ committeeDecisions: {} }),
  setUploadedCsv: (rows, hash) =>
    set({
      uploadedCsvRows: rows,
      uploadedCsvHash: hash,
      farmerOverrides: {},
      committeeDecisions: {},
    }),
  setStressViewMode: (mode) => set({ stressViewMode: mode }),
  setCsvModalOpen: (open) => set({ isCsvModalOpen: open }),
  setCommitteeModalOpen: (open, farmerId = null) =>
    set({
      isCommitteeModalOpen: open,
      committeeFarmerId: farmerId ?? (open ? 'C' : null),
    }),
}));


