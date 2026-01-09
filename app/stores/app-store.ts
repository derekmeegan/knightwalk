import { create } from "zustand";

interface Position {
  fen: string;
}

interface AppState {
  // Mode
  mode: "explore" | "analyze";
  setMode: (mode: "explore" | "analyze") => void;

  // Current position (shared between modes)
  currentPosition: Position | null;
  setCurrentPosition: (position: Position | null) => void;

  // Explore mode state - Agent 3 will expand
  visibilityDepth: number;
  setVisibilityDepth: (depth: number) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // Analyze mode state - Agent 4 will expand
  engineEnabled: boolean;
  setEngineEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: "explore",
  setMode: (mode) => set({ mode }),

  currentPosition: null,
  setCurrentPosition: (currentPosition) => set({ currentPosition }),

  visibilityDepth: 10,
  setVisibilityDepth: (visibilityDepth) => set({ visibilityDepth }),
  selectedNodeId: null,
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),

  engineEnabled: true,
  setEngineEnabled: (engineEnabled) => set({ engineEnabled }),
}));
