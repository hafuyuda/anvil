import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "./ipc";
import { useProjectStore } from "../stores/projectStore";

export function useCreateProject() {
  const setProject = useProjectStore((s) => s.setProject);

  async function createProject() {
    const dest = await openDialog({
      directory: true,
      multiple: false,
      title: "选择新项目的文件夹（空文件夹或不存在均可）",
    });
    if (!dest || Array.isArray(dest)) return;

    const name = dest.split(/[\\/]/).pop() ?? "新项目";

    try {
      await ipc.createProject(dest, name);
    } catch (e) {
      alert("创建失败: " + e);
      return;
    }

    try {
      await ipc.openProject(dest);
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
      setProject(
        dest,
        cards,
        cardTypes,
        relationKinds,
        relations,
        scenarios,
        boards,
        sessions,
      );
    } catch (e) {
      alert("打开新项目失败: " + e);
    }
  }

  return createProject;
}
