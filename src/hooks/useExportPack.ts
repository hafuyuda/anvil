import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "../core/ipc";
import { useProjectStore } from "../stores/projectStore";
import { toast } from "../lib/toast";
import { runWithError } from "../lib/runWithError";

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

    const r = await runWithError(() => ipc.exportPack(output), "导出失败");
    if (!r.ok) return;
    toast.success(`已导出到：${output}`);
  }

  return exportPack;
}
