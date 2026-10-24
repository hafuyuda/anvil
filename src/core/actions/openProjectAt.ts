import { ipc } from "../ipc";
import { useProjectStore } from "../../stores/projectStore";
import { applyProjectTheme } from "./applyProjectTheme";
import { clearAssetCache } from "../../lib/assetCache";
import { clearDurationCache } from "../../lib/audioMetaCache";
import { bindPlayerToProject } from "../../lib/audioPlayer";
import {
  addRecentProject,
  removeRecentProject,
  setLastOpenPath,
} from "../../lib/recentProjects";

export async function openProjectAt(path: string): Promise<void> {
  await ipc.openProject(path);

  // 资源缓存与播放队列都以「项目内相对路径」为键，换项目必须整体作废，
  // 否则同名文件（assets/audio/x.mp3）会指向上一个项目的绝对路径。
  clearAssetCache();
  clearDurationCache();
  bindPlayerToProject(path);

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
