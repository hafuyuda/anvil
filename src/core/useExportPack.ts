import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "./ipc/ipc";
import { useProjectStore } from "../stores/projectStore";

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
      alert(`已导出到：${output}`);
    } catch (e) {
      alert("导出失败: " + e);
    }
  }

  return exportPack;
}
