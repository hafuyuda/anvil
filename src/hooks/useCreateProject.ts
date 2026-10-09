import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "../core/ipc";
import { openProjectAt } from "../core/openProjectAt";
import { confirmDialog } from "../lib/confirm";
import { runWithError } from "../lib/runWithError";

export function useCreateProject() {
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
        const proceed = await confirmDialog({
          title: "目录不为空",
          message:
            `目录「${dest}」不是空的。\n\n` +
            `· 点击「确定」将尝试新建，但可能因已有文件而失败\n` +
            `· 点击「取消」返回`,
          confirmLabel: "继续",
        });
        if (!proceed) return;
      }
    } catch {
      // 目录不存在，没问题
    }

    const name = dest.split(/[\\/]/).pop() ?? "新项目";

    const r = await runWithError(
      () => ipc.createProject(dest, name),
      "创建失败",
    );
    if (!r.ok) return;

    await runWithError(() => openProjectAt(dest), "打开新项目失败");
  }

  return createProject;
}
