import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "../core/ipc";
import { useProjectStore } from "../stores/projectStore";
import { toast } from "../lib/toast";

export function useExportPack() {
  const projectPath = useProjectStore((s) => s.projectPath);

  async function exportPack() {
    if (!projectPath) return;

    const defaultName =
      projectPath
        .split(/[\\/]/)
        .pop()
        ?.replace(/\.anvil$/, "") ?? "world";

    const output = await saveDialog({
      defaultPath: `${defaultName}.anvilpack`,
      filters: [
        { name: "Anvil Pack", extensions: ["anvilpack"] },
        { name: "Zip", extensions: ["zip"] },
      ],
      title: "导出资源包",
    });

    if (!output) return;

    try {
      await ipc.exportPack(output);
      toast.error(`已导出到：${output}`);
    } catch (e) {
      toast.error("导出失败: " + e);
    }
  }

  return exportPack;
}
