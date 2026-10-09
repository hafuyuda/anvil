import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "../core/ipc";
import { openProjectAt } from "../core/openProjectAt";
import { toast } from "../lib/toast";
import { runWithError } from "../lib/runWithError";

export function useImportPack() {
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

    const r = await runWithError(() => ipc.importPack(src, dest), "导入失败");
    if (!r.ok) return;

    const openResult = await runWithError(
      () => openProjectAt(dest),
      "打开导入的项目失败",
    );
    if (!openResult.ok) return;
    toast.success("导入成功");
  }

  return importPack;
}
