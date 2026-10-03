import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "./ipc";
import { useProjectStore } from "../stores/projectStore";

export function useOpenProject() {
  const setProject = useProjectStore((s) => s.setProject);

  async function openProject() {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "选择或创建 Anvil 项目文件夹",
    });
    if (!selected || Array.isArray(selected)) return;

    try {
      await ipc.openProject(selected);
      const [cards, cardTypes] = await Promise.all([
        ipc.listCards(),
        ipc.listCardTypes(),
      ]);
      setProject(selected, cards, cardTypes);
    } catch (e) {
      alert("打开失败: " + e);
    }
  }

  return openProject;
}