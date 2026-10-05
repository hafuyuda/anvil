import { useEffect, useRef } from "react";
import { commandRegistry } from "../../lib/commands";
import { useProjectStore } from "../../stores/projectStore";
import { useOpenProject } from "../../core/useOpenProject";
import { useCreateProject } from "../../core/useCreateProject";
import { useExportPack } from "../../core/useExportPack";
import { useImportPack } from "../../core/useImportPack";
import { ipc } from "../../core/ipc";
import { useUIStore } from "../../stores/uiStore";

export function useGlobalCommands() {
  const openProjectHook = useOpenProject();
  const createProjectHook = useCreateProject();
  const exportPackHook = useExportPack();
  const importPackHook = useImportPack();

  const projectPath = useProjectStore((s) => s.projectPath);
  const cards = useProjectStore((s) => s.cards) ?? [];

  // 用 ref 稳定函数引用，effect 不依赖它们
  const handlers = useRef({
    openProject: openProjectHook,
    createProject: createProjectHook,
    exportPack: exportPackHook,
    importPack: importPackHook,
  });
  handlers.current.openProject = openProjectHook;
  handlers.current.createProject = createProjectHook;
  handlers.current.exportPack = exportPackHook;
  handlers.current.importPack = importPackHook;

  // 卡牌指纹：id + name，只有在增删改名时才变
  const cardsFingerprint = cards.map((c) => `${c.id}:${c.name}`).join("|");

  useEffect(() => {
    const disposers: (() => void)[] = [];

    function reg(cmd: Parameters<typeof commandRegistry.register>[0]) {
      disposers.push(commandRegistry.register(cmd));
    }

    // 所有 store 操作走 getState，避免解构出函数引用
    const store = () => useProjectStore.getState();

    // ── 导航 ──
    reg({
      id: "nav.world.cards",
      label: "世界观 · 卡片",
      category: "导航",
      keywords: ["world", "card", "卡片"],
      shortcut: "Ctrl+1",
      run: () => {
        store().setActiveModule("world");
        store().setWorldSubView("cards");
      },
    });
    reg({
      id: "nav.world.graph",
      label: "世界观 · 图谱",
      category: "导航",
      keywords: ["world", "graph", "图谱"],
      run: () => {
        store().setActiveModule("world");
        store().setWorldSubView("graph");
      },
    });
    reg({
      id: "nav.story",
      label: "分支故事",
      category: "导航",
      keywords: ["story", "scenario", "剧情"],
      shortcut: "Ctrl+2",
      run: () => store().setActiveModule("story"),
    });
    reg({
      id: "nav.board",
      label: "棋盘",
      category: "导航",
      keywords: ["board", "棋盘"],
      shortcut: "Ctrl+3",
      run: () => store().setActiveModule("board"),
    });
    reg({
      id: "nav.session",
      label: "跑团",
      category: "导航",
      keywords: ["session", "跑团"],
      shortcut: "Ctrl+4",
      run: () => store().setActiveModule("session"),
    });
    reg({
      id: "nav.types",
      label: "类型",
      category: "导航",
      keywords: ["type", "类型"],
      shortcut: "Ctrl+5",
      run: () => store().setActiveModule("types"),
    });

    // ── 项目操作（不依赖 projectPath）──
    reg({
      id: "project.open",
      label: "打开项目",
      category: "项目",
      keywords: ["open", "打开"],
      run: () => handlers.current.openProject(),
    });
    reg({
      id: "project.create",
      label: "新建项目",
      category: "项目",
      keywords: ["new", "create", "新建"],
      run: () => handlers.current.createProject(),
    });
    reg({
      id: "project.import",
      label: "导入资源包",
      category: "项目",
      keywords: ["import", "导入"],
      run: () => handlers.current.importPack(),
    });
    reg({
      id: "project.merge",
      label: "合并资源包",
      category: "项目",
      keywords: ["merge", "合并", "import"],
      run: () => useUIStore.getState().openMergePack(),
    });
    // ── 项目内操作 ──
    if (projectPath) {
      reg({
        id: "project.export",
        label: "导出资源包",
        category: "项目",
        keywords: ["export", "导出"],
        run: () => handlers.current.exportPack(),
      });
      reg({
        id: "project.refresh",
        label: "刷新项目",
        category: "项目",
        keywords: ["refresh", "刷新"],
        run: async () => {
          const snap = await ipc.reloadProject();
          useProjectStore.getState().refreshProject({
            cards: snap.cards,
            cardTypes: snap.card_types,
            relationKinds: snap.relation_kinds,
            relations: snap.relations,
            scenarios: snap.scenarios,
            boards: snap.boards,
            sessions: snap.sessions,
          });
        },
      });
      reg({
        id: "project.close",
        label: "关闭项目",
        category: "项目",
        keywords: ["close", "关闭"],
        run: async () => {
          try {
            await ipc.closeProject();
          } catch {
            // 忽略
          }
          useProjectStore.getState().closeProject();
          const { resetTheme } = await import("../../lib/theme");
          resetTheme();
        },
      });

      reg({
        id: "edit.undo",
        label: "撤销",
        category: "编辑",
        keywords: ["undo"],
        shortcut: "Ctrl+Z",
        run: () => useProjectStore.getState().undo(),
      });
      reg({
        id: "edit.redo",
        label: "重做",
        category: "编辑",
        keywords: ["redo"],
        shortcut: "Ctrl+Shift+Z",
        run: () => useProjectStore.getState().redo(),
      });

      // 快速打开卡牌
      for (const c of cards) {
        reg({
          id: `open.card.${c.id}`,
          label: c.name,
          category: "打开卡牌",
          keywords: [c.name],
          run: () => {
            const s = useProjectStore.getState();
            s.setActiveModule("world");
            s.setWorldSubView("cards");
            s.selectCard(c.id);
          },
        });
      }
    }

    return () => {
      for (const d of disposers) d();
    };
    // 依赖只有两个稳定值：projectPath 和 cards 指纹
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath, cardsFingerprint]);
}
