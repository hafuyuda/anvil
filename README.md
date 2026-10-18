# Anvil

> 铁砧。一个以卡牌为核心的世界观创作与跑团工具。

Anvil 把世界观搭建、分支故事、棋盘推演、跑团记录统一在同一份数据之上。世界观里的 NPC、剧情里的角色、棋盘上的棋子，都是同一张卡。你不需要在多个软件之间来回搬运设定。

**一切内容实体皆卡牌。四大功能是同一份数据的不同视图。**

---

## 特性

- **卡牌核心** — 自定义卡牌类型与字段，从文本、数字到图片、引用、枚举，字段只增不减，旧数据永不丢失。支持类型复制。
- **关系系统** — 卡与卡之间的边是一等公民，独立于卡片字段。关系面板显示方向与反向名，鼠标悬停查看对方卡片预览。
- **分支故事** — weave 剧本语言：剧本按 knot（`===` 段落）组织，可拆多文件。跳转（`->`）、选项（`*`）、条件（`{}`）、变量（`VAR` / `~`）全部内联在剧本里。
- **视觉小说** — 三栏剧本编辑器（文件树 + knot 大纲 / 结构·源码双模式 / 检查器）、打字机对白、立绘表情、背景切换、结局标记、背景音乐和音效播放。一键全屏试玩，导出 Markdown 剧本和单文件 HTML 阅读器。
- **棋盘推演** — HTML 层渲染，支持拖拽、缩放、旋转、背景图、网格形状切换（方格 / 点阵 / 横线 / 竖线）、卡盒抽牌、翻牌、占位 Token、世界观关系线叠加。Token 用同一套卡框渲染。
- **跑团对话** — 舞台 + 对话流 + 角色面板。消息写入 JSONL，可回放、可编辑、可删除。会话内支持卡盒抽牌。
- **音乐播放** — 全局音频播放器，右下角迷你播放器常驻，跨模块、跨设置持续播放。独立「音乐」模块管理项目音频。
- **TCG 卡牌渲染** — 六种卡框风格（游戏王 / 通用 / 极简 / 万智牌 / 宝可梦 / 彩虹），ATK / DEF / HP / 等级标签可自定义。支持图像裁剪、闪卡（金箔 / 银箔 / 全息彩虹）、卡背、棋盘 Token 翻牌。
- **本地优先** — 项目是一个文件夹，文本真相源，可用 git 管理。SQLite 只是可删除、可重建的索引。
- **资源包** — 导出 / 导入 / 合并 `.anvilpack`，类型映射、只导类型、选择性导入。
- **项目级主题** — 所有颜色走 CSS 变量，可切换、可自定义、可导出。
- **统一设置面板** — 居中浮层，5 个分类（常规 / 外观 / 资源 / 编辑器 / 高级），带搜索框和键盘切换。
- **命令面板** — `Ctrl+K` 打开，所有操作可搜可执行。`Ctrl+M` 快速切到音乐模块。
- **无边框标题栏** — 窗口按钮与 Anvil 配色统一，支持 Windows 11 Snap Layout。
- **撤销 / 重做 / 自动保存** — 覆盖单卡编辑、删除、批量操作、卡盒抽牌。撤销 / 重做状态显示在底栏。

---

## 截图

![alt text](docs/screenshot-start-menu.png)

```text
docs/
├── screenshot-start-menu.png
├── screenshot-card-wall.png
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
| 资源包     | zip + walkdir                                             |
| 无边框窗口 | tauri-plugin-frame                                        |
| 文件对话框 | tauri-plugin-dialog                                       |
| 前端       | React + TypeScript + Vite                                 |
| 前端测试   | vitest                                                    |
| 状态       | Zustand                                                   |
| 拖拽排序   | @dnd-kit                                                  |
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
git clone https://github.com/hafuyuda/anvil.git
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

**Windows 提供两种格式**：

- `Anvil_x.y.z_x64-setup.exe` —— 推荐。无需管理员权限，双击安装
- `Anvil_x.y.z_x64_en-US.msi` —— 适合企业环境或需要静默安装

---

## 项目结构

```text
anvil/
├── src-tauri/
│   └── src/
│       ├── core/
│       │   ├── model/          # Card / CardType / Relation / Scenario / Board / Session / CardGroup
│       │   ├── store/          # 文本文件读写 + 索引 + 资源包 + 预设
│       │   ├── index/          # SQLite 索引 + FTS
│       │   └── ipc/            # Tauri 命令（按领域拆分）
│       └── lib.rs
├── src/
│   ├── core/               # IPC 类型与封装 + 项目级动作
│   │   ├── ipc/            # 前端 IPC 类型与 invoke 封装
│   │   ├── applyProjectTheme.ts
│   │   └── openProjectAt.ts
│   ├── lib/                # 通用工具（模块级单例 + 纯函数）
│   ├── hooks/              # 通用 hook（useDraft / useKeyboard / useAppSettings / ...）
│   ├── components/
│   │   ├── ui/             # 纯 UI 原子（Modal / Toggle / SectionLabel / EmptyState / Toolbar / SaveInput / LabeledBlock）
│   │   ├── card/           # 卡牌领域（CardFrame / CardGrid / HoverPreview / ScaledCardFrame）
│   │   ├── field/          # 字段编辑（FieldInput / ImageField / RefField / AudioSelect / TypeMultiSelect）
│   │   ├── overlay/        # 顶层浮层（ToastHost / ConfirmHost / CommandPalette / PickerDialog）
│   │   └── layout/         # 通用布局（EntityListLayout）
│   ├── shell/              # 五段布局
│   ├── themes/             # 内置主题定义
│   ├── features/
│   │   ├── cards/          # ★ 共享核心
│   │   │   ├── card/       # 单卡编辑 + 关系面板
│   │   │   ├── card-wall/  # 卡片墙（网格 / 列表 / 批量）
│   │   │   ├── card-type/  # 卡牌类型、字段、卡框配置
│   │   │   └── relation/   # 关系类型与关系表单
│   │   ├── card-groups/    # 卡组
│   │   │   └── views/      # 卡片 / 列表视图
│   │   ├── story/
│   │   │   ├── scenario/   # 剧情设计 + 导出
│   │   │   │   └── inspector/  # 检查器内容
│   │   │   ├── play/       # 两态机运行时 + 视觉小说舞台
│   │   │   └── script/     # weave 剧本语言（parser / serializer / eval / 测试）
│   │   ├── board/          # 棋盘
│   │   │   └── grid/       # 网格渲染与形状
│   │   ├── session/
│   │   │   ├── chat/       # 对话流、掷骰、消息编辑
│   │   │   └── ...         # 会话容器、角色面板、事件日志
│   │   ├── player/         # 音乐模块（PlayerView + PlayerInspector + MiniPlayer）
│   │   ├── project/        # 项目设置内容（主题 / 资源 / 统计）+ 资源包合并
│   │   │   └── theme/      # 主题编辑面板
│   │   ├── settings/       # 设置浮层（分类面板）
│   │   │   └── categories/ # 分类注册表与 impl
│   │   └── commands/       # 全局命令注册
│   └── stores/             # Zustand（slice 模式）
└── package.json
```

**卡牌渲染分层**：

```text
components/card/CardFrame/
├── index.tsx              分派器
├── types.ts               类型 + SIZE_MAP + 预设
├── mapping.ts             mapContent + resolveFeatures
├── primitives/            基础构件
│   ├── CardShell.tsx      外层容器（选中态、尺寸、过渡）
│   ├── CardInner.tsx      内层容器
│   ├── CardImage.tsx      图像区（裁剪）
│   ├── CardBack.tsx       卡背
│   ├── FoilOverlay.tsx    闪卡覆盖层
│   ├── back-styles/       卡背风格（注册表）
│   │   └── impl/          anvil · rune
│   └── foil-styles/       闪卡风格（注册表）
│       └── impl/          gold · silver · rainbow
└── styles/                卡框风格（注册表）
    └── impl/              YuGiOh · Generic · Minimal · MTG · Pokemon · Rainbow
```

---

## 项目文件格式

Anvil 项目是一个文件夹，**文本文件是唯一真相源**：

```text
MyWorld.anvil/
├── manifest.json               # 项目元数据（schema_version）
├── themes/<uuid>.json          # 项目主题
├── types/
│   ├── card_types.json
│   └── relation_kinds.json
├── cards/ab/<uuid>.json        # 一卡一文件
├── relations/from/<uuid>.jsonl # 一行一边
├── boards/<uuid>.json
├── scenarios/<uuid>/           # 一剧情一目录
│   ├── scenario.json           # 剧情元数据
│   └── main.md                 # 剧本（weave 语法，可多文件）
├── card_groups/<uuid>.json
├── sessions/<uuid>/
│   ├── session.json
│   └── events.jsonl
├── docs/<uuid>.md              # 卡牌附属文档（Markdown）
├── assets/
│   ├── images/<文件名>.<ext>
│   └── audio/<文件名>.<ext>
└── .anvil/index.db             # 索引，不提交 git
```

`.gitignore` 只需忽略 `.anvil/`。

**目录创建时机**：

- 打开 / 创建项目时：`cards / types / relations/from / boards / scenarios / sessions / docs / card_groups / .anvil`
- 首次保存主题时：`themes/`
- 首次导入资源时：`assets/images/` 或 `assets/audio/`

---

## 设计原则

1. **数据 > 视图。** 先想清楚数据模型，再想 UI。
2. **文本真相源 > 二进制锁定。** 项目可用 git 管理，SQLite 只是索引。
3. **边界清晰 > 功能快。** `features/cards/` 是共享核心，任何功能不得绕过它私建卡模型。
4. **格式稳定 > 内部优雅。** 资源包一旦发布，破坏性修改要么提供迁移路径，要么硬切版本门禁（schema 0.4 剧本格式重写选择了后者：旧项目 / 旧包直接报错，不迁移）。
5. **本地优先。** 不引入网络依赖就能完整工作。
6. **颜色走 CSS 变量。** 为主题系统留路。

完整设计文档见 [`docs/DESIGN.md`](docs/DESIGN.md)。

---

## 明确不做的事

开源项目最容易死于范围蔓延。以下明确排除：

- **不做多人联机。** 单人工具，不引入 CRDT 或服务端。
- **不做规则引擎。** 卡牌是纯信息载体，不解析「打出后造成 2 点伤害」这类逻辑。
- **不做 VTT 级别的自动化。** 骰子、测距、光照属于虚拟桌面，不是创作工具。
- **不做账号系统。** 本地文件，无云同步。
- **不做 Web 服务端。** 桌面应用，无后端。
- **不做视觉小说的完整演出引擎。** HTML 导出支持文本 / 背景 / 点击推进 / 选择 / 条件，不含立绘渲染、动画、转场、音频播放、存档、打包 EXE。想要完整演出，请把剧本导入 Ren'Py 或 Godot。

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

详见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

---

## 协议

本项目采用 [MIT 协议](LICENSE)。

---

## 致谢

- [Tauri](https://tauri.app/)
- [d3-force](https://github.com/d3/d3-force)
- [Zustand](https://github.com/pmndrs/zustand)
- [@dnd-kit](https://dndkit.com/)

---

## 状态

**早期开发中，经常出现破坏性更新。** 核心功能已可用，但 API 和数据格式仍可能变化。欢迎试用和反馈。

当前版本 `0.3.0`（2026-10-13），包含音频播放器 + 音乐模块、无边框标题栏、LeftNav 可拖拽排序、TopBar 极简化、设置面板重构、剧情模块改造（内联逻辑剧本）、银箔闪卡、卡框渲染分层、资源管理搜索、卡组卡片视图、多预设 / 添加预设、闪卡与卡背风格注册表化。

`0.4.0` 开发中，**剧本格式破坏性重写（schema 0.4，硬门禁不迁移，旧项目 / 旧资源包直接报错，请新建项目）**：weave 剧本语言（knot + 16 种行类型 + `@scene/@actor` 卡引用）、`scenarios/<id>/` 一剧情一目录多文件、两态机运行时、三栏剧情编辑器（文件树 + knot 大纲 / 结构·源码 / 检查器）、剧本内搜索、导出 knot 化、内置预设清空（「铁砧堡」按旧格式打包，已移除）。
