import { ipc } from "./ipc";
import { useProjectStore } from "../stores/projectStore";
import { applyProjectTheme } from "./applyProjectTheme";
import {
  addRecentProject,
  removeRecentProject,
  setLastOpenPath,
} from "../lib/recentProjects";

/**
 * 按路径打开项目。
 * 成功返回 true，失败抛异常。
 */
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
  ] = await Promise.all([
    ipc.listCards(),
    ipc.listCardTypes(),
    ipc.listRelationKinds(),
    ipc.listAllRelations(),
    ipc.listScenarios(),
    ipc.listBoards(),
    ipc.listSessions(),
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
    );

  addRecentProject(path);
  setLastOpenPath(path);

  await applyProjectTheme();
}

/**
 * 尝试自动打开上次的项目。失败时静默清理记录。
 */
export async function tryAutoOpenLastProject(): Promise<boolean> {
  const last = localStorage.getItem("anvil.lastOpenPath");
  if (!last) return false;

  try {
    await openProjectAt(last);
    return true;
  } catch {
    // 路径不存在或项目损坏，清理
    removeRecentProject(last);
    setLastOpenPath(null);
    return false;
  }
}
