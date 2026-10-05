import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "./ipc/ipc";
import { useProjectStore } from "../stores/projectStore";
import { applyProjectTheme } from "./applyProjectTheme";

export function useCreateProject() {
  const setProject = useProjectStore((s) => s.setProject);

  async function createProject() {
    const dest = await openDialog({
      directory: true,
      multiple: false,
      title: "选择新项目的文件夹（必须是空文件夹，或新建一个）",
    });
    if (!dest || Array.isArray(dest)) return;

    try {
      const empty = await ipc.isDirectoryEmpty(dest);
      if (!empty) {
        const proceed = confirm(
          `目录「${dest}」不是空的。\n\n` +
            `· 点击「确定」将尝试新建，但可能因已有文件而失败\n` +
            `· 点击「取消」返回`,
        );
        if (!proceed) return;
      }
    } catch {
      // 目录不存在，没问题
    }

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
      await applyProjectTheme();
    } catch (e) {
      alert("打开新项目失败: " + e);
    }
  }

  return createProject;
}
