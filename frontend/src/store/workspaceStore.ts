import { create } from 'zustand';

interface WorkspaceState {
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspaceId: null,
  setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),
}));
