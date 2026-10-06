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
feat: add timeline view for event cards

支持按数字字段排序展示事件卡。
支持过滤和搜索。
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
│   ├── model/          # 数据模型（Card / CardType / Relation / ...）
│   ├── store/          # 文本文件读写
│   ├── index/          # SQLite 索引 + FTS
│   ├── eval/           # 条件求值
│   └── ipc/            # Tauri 命令
└── lib.rs

src/
├── core/ipc/           # 前端 IPC 类型 + invoke 封装
├── lib/                # 通用工具
├── hooks/              # React hooks
├── components/         # 通用组件
├── shell/              # 五段布局
├── features/
│   ├── cards/          # ★ 共享核心
│   ├── world/          # 图谱
│   ├── story/          # 剧情
│   ├── board/          # 棋盘
│   ├── session/        # 跑团
│   ├── project/        # 项目设置
│   └── commands/       # 命令注册
└── stores/
    ├── projectStore.ts # 组合 slices
    └── slices/         # 按领域拆分
```

**关键**：`features/cards/` 是共享核心，所有功能都通过它读写卡牌。**不要绕过它私建卡模型。**

---

## 代码风格

### Rust

- 用 `rustfmt` 格式化（默认配置即可）
- 命名清晰，注释写「为什么」
- 错误用 `anyhow::Result`，命令层转 `String`
- 存储层每个领域一个文件（`cards.rs` / `relations.rs` / ...）

### TypeScript / React

- 用 Prettier 格式化（配置见项目根）
- 组件文件 PascalCase，hook 文件 camelCase
- 状态用 Zustand，不要用 Context 传业务状态
- 每个功能模块一个目录，主组件放在目录入口

### 通用

- **不要提交调试代码**：`console.log` / `println!` / `dbg!`
  - 例外：`eprintln!` 用于容错日志，可以保留
- **不要提交注释掉的代码块**
- **不要引入大依赖** 未经讨论

---

## 关键约束

这几条是整个架构的命脉，请务必遵守：

### 1. 卡牌是唯一内容实体

世界观 NPC、剧情节点、棋盘角色都是同一张卡。Board、Scenario、Session 是容器。

### 2. 关系是一等公民

卡与卡之间的边独立存储，与卡片字段分离。

- 世界观边：无 `scenario_id`
- 剧情边：有 `scenario_id`

两者严格分离，**不要混用**。

### 3. 文本真相源

项目是一个文件夹，文本文件是唯一真相源。SQLite 只是可删除、可重建的索引。

**不要**把 SQLite 当作数据存储，只当作查询加速器。

### 4. 字段只增不减

`FieldDef` 删除时用 `deprecated = true`，不要真删。旧数据保留。

### 5. 高频操作不过 IPC

棋盘拖拽、节点图移动在前端内存跑，操作结束再写回。不要每帧调 Rust。

### 6. 输入密集处不用 HTML5 DnD

Windows 上 Tauri 的 WebView2 会拦截 HTML5 拖放，破坏 IME。用 `@dnd-kit`（基于 Pointer Events）。

### 7. 颜色走 CSS 变量

不要硬编码颜色值。所有颜色在 `src/index.css` 定义。`theme.ts` 是 JS 侧镜像。

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

1. 打开项目 → 载入示例世界 → 数据完整
2. 卡片墙 → 搜索、筛选、多选、批量操作
3. 类型 → 字段编辑、拖拽排序、卡框映射
4. 图谱 → 拖拽、连线、过滤、点击节点/边
5. 剧情 → 节点图、运行、条件、效果、骰子
6. 棋盘 → 拖拽、缩放、旋转、背景
7. 跑团 → 对话、掷骰、消息编辑、事件日志
8. 项目设置 → 主题、图片资源、数据统计
9. 导出 → 导入 → 合并

如果你加了新功能，请在 PR 描述里说明验证步骤。

---

## 常见坑

### Rust 编译慢

第一次编译 Tauri 需要几分钟。之后增量编译快很多。

### 图片不显示

图片用 base64 加载，大图会慢。检查 `assets/images/` 里文件是否存在。

### 窗口空白

DevTools（Tauri 窗口右键 → Inspect）看 Console 报错。多半是某个组件抛异常，检查 ErrorBoundary 显示的信息。

### Windows 上拖拽不工作

检查 `tauri.conf.json` 里没有 `dragDropEnabled: false`（这会破坏 IME）。

### 中文搜索无效

FTS 用 trigram，短查询（< 3 字符）走内存过滤。这是设计。

---

## 获取帮助

- 开 [Issue](https://github.com/hafuyuda/anvil/issues) 描述问题
- PR 里直接问
- 不确定的方向先开 Issue 讨论，避免大改动返工

---

## 协议

贡献的代码默认采用项目的 [MIT 协议](LICENSE)。
