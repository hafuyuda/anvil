import { ipc } from "./ipc";
import { useProjectStore } from "../stores/projectStore";
import { applyProjectTheme } from "./applyProjectTheme";
import {
  addRecentProject,
  removeRecentProject,
  setLastOpenPath,
} from "../lib/recentProjects";

export async function openProjectAt(path: string): Promise<void> {
  await ipc.openProject(path);

  const [
    cards,
    cardTypes,
    relationKinds,
    relations,
    scenarios,
    boards,
    sessions,
    cardGroups,
    manifest,
  ] = await Promise.all([
    ipc.listCards(),
    ipc.listCardTypes(),
    ipc.listRelationKinds(),
    ipc.listAllRelations(),
    ipc.listScenarios(),
    ipc.listBoards(),
    ipc.listSessions(),
    ipc.listCardGroups(),
    ipc.loadManifest(),
  ]);

  useProjectStore
    .getState()
    .setProject(
      path,
      cards,
      cardTypes,
      relationKinds,
      relations,
      scenarios,
      boards,
      sessions,
      cardGroups,
    );

  useProjectStore.getState().setManifest(manifest);

  addRecentProject(path);
  setLastOpenPath(path);

  await applyProjectTheme();
}

export async function tryAutoOpenLastProject(): Promise<boolean> {
  const last = localStorage.getItem("anvil.lastOpenPath");
  if (!last) return false;

  try {
    await openProjectAt(last);
    return true;
  } catch {
    removeRecentProject(last);
    setLastOpenPath(null);
    return false;
  }
}
