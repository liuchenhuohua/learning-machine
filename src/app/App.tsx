import { useEffect } from "react";
import { Launcher } from "../features/projects/Launcher";
import { CreateProject } from "../features/projects/CreateProject";
import { WorkspaceShell } from "../components/layout/WorkspaceShell";
import { useAppStore } from "../stores/appStore";

export function App() {
  const { project, view, theme } = useAppStore();

  useEffect(() => {
    const followsDarkSystem = theme === "system" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = theme === "dark" || followsDarkSystem;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [theme]);

  if (!project && view === "create-project") return <CreateProject />;
  if (!project) return <Launcher />;
  return <WorkspaceShell />;
}
