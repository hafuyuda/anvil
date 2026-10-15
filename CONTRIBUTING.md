# 贡献指南

感谢你对 Anvil 感兴趣。这份文档会帮你快速上手。

---

## 环境要求

- **Node.js** 20+
- **pnpm** 9+
- **Rust** stable（[rustup](https://rustup.rs)）
- **Tauri 2 系统依赖**
  - Windows：WebView2（Win11 自带）、MSVC 构建工具
  - macOS：`xcode-select --install`
  - Linux：`webkit2gtk-4.1`、`libappindicator3-dev`、`librsvg2-dev`、`patchelf`

VSCode 推荐扩展（打开项目时会自动提示）：

- `rust-lang.rust-analyzer`
- `tauri-apps.tauri-vscode`
- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`

---

## 快速开始

```bash
git clone https://github.com/hafuyuda/anvil.git
cd anvil
pnpm install
pnpm tauri dev
```

第一次运行会编译 Rust，比较慢（几分钟）。

**验证环境**：

```bash
# TS 无报错
pnpm tsc --noEmit

# Rust 无报错
cd src-tauri && cargo check
```

两个都通过，就可以开始开发了。

---

## 开发流程

### 1. 找一件事做

- 看 [Issues](https://github.com/hafuyuda/anvil/issues)
- 标记 `good first issue` 的适合新手
- 想做大改动前，先开 Issue 讨论

### 2. 创建分支

```bash
git checkout -b feat/your-feature
# 或
git checkout -b fix/your-bugfix
```

### 3. 写代码

- 改完跑 `pnpm tauri dev`，手动验证功能
- 跑 `pnpm tsc --noEmit` 和 `cd src-tauri && cargo check`
- 尽量小步提交

### 4. 提交

提交信息格式：

```text
<type>: <简短描述>

<可选：详细说明>
```

`type` 用：

- `feat` — 新功能
- `fix` — 修 bug
- `refactor` — 重构
- `docs` — 文档
- `chore` — 杂项（依赖、配置）
- `test` — 测试
- `style` — 格式（不改逻辑）

**例子**：

```text
feat: add silver foil effect

闪卡风格新增「银箔」，与金箔共用触发字段。
数据层加 foil_style 字段，渲染层按 variant 选择颜色。
```

### 5. 推送并开 PR

```bash
git push -u origin feat/your-feature
```

去 GitHub，会看到「Compare & pull request」按钮。点开填写：

- **标题**：和 commit message 一致
- **描述**：
  - 做了什么
  - 为什么
  - 怎么验证
  - 涉及哪些文件
- 关联 Issue：`Closes #123`

---

## 目录结构速查

```text
src-tauri/src/
├── core/
│   ├── model/          # 数据模型
│   ├── store/          # 文本文件读写 + 索引 + 资源包
│   │   ├── assets.rs       # 图片 + 音频
│   │   ├── atomic.rs       # 原子写
│   │   ├── boards.rs
│   │   ├── cards.rs
│   │   ├── card_groups.rs
│   │   ├── export_html.rs
│   │   ├── manifest.rs
│   │   ├── pack.rs
│   │   ├── project.rs
│   │   ├── relations.rs
│   │   ├── scenarios.rs
│   │   ├── scripts.rs
│   │   ├── preset.rs       # 内置预设注册表 + 非空项目追加导入
│   │   ├── sessions.rs
│   │   └── theme.rs
│   ├── index/          # SQLite 索引 + FTS
│   └── ipc/            # Tauri 命令
└── lib.rs

src/
├── core/               # IPC 类型 + 项目级动作
│   ├── ipc/            # api.ts · types.ts · index.ts
│   ├── applyProjectTheme.ts
│   └── openProjectAt.ts
├── lib/                # 通用工具
│   ├── id.ts · time.ts · theme.ts · fontScale.ts · lookup.ts
│   ├── assetCache.ts · audioPlayer.ts · moduleOrder.ts
│   ├── toast.ts · confirm.ts · runWithError.ts · saveRegistry.ts
│   ├── dice.ts · appSettings.ts · commands.ts
│   └── recentProjects.ts
├── hooks/              # 通用 hook
│   ├── useAppSettings.ts · useAssetUrl.ts · useCommands.ts
│   ├── useCreateProject.ts · useDeleteUndo.ts · useDraft.ts
│   ├── useExportPack.ts · useImportPack.ts · useKeyboard.ts
│   └── useOpenProject.ts
├── components/
│   ├── ui/             # 纯 UI 原子（Modal / Toggle / SectionLabel / EmptyState / Toolbar / SaveInput / LabeledBlock）
│   ├── card/           # 卡牌领域（CardFrame / CardGrid / HoverPreview / ScaledCardFrame）
│   ├── field/          # 字段编辑（FieldInput / ImageField / RefField / AudioSelect / TypeMultiSelect）
│   ├── overlay/        # 顶层浮层（ToastHost / ConfirmHost / CommandPalette / PickerDialog / CardPickerGridDialog）
│   └── layout/         # 通用布局（EntityListLayout）
├── shell/              # 五段布局
│   ├── AppShell.tsx · TopBar.tsx · LeftNav.tsx
│   ├── Workspace.tsx · Inspector.tsx · StatusBar.tsx
│   └── ErrorBoundary.tsx
├── themes/             # 内置主题
├── features/
│   ├── cards/          # ★ 共享核心
│   │   ├── card/ · card-type/ · card-wall/ · relation/
│   ├── card-groups/
│   ├── story/
│   │   ├── scenario/   # 剧情设计 + 导出
│   │   │   └── inspector/   # 检查器内容
│   │   ├── play/
│   │   │   ├── vn/     # VNStage 系列
│   │   │   └── panels/ # 变量面板
│   │   ├── script/
│   │   │   ├── structured/  # 结构编辑
│   │   │   └── source/      # 源码 + 预览
│   │   └── effects.ts
│   ├── board/
│   ├── session/
│   │   └── chat/
│   ├── player/         # 音乐模块
│   ├── project/        # 项目设置内容 + 资源包合并 + 主题子目录
│   ├── settings/       # 设置浮层 + 分类面板
│   └── commands/       # useGlobalCommands.ts
└── stores/
    ├── projectStore.ts · uiStore.ts
    └── slices/
```

**关键**：`features/cards/` 是共享核心，所有功能都通过它读写卡牌。**不要绕过它私建卡模型。**

---

## 目录约定

- **每个 feature 一个目录**，内部按子领域再分组（`card/`、`card-wall/`、`card-type/`、`relation/`）。
- **feature 顶层不放散文件**，要么是容器组件，要么是子目录。
- **子目录内不放转发文件**。
- **`components/` 放跨 feature 通用组件**。若某组件只被一个 feature 用，它应该在那个 feature 里。
- **`components/CardFrame/` 分三层**：
  - `index.tsx` / `types.ts` / `mapping.ts` — 分派、类型、数据映射
  - `primitives/` — 基础构件（Shell / Inner / Image / Back / Foil）
  - `styles/` — 五种风格实现
- **`features/` 之间不互相引用内部文件**。需要共享，提升到 `components/` 或 `lib/`。
  - 已知例外：`session/SessionEditor` 引 `board/BoardCanvas`。
- **新增文件时先问：半年后的自己打开这个目录，能否一眼猜到它在这里。**

---

## 代码风格

### Rust

- 用 `rustfmt` 格式化
- 命名清晰，注释写「为什么」
- 错误用 `anyhow::Result`，命令层转 `String`
- 存储层每个领域一个文件（`cards.rs` / `relations.rs` / ...）
- HTML / CSS / JS 嵌在 raw string 里时用 `r##"..."##`（双 #）

### TypeScript / React

- 用 Prettier 格式化
- 组件文件 PascalCase，hook 文件 camelCase
- 状态用 Zustand，不要用 Context 传业务状态
- 每个功能模块一个目录，主组件放在目录入口
- 主文件超过 400 行考虑拆子组件

### 通用

- **不要提交调试代码**：`console.log` / `println!` / `dbg!`
  - 例外：`eprintln!` 用于容错日志
- **不要提交注释掉的代码块**
- **不要引入大依赖** 未经讨论

---

## 关键约束

这几条是整个架构的命脉，请务必遵守。

### 数据层

1. **卡牌是唯一内容实体。** 世界观 NPC、剧情节点、棋盘角色都是同一张卡。Board / Scenario / Session 是容器。CardGroup 是辅助索引，CardPile 是 Token 的变体。

2. **关系是一等公民。** 卡与卡之间的边独立存储，与卡片字段分离。关系边只表达世界观连接；剧情的分支 / 条件 / 变量内联在剧本语言（`->` / `{}` / `~`）里，不写入 Relation.meta。

3. **文本真相源。** 项目是一个文件夹，文本文件（JSON / JSONL / Markdown）是唯一真相源。SQLite（`.anvil/index.db`）是可删除、可重建的索引。

4. **字段只增不减。** `FieldDef` 删除时用 `deprecated = true`，不真删。新增 Rust 结构体字段用 `#[serde(default)]`，保证旧项目文件能读。CardFrameConfig 的 legacy 字段已在 0.3 迁移中删除，属于一次性的破坏性迁移，有 schema_version 保护

### 前端架构

5. **`features/cards/` 是共享核心。** 任何功能不得绕过它私建卡模型。

6. **`features/` 之间不互相引用内部文件。** 需要共享，提升到 `components/` 或 `lib/`。已知例外：`session/SessionEditor` 引 `board/BoardCanvas`。

7. **状态分两类**：
   - **Zustand（slice 模式）**：`projectStore` 聚合 9 个 slice（project / cards / relations / scenarios / boards / sessions / cardGroups / undo / ui）；`uiStore` 只放纯 UI 状态（palette / merge / settings）。
   - **模块级单例 + `useSyncExternalStore`**：`appSettings` / `audioPlayer` / `assetCache` / `moduleOrder`。

8. **跨 feature 通用组件放 `components/`**，只被一个 feature 用的组件放该 feature 目录内。

### 存储与 IPC

9. **高频操作不过 IPC。** 棋盘拖拽在前端内存跑，操作结束再写回。

10. **图片 + 音频统一走 asset protocol。** 前端 `lib/assetCache.ts` 缓存 `relative → asset URL`；Rust `asset_abs_path` 返回绝对路径；前端 `convertFileSrc(abs)` 转 URL。**前端不用 base64。** `read_image_data_url` 只给 HTML 导出内嵌用。

11. **asset scope 动态管理。** `open_project` → `allow_directory` 项目根。**不做 `forbid_directory`**——Tauri 2 的 deny 列表只增不减，调用会让同一路径在「关闭项目 → 重开」后永久被拒。前端关闭项目时 `clearAssetCache()`。

12. **前端不裸调 `invoke`。** 统一走 `core/ipc/api.ts`。Rust snake_case → 前端 camelCase，Tauri 2 自动转换。

### 交互

13. **输入密集处不用 HTML5 DnD。** 用 `@dnd-kit`。拖拽排序 `PointerSensor` + `activationConstraint.distance: 4`（卡组内整卡可拖，用 `distance: 8`）。Windows WebView2 会拦截 HTML5 拖放并破坏 IME。

14. **动画走合成属性。** `transform` / `opacity`。不用 `background-position` / `mixBlendMode` / `filter` 做循环动画。闪卡流光用 `transform: translate3d`。

15. **`prefers-reduced-motion: reduce` 时禁用动画**（闪卡已做）。

16. **对话框 `onClose` 用 ref 稳定。** Modal / 对话框的 `onClose` 常是父组件内联箭头函数，effect 里用 ref 模式读，避免 effect 重跑。

### 错误处理

17. **统一入口**：
    - 成功 / 失败提示：`toast.info` / `toast.success` / `toast.error`
    - 用户确认：`await confirmDialog({ ... })`
    - try-catch 包装：`await runWithError(() => ipc.xxx(), "xxx失败")`
    - **不用 `alert()` 和 `window.confirm()`**（`lib/confirm.ts` 里的 fallback 除外）

### 卡框渲染

18. **分层**：
    - `mapContent(card, cardType)` → `CardContent`（纯数据）
    - `resolveFeatures(card, cardType)` → `CardFeatures`（裁剪 / 出框 / 闪卡 / 闪卡变体）
    - 风格组件**只接收 `content`**
    - `CardFrame/index.tsx` 组装：算 content + features → 分派风格 → 需要时包 `FoilOverlay`

19. **加新卡框风格**只加一个文件：在 `styles/impl/` 下新建 `.tsx`，默认导出 `CardStyleDef`（`id` / `label` / `Component`）。注册表用 `import.meta.glob` 自动发现，无需改 `types.ts` / 标签表 / `index.tsx`。卡背同理，放 `primitives/back-styles/impl/`，默认导出 `CardBackStyleDef`。需要在 impl/*.tsx 里默认导出的 def 上声明 slots

20. **加新闪卡效果**只加一个文件：在 `primitives/foil-styles/impl/` 下新建 `.ts`，默认导出 `FoilStyleDef`（`id` / `label` / `css`）。注册表用 `import.meta.glob` 自动发现，CSS 在模块加载时一次性注入。**不改任何卡框风格组件。**

### 设置

21. **设置形态是居中浮层**（`1000×680` + 遮罩 + 模糊），**不是全屏页面**。左 NAV 200px，右内容 max 760px。顶部两行：标题 + 搜索框。`Esc` 关闭、遮罩点击关闭、`↑` `↓` 切分类。

22. **分类按存储位置划分**（存项目文件夹 → 项目分类；存 `localStorage` → 应用分类），但**不按「项目 / 应用」分组呈现**。实际 5 类：

    | key          | 标签   | requiresProject | 内容                                                   |
    | ------------ | ------ | --------------- | ------------------------------------------------------ |
    | `general`    | 常规   | ✓               | 项目名 / 版本 / 作者 / 描述 / 默认卡背 / 默认卡框风格  |
    | `appearance` | 外观   | ✗               | 项目主题 + 界面缩放                                    |
    | `resources`  | 资源   | ✓               | 图片资源（AssetsTab）                                  |
    | `editor`     | 编辑器 | ✗               | 自动保存延迟 / 最近项目上限 + 打字机速度 / 启用 / 旁白 |
    | `advanced`   | 高级   | ✗               | 项目统计 + 清除缓存 / 恢复默认设置                     |

23. **设置层级：项目默认 → 应用默认 → 内置默认。** 项目设了就覆盖应用，项目没设就继承应用。

24. **加设置分类只加一个文件**：在 `features/settings/categories/impl/` 新建 `.tsx`，默认导出 `CategoryDef { id, label, glyph, keywords, requiresProject, order, Panel }`。Vite 自动发现，左 NAV、搜索、`↑↓` 切换、`requiresProject` 过滤全部自动生效。`settingsCategory` 在 store 里是 `string`，未知 id 由注册表回退默认分类（`appearance`），不用改 store / `SettingsPage`。

25. **设置分类**：加分类只在 `features/settings/categories/impl/` 下新建一个文件，默认导出 `CategoryDef`。完整模式见 [`docs/REGISTRY_PATTERN.md`](docs/REGISTRY_PATTERN.md)。

26. **应用设置存 `localStorage`**（`anvil.appSettings`）。当前 9 项：`defaultCardFrameStyle` / `typewriterSpeed` / `typewriterEnabled` / `typewriterNarration` / `autoSaveDelayMs` / `recentProjectsMax` / `fontScale` / `playerVolume` / `playerLoop`。后两项**不出现在设置面板**，只由播放器 UI 调。

### 主题

27. **颜色走 CSS 变量。** 不硬编码。所有颜色在 `src/index.css` 的 `:root` 定义。

28. **主题应用优先级**：`applyProjectTheme()` 读 `manifest.theme_id` → 若是内置 ID 用内置 → 否则从 `ipc.listThemes()` 找 → 都没有则 `resetTheme()`。

29. **`resetTheme()` 清除所有 `--` 变量**，`applyTheme(vars)` 设置。

### 新形态

30. **无边框标题栏。** `tauri.conf.json` `decorations: false` + `tauri-plugin-frame`。TopBar `paddingRight: calc(12px + var(--tauri-frame-controls-width, 138px))` 给窗口按钮留位。`index.css` 末尾 `[data-tauri-frame-tb] { pointer-events: none }` 让覆盖层穿透，只保留 `> button` 可点。

31. **LeftNav 模块顺序持久化到 `localStorage`**（`anvil.leftNavOrder`）。`lib/moduleOrder.ts` 读写时过滤已删模块、追加新模块。默认 7 模块：`world / story / board / cardGroups / session / player / types`。非卡片墙模块自动收窄 48px，悬停展开 180px。

32. **全局音频播放器是模块级单例**（`lib/audioPlayer.ts`）。一个 `HTMLAudioElement`，跨模块、跨设置持续播放。音量 / 循环持久化到 `appSettings`。UI 三处：`MiniPlayer`（右下常驻）、`PlayerInspector`（检查器内）、`PlayerView`（音乐模块主区）。

### 自动保存

33. **自动保存走 `useDraft`**：draft 变化 → debounce（`appSettings.autoSaveDelayMs`，默认 800ms）→ 落盘 → 推撤销栈。`registerFlusher` 让 `Ctrl+S` 时 `flushAll()` 立刻保存所有脏 draft。

34. **切换 source id 时重置 draft**：`useDraft` 里 `if (draft.id !== source.id)` 判断。

### 快捷键

35. **全局快捷键**：
    - `Ctrl+K` 命令面板
    - `Ctrl+M` 切到音乐模块
    - `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` 撤销 / 重做
    - `Ctrl+S` flushAll
    - `Ctrl+1..5` 切模块（world / story / board / session / types，**跳过 cardGroups 和 player**）
    - `Esc` 关闭设置 / 播放预览

### 模块

36. `ModuleKey` 7 个：`world / story / board / cardGroups / session / player / types`。**数字快捷键只覆盖 5 个**；`cardGroups` 和 `player` 无数字键，`player` 用 `Ctrl+M`。

### 棋盘

37. **棋盘边界自动扩充**：添加 token 后按 100px 取整扩充，+180/+240 留白。**抽牌不扩充**（与「从卡组导入」的区别）。

### 资源包合并

38. **合并只处理图片，不处理音频。** `pack.rs::merge_pack_from` 的 assets 段只遍历 `assets/images/`。这是当前实现的实际边界。

39. **合并时「同名跳过」**（图片）：目标项目已有同名文件时不覆盖。

40. **合并 ID 冲突一律跳过**：卡片、关系、剧情、棋盘、会话、卡组，ID 已存在就跳过，不做替换。

### Rust 侧

41. **每个领域一个文件。** `src-tauri/src/core/store/` 每领域一个文件（cards / relations / scenarios / …）。

42. **Rust HTML / CSS / JS 嵌在 raw string 里时用 `r##"..."##`**（双 #），因为代码里会出现 `"#xxx`。

43. **`include_bytes!` 是编译期嵌入。** `example_world.anvilpack` 改了必须重新编译。

44. **`Project::open` 创建 9 个目录**：`cards / types / relations/from / boards / scenarios / sessions / scripts / card_groups / .anvil`。`themes/` 和 `assets/images|audio/` 按需创建。

45. **索引重建判断只看 `cards / types / relations` 的 mtime**，`PRAGMA user_version == 0` 也触发重建。

---

## 技术债 · 顺手改

以下项目**不单独占一批**。改动相关文件时如遇到，顺手处理。

### 内联样式 → 组件

```tsx
// 区块小标题
fontSize: 10, color: "var(--fg-muted)", textTransform: "uppercase",
letterSpacing: 1, marginBottom: 4
→ <SectionLabel>...</SectionLabel>

// 字段标签（略大、字距略松）
fontSize: 11, color: "var(--fg-muted)", textTransform: "uppercase",
letterSpacing: 0.5, marginBottom: 4
→ <SectionLabel variant="field">...</SectionLabel>

// 空状态（虚线框 + 居中弱文字）
border: "1px dashed var(--border-default)", textAlign: "center",
color: "var(--fg-muted)", fontSize: 12
→ <EmptyState>...</EmptyState>

// checkbox + 文字
<label><input type="checkbox" />文字</label>
→ <Toggle label="文字" checked={...} onChange={...} />
```

**不抽**：`Mono`（input inline style 无法包裹）、`LabeledInput`（差异大于共性）、`Divider`（与 flex 耦合）。

### useEffect 依赖数组

部分 effect 的依赖数组可能包含不稳定引用。改到相关文件时核实：

- 如果 effect 里只注册监听器，用 ref 模式读 `onClose` 等
- 如果 effect 里读了 state，依赖要准确

### 历史遗留

- `src/index.css` 末尾的 `.graph-handle` 样式是节点图遗留，可清理。
- `lib/saveRegistry.ts` 的 `flushAll` 只在 `useKeyboard` 里调（`Ctrl+S`），其他位置没有调用。改到时核实需求。

### 单元测试

项目当前**没有单元测试**。值得补的地方：

- `lib/dice.ts` —— 骰子解析与求值
- `story/script/parser.ts` + `serializer.ts` —— 剧本 parse ↔ serialize 往返
- `story/effects.ts` —— 条件求值 + 效果

### CI 增强

当前只跑 `tsc --noEmit`。可以加：

- `cargo check`
- `cargo fmt --check`
- `prettier --check src/`

---

## 常用命令

```bash
# 开发
pnpm tauri dev

# 构建
pnpm tauri build

# TS 类型检查
pnpm tsc --noEmit

# Rust 检查
cd src-tauri && cargo check

# Rust 格式化
cd src-tauri && cargo fmt

# 前端格式化
pnpm prettier --write src/
```

---

## 测试

目前项目**没有单元测试**，主要靠手动验证。CI 只跑类型检查。

提交 PR 前请手动验证：

1. 新建项目 → 弹「添加示例内容？」→ 添加铁砧堡 → 数据完整；再打开非空项目 → 项目菜单「添加预设…」→ 选「铁砧堡」→ 内容追加且无 id 冲突、同名实体带 `(2)` 后缀
2. 卡片墙 → 搜索、筛选、多选、批量操作、排序
3. 类型 → 字段编辑、拖拽排序、卡框映射、闪卡触发（含风格切换）、裁剪、卡背、类型复制
4. 关系 → 面板显示方向、反向名、悬浮预览
5. 剧情 → 场景 tab、剧本（结构 + 源码双视图）、检查器（剧情设置 / 变量 / 节点）、`->` 跳转、`{}` 条件、`~` 赋值、`<>` 粘合、运行全屏、回退、循环保护
6. 剧情 → 导出 Markdown / HTML
7. 棋盘 → 拖拽、缩放、旋转、背景、网格形状、卡盒抽牌、翻牌、占位、关系线、边界扩充、批量加卡
8. 卡组 → 新建（空白 / 按类型生成）、加卡（含同一张卡多份）、按类型填充（追加 / 替换）、卡片/列表视图切换（× N 角标）、拖拽排序、导入棋盘、加卡盒
9. 跑团 → 对话、掷骰、消息编辑、事件日志、会话内卡盒
10. 音乐 → 导入、播放、暂停、进度、音量、循环、引用计数、删除警告
11. MiniPlayer → 右下常驻、跨模块持续、切设置仍播放
12. LeftNav → 拖拽排序、刷新持久化、非卡片墙收窄、悬停展开
13. 无边框标题栏 → 窗口按钮、Snap Layout、TopBar 不遮挡
14. 设置 → 常规 → 改字段 → 保存 → 重开生效
15. 设置 → 外观 → 切换主题 → 主界面立即跟随；缩放滑块实时生效
16. 设置 → 资源 → 图片导入 / 删除 / 搜索 / 扫描未引用 / 清理
17. 设置 → 编辑器 → 自动保存延迟 / 最近项目上限 / 打字机（速度 / 开关 / 旁白）
18. 设置 → 高级 → 统计刷新 / 重建索引 / 导出诊断信息 / 清除缓存 / 恢复默认设置（含模块排序）
19. 设置 → Esc 关闭、遮罩点击关闭、↑↓ 切分类、搜索跳转
20. 导出 → 导入 → 合并

如果你加了新功能，请在 PR 描述里说明验证步骤。

---

## 常见坑

### Rust 编译慢

第一次编译 Tauri 需要几分钟。之后增量编译快很多。

### 图片不显示

图片走 asset protocol。检查：

- `assets/images/` 里文件是否存在
- `tauri.conf.json` 里 `assetProtocol.enable` 是否为 `true`
- `csp` 里 `img-src` 是否包含 `asset:` 和 `http://asset.localhost`
- 项目打开时会动态添加 scope，关闭时移除

### 音频不播放

- 检查 `tauri.conf.json` 里 `assetProtocol.enable` 是否为 `true`
- 检查 `csp` 里 `media-src` 是否包含 `asset:` 和 `http://asset.localhost`
- 项目打开时会动态添加 scope，关闭时移除
- 全局播放器需要用户交互才能开始播放（浏览器策略）

### 窗口空白

DevTools（Tauri 窗口右键 → Inspect）看 Console 报错。

### Windows 上拖拽不工作

检查 `tauri.conf.json` 里没有 `dragDropEnabled: false`。

### TopBar 按钮点不动

`tauri-plugin-frame` 注入的标题栏覆盖层默认整层接收点击。`index.css` 末尾 `[data-tauri-frame-tb] { pointer-events: none }` 让覆盖层穿透，只保留 `> button` 可点。如果新增按钮仍点不动，检查是否被覆盖层遮挡。

### 中文搜索无效

FTS 用 trigram，短查询（< 3 字符）走内存过滤。这是设计。

### 对话框里改的状态被外部冲掉

如果对话框内部有 effect 依赖 `onClose` 等不稳定引用，用 ref 稳定回调。

### 拖动 token 后删除，界面延迟一拍

`BoardCanvas` 里 `localTokens` 是拖拽时的本地镜像。同步 effect 必须**先比较长度和 id 集合**，再逐项比字段。

### Rust 编译报 `missing field XXX`

新增结构体字段后，所有结构体字面量都要补。

### Rust 编译报 `prefix X is unknown`

HTML / CSS / JS 嵌在 Rust raw string 里时，用 `r##"..."##`（双 #），因为代码里会出现 `"#xxx`。

### 结构化编辑器输入框「选了没反应」

React 里连续两次 `setState` 会基于同一个旧 state 计算。合并更新成一个 `onChange({ ...patch })`。

### Vite 报 `does not provide an export named`

通常是模块编译失败，Vite 静默处理导致导出丢失。先看 `tsc --noEmit` 的真实报错，或完全重启 dev server。

### `include_bytes!` 不生效

`include_bytes!` 是编译期嵌入。pack 文件改了必须重新编译。

### 闪卡动画卡顿

CSS 动画如果用 `background-position` / `mixBlendMode`，会落到主线程重绘。用 `transform: translate3d` 和 `will-change: transform`。参见 `FoilOverlay.tsx`。

### 模块顺序乱掉

`lib/moduleOrder.ts` 读写时会过滤已不存在的模块、把新增模块追加到末尾。如果 `localStorage` 里的 `anvil.leftNavOrder` 完全乱掉，可以通过「设置 → 高级 → 恢复默认设置」重置（会一并重置 `appSettings`），或在命令面板执行「重置模块排序」。

### 关闭项目后重开，图片 / 音频不显示

`forbid_directory` 在 Tauri 2 里只往 deny 列表追加，不会从 allow 移除。
`close_project` 调用一次就把项目路径永久钉死在 deny 里，直到 app 重启。
**修复做法：只 `allow_directory`，不 `forbid_directory`。**

---

## 获取帮助

- 开 [Issue](https://github.com/hafuyuda/anvil/issues) 描述问题
- PR 里直接问
- 不确定的方向先开 Issue 讨论

---

## 协议

贡献的代码默认采用项目的 [MIT 协议](LICENSE)。
