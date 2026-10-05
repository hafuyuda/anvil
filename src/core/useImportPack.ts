import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "./ipc/ipc";
import { useProjectStore } from "../stores/projectStore";
import { applyProjectTheme } from "./applyProjectTheme";

export function useImportPack() {
  const setProject = useProjectStore((s) => s.setProject);

  async function importPack() {
    const src = await openDialog({
      multiple: false,
      filters: [{ name: "Anvil Pack", extensions: ["anvilpack", "zip"] }],
      title: "选择资源包",
    });
    if (!src || Array.isArray(src)) return;

    const dest = await openDialog({
      directory: true,
      multiple: false,
      title: "选择目标文件夹（将写入项目内容）",
    });
    if (!dest || Array.isArray(dest)) return;

    try {
      await ipc.importPack(src, dest);
    } catch (e) {
      alert("导入失败: " + e);
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
      alert("导入成功");
    } catch (e) {
      alert("打开导入的项目失败: " + e);
    }
  }

  return importPack;
}
