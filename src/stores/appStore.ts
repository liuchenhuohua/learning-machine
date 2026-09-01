import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppView, LearningProject } from "../types/domain";

type ThemeMode = "light" | "dark" | "system";

type AppState = {
  view: AppView;
  project: LearningProject | null;
  theme: ThemeMode;
  selectedPath: string | null;
  recentProjects: LearningProject[];
  navigate: (view: AppView) => void;
  openProject: (project: LearningProject) => void;
  closeProject: () => void;
  setTheme: (theme: ThemeMode) => void;
  selectPath: (path: string | null) => void;
  reset: () => void;
};

const initialState = {
  view: "launcher" as const,
  project: null,
  theme: "system" as const,
  selectedPath: null,
  recentProjects: [] as LearningProject[]
};

export const useAppStore = create<AppState>()(persist((set) => ({
  ...initialState,
  navigate: (view) => set({ view }),
  openProject: (project) => set((state) => ({ project, view: "overview", selectedPath: null, recentProjects: [project, ...state.recentProjects.filter(item => item.path !== project.path)].slice(0, 8) })),
  closeProject: () => set({ project: null, view: "launcher", selectedPath: null }),
  setTheme: (theme) => set({ theme }),
  selectPath: (selectedPath) => set({ selectedPath }),
  reset: () => set(initialState)
}), { name: "learning-machine-preferences", partialize: (state) => ({ theme: state.theme, recentProjects: state.recentProjects }) }));
