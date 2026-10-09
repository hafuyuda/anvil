import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "../core/ipc";
import { openProjectAt } from "../core/openProjectAt";
import { toast } from "../lib/toast";

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

    try {
      await ipc.importPack(src, dest);
    } catch (e) {
      toast.error("导入失败: " + e);
      return;
    }

    try {
      await openProjectAt(dest);
        toast.success("导入成功");
    } catch (e) {
      toast.error("打开导入的项目失败: " + e);
    }
  }

  return importPack;
}
