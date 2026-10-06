# Anvil

> 铁砧。一个以卡牌为核心的世界观创作与跑团工具。

Anvil 把世界观搭建、分支故事、棋盘推演、跑团记录统一在同一份数据之上。世界观里的 NPC、剧情节点、棋盘上的角色，都是同一张卡。你不需要在多个软件之间来回搬运设定。

**一切内容实体皆卡牌。四大功能是同一份数据的不同视图。**

---

## 特性

- **卡牌核心** — 自定义卡牌类型与字段，从文本、数字到图片、引用、枚举，字段只增不减，旧数据永不丢失。
- **关系图谱** — 卡与卡之间的边是一等公民，独立于卡片字段。图谱视图用 d3-force 力导向布局，支持连线、过滤、搜索。
- **分支故事** — 场景卡 + 条件边 + 变量 + 效果。跑图时自动求值，条件满足才可通行。
- **棋盘推演** — HTML 层渲染，支持拖拽、缩放、旋转、背景图。Token 用同一套卡框渲染。
- **跑团对话** — 舞台 + 对话流 + 角色面板。消息写入 JSONL，可回放、可编辑、可删除。
- **TCG 卡牌渲染** — 游戏王风格卡框，ATK/DEF/HP/等级标签可自定义。
- **本地优先** — 项目是一个文件夹，文本真相源，可用 git 管理。SQLite 只是可删除、可重建的索引。
- **资源包** — 导出 / 导入 / 合并 `.anvilpack`，类型映射、只导类型、选择性导入。
- **项目级主题** — 所有颜色走 CSS 变量，可切换、可自定义、可导出。
- **命令面板** — `Ctrl+K` 打开，所有操作可搜可执行。
- **撤销 / 重做 / 自动保存** — 覆盖单卡编辑、删除、批量操作。

---

## 截图

> 截图占位 —— 欢迎 PR 补充。

```
docs/
├── screenshot-card-wall.png
├── screenshot-graph.png
├── screenshot-story.png
├── screenshot-board.png
└── screenshot-session.png
```

---

## 技术栈

| 层         | 选型                                                      |
| ---------- | --------------------------------------------------------- |
| 壳         | Tauri 2.x                                                 |
| 后端       | Rust                                                      |
| 持久化     | 文本文件（JSON / JSONL）+ SQLite 索引（rusqlite bundled） |
| 全文检索   | SQLite FTS5（trigram）                                    |
| 表达式求值 | evalexpr                                                  |
| 资源包     | zip + walkdir                                             |
| 前端       | React + TypeScript + Vite                                 |
| 状态       | Zustand                                                   |
| 节点图     | React Flow (@xyflow/react)                                |
| 拖拽排序   | @dnd-kit                                                  |
| 力导向布局 | d3-force                                                  |
| 包管理器   | pnpm                                                      |

---

## 快速开始

### 环境要求

- **Node.js** 20+
- **pnpm** 9+
- **Rust** stable（[rustup](https://rustup.rs)）
- **Tauri 2 系统依赖**
  - Windows：WebView2（Win11 自带）、MSVC 构建工具
  - macOS：`xcode-select --install`
  - Linux：`webkit2gtk-4.1`、`libappindicator3` 等，见 [Tauri 文档](https://v2.tauri.app/start/prerequisites/)

### 开发

```bash
git clone https://github.com/<your-username>/anvil.git
cd anvil
pnpm install
pnpm tauri dev
```

第一次运行会编译 Rust，比较慢。

### 构建

```bash
pnpm tauri build
```

产物在 `src-tauri/target/release/bundle/`。

---

## 项目结构

```text
anvil/
├── src-tauri/src/
│   ├── core/
│   │   ├── model/          # Card / CardType / Relation / Scenario / Board / Session
│   │   ├── store/          # 文本文件读写（按领域拆分）
│   │   ├── index/          # SQLite 索引 + FTS
│   │   ├── eval/           # 条件求值
│   │   └── ipc/            # Tauri 命令（按领域拆分）
│   └── lib.rs
├── src/
│   ├── core/ipc/           # 前端 IPC 类型与封装
│   ├── lib/                # 通用工具
│   ├── hooks/              # useDraft / useKeyboard / ...
│   ├── components/         # 通用组件（CardFrame / Toolbar / Modal / ...）
│   ├── shell/              # 五段布局（TopBar / LeftNav / Workspace / Inspector / StatusBar）
│   ├── features/
│   │   ├── cards/          # ★ 共享核心
│   │   ├── world/          # 图谱
│   │   ├── story/          # 剧情（节点图 + 运行）
│   │   ├── board/          # 棋盘
│   │   ├── session/        # 跑团
│   │   └── project/        # 项目设置 / 主题 / 合并
│   └── stores/             # Zustand（slice 模式）
└── package.json
```

---

## 项目文件格式

Anvil 项目是一个文件夹，**文本文件是唯一真相源**：

```text
MyWorld.anvil/
├── manifest.json               # 项目元数据
├── themes/<uuid>.json          # 项目主题
├── types/
│   ├── card_types.json
│   └── relation_kinds.json
├── cards/ab/<uuid>.json        # 一卡一文件
├── relations/from/<uuid>.jsonl # 一行一边
├── boards/<uuid>.json
├── scenarios/<uuid>.json
├── sessions/<uuid>/
│   ├── session.json
│   └── events.jsonl
├── assets/images/
└── .anvil/index.db             # 索引，不提交 git
```

`.gitignore` 只需忽略 `.anvil/`。

---

## 设计原则

1. **数据 > 视图。** 先想清楚数据模型，再想 UI。
2. **文本真相源 > 二进制锁定。** 项目可用 git 管理，SQLite 只是索引。
3. **边界清晰 > 功能快。** `features/cards/` 是共享核心，任何功能不得绕过它私建卡模型。
4. **格式稳定 > 内部优雅。** 资源包一旦发布，破坏性修改要有迁移路径。
5. **本地优先。** 不引入网络依赖就能完整工作。
6. **颜色走 CSS 变量。** 为主题系统留路。

完整设计文档见 [`docs/DESIGN.md`](docs/DESIGN.md)（如已添加）。

---

## 明确不做的事

开源项目最容易死于范围蔓延。以下明确排除：

- **不做多人联机。** 单人工具，不引入 CRDT 或服务端。
- **不做规则引擎。** 卡牌是纯信息载体，不解析「打出后造成 2 点伤害」这类逻辑。
- **不做 VTT 级别的自动化。** 骰子、测距、光照属于虚拟桌面，不是创作工具。
- **不做账号系统。** 本地文件，无云同步。
- **不做 Web 服务端。** 桌面应用，无后端。

---

## 贡献

欢迎 Issue 和 PR。

- **Bug 报告**：请附上操作系统、Anvil 版本、复现步骤。
- **功能请求**：先开 Issue 讨论，避免大改动返工。
- **代码贡献**：
  1. Fork 本仓库
  2. 创建分支 `feat/xxx` 或 `fix/xxx`
  3. 提交前跑 `pnpm tauri dev` 确认无报错
  4. PR 描述清楚「做了什么」和「为什么」

代码风格：命名清晰，注释写「为什么」而不是「是什么」。

---

## 协议

本项目采用 [MIT 协议](LICENSE)。

---

## 致谢

- [Tauri](https://tauri.app/)
- [React Flow](https://reactflow.dev/)
- [d3-force](https://github.com/d3/d3-force)
- [Zustand](https://github.com/pmndrs/zustand)
- [@dnd-kit](https://dndkit.com/)
- [evalexpr](https://github.com/ISibboI/evalexpr)

---

## 状态

**早期开发中。** 核心功能已可用，但 API 和数据格式仍可能变化。欢迎试用和反馈。
