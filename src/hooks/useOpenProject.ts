import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openProjectAt } from "../core/openProjectAt";
import { runWithError } from "../lib/runWithError";

export function useOpenProject() {
  async function openProject() {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "选择或创建 Anvil 项目文件夹",
    });
    if (!selected || Array.isArray(selected)) return;

    await runWithError(() => openProjectAt(selected), "打开失败");
  }

  return openProject;
}
