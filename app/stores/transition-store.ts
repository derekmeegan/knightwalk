"use client";

import { create } from "zustand";

interface TransitionState {
  isTransitioning: boolean;
  setTransitioning: (value: boolean) => void;
  // FEN to focus on when returning to Explore
  returnFen: string | null;
  setReturnFen: (fen: string | null) => void;
}

export const useTransitionStore = create<TransitionState>((set) => ({
  isTransitioning: false,
  setTransitioning: (value) => set({ isTransitioning: value }),
  returnFen: null,
  setReturnFen: (fen) => set({ returnFen: fen }),
}));
