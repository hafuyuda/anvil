import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "../core/ipc";
import { openProjectAt } from "../core/openProjectAt";
import { confirmDialog } from "../lib/confirm";
import { runWithError } from "../lib/runWithError";
import { toast } from "../lib/toast";

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

    const opened = await runWithError(
      () => openProjectAt(dest),
      "打开新项目失败",
    );
    if (!opened.ok) return;

    // 新增：新建后询问是否加入示例内容
    const wantsExample = await confirmDialog({
      title: "添加示例内容？",
      message:
        "是否在新项目里添加「铁砧堡」示例世界？\n\n" +
        "包含 6 个卡类型、30 张卡、5 个关系类型、剧情「失踪的学徒」、\n" +
        "2 个棋盘和 1 个跑团会话。你随时可以通过「项目 → 添加预设…」再次添加。",
      confirmLabel: "添加",
      cancelLabel: "跳过",
    });
    if (!wantsExample) return;

    const added = await runWithError(
      () => ipc.addPreset("anvil_castle"),
      "添加示例世界失败",
    );
    if (added.ok) {
      toast.success("已添加铁砧堡示例世界");
    }
  }

  return createProject;
}
