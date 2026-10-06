# Anvil 设计文档

版本 0.8 · 单人创作工具 · 桌面优先 · 开源

> 本文档反映当前实现。M1–M5 完成，M6 打磨进行中。

---

## 1. 愿景

Anvil 是一个以**卡牌为核心**的世界观创作与跑团工具。它把世界观搭建、分支故事、棋盘推演、跑团记录统一在同一份数据之上。

> **一切内容实体皆卡牌。四大功能是同一份 Card + Relation 数据的不同视图与不同运行模式。**

---

## 2. 命名与设计语言

- **Anvil**：铁砧。矮人工匠锻造之地。
- 视觉关键词：**铁、木、锤、火、纹章、卡牌**
- 交互隐喻：**锻造卡牌**——定义模具（CardType），铸造实例（Card），在战场上使用（Token）

**配色**（深色主题）：

- 背景：`#1a1612`（应用）· `#25201a`（面板）· `#2f2922`（表面）
- 文字：`#e8dcc5`（主）· `#a89880`（次）· `#6d6252`（弱）
- 强调：`#c9a961`（金）· `#a05a2c`（铜）· `#c8401f`（暗红）· `#7a8590`（钢）
- 字体：正文 `system-ui`，标题 `Georgia, serif`，数据 `JetBrains Mono`

---

## 3. 核心概念

### 3.1 三层数据

```text
┌─────────────────────────────────────────────────┐
│  类型层 (Schema)                                 │
│  CardType · FieldDef · RelationKind · VariableDef│
├─────────────────────────────────────────────────┤
│  实例层 (Project)                                │
│  Card · Relation · Board · Scenario · Theme     │
├─────────────────────────────────────────────────┤
│  运行层 (Runtime)                                │
│  Session · Token · Event                        │
└─────────────────────────────────────────────────┘
```

### 3.2 三条铁律

1. **卡牌是唯一内容实体单位。** 世界观 NPC、剧情节点、棋盘角色都是卡。Board、Scenario、Session 是容器。
2. **关系是一等公民。** 卡与卡之间的边独立存储，与卡片字段分离。
3. **跑团不写回原始卡。** 运行时修改的是 Token（副本），Card 保持不变。

### 3.3 四大功能的统一

| 功能 | 数据来源 | 主要视图 | 运行时 |
|---|---|---|---|
| 世界观 | Card + Relation | 卡片墙 / 图谱 / 时间线 | 无 |
| 分支故事 | Card + Relation（条件边）+ Scenario | 节点图 / 运行视图 | 条件求值 + 效果 |
| 棋盘 | Card + Token + Board | HTML 画布 | 坐标与状态 |
| 跑团 | Card + Session + Token | 舞台 + 对话流 + 角色列表 | 事件日志 |

### 3.4 场景卡

剧情图的节点推荐用「场景」CardType，而不是角色或地点：

- 故事从场景出发，不从人物出发
- 同一地点可发生多场戏
- 场景卡字段：时间、地点、参与者、氛围、描述、对白

场景卡是**约定**，不强制。

### 3.5 边的分类

- **世界观边**：无 `scenario_id`。图谱和关系面板显示。
- **剧情边**：有 `scenario_id`。只在该剧情的节点图显示。

**无向关系**（`directed: false`）两侧都显示在「本卡参与」，用 `⇄` 连接符。

---

## 4. 数据模型

### 4.1 类型层

```rust
pub struct CardType {
    pub id: TypeId,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub description: Option<String>,
    pub fields: Vec<FieldDef>,
    pub allowed_relation_kinds: Vec<String>,
    pub views: Vec<String>,
    pub card_frame: Option<CardFrameConfig>,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct FieldDef {
    pub key: String,
    pub label: String,
    pub ty: FieldType,
    pub required: bool,
    pub default: Option<Value>,
    pub group: Option<String>,
    pub order: i32,
    pub deprecated: bool,
}

pub struct CardFrameConfig {
    pub style: Option<String>,
    pub title: Option<String>,
    pub subtitle: Option<String>,
    pub image: Option<String>,
    pub level: Option<String>,
    pub level_label: Option<String>,
    pub type_line: Option<String>,
    pub body: Vec<String>,
    pub atk: Option<String>,
    pub atk_label: Option<String>,
    pub def: Option<String>,
    pub def_label: Option<String>,
    pub hp: Option<String>,
    pub hp_label: Option<String>,
}
```

`FieldType`：

```text
Text · RichText · Number · Bool · Date · Color
Enum { options } · MultiEnum { options } · Tags
Ref { target_types } · Image · Url · Json
```

约束：

- 字段只增不减（`deprecated = true`）
- `name` 是保留字段
- `card_frame` 为空时走启发式映射
- `*_label` 为空时用默认（ATK / DEF / HP / 星号）

### 4.2 实例层

```rust
pub struct Card {
    pub id: CardId,           // UUID v4
    pub type_id: TypeId,
    pub name: String,
    pub values: BTreeMap<String, Value>,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct RelationKind {
    pub id: String,
    pub name: String,
    pub inverse_name: Option<String>,
    pub directed: bool,
    pub color: Option<String>,
    pub from_types: Vec<TypeId>,
    pub to_types: Vec<TypeId>,
    pub fields: Vec<FieldDef>,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct Relation {
    pub id: RelationId,
    pub from: CardId,
    pub to: CardId,
    pub kind: String,
    pub label: Option<String>,
    pub meta: BTreeMap<String, Value>,
    pub created_at: i64,
}
```

`Relation.meta` 里约定的键：

| 键 | 类型 | 说明 |
|---|---|---|
| `condition` | string | 剧情边的条件表达式 |
| `effects` | string[] | 剧情边的效果指令 |
| `scenario_id` | string | 剧情边归属 |

### 4.3 剧情

```rust
pub struct Scenario {
    pub id: ScenarioId,
    pub name: String,
    pub description: Option<String>,
    pub entry_node: Option<CardId>,
    pub node_ids: Vec<CardId>,
    pub edge_kinds: Vec<String>,
    pub node_positions: BTreeMap<CardId, [f64; 2]>,
    pub variables: Vec<VariableDef>,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct VariableDef {
    pub key: String,
    pub label: String,
    pub ty: FieldType,
    pub default: Option<Value>,
}
```

### 4.4 棋盘

```rust
pub struct Board {
    pub id: BoardId,
    pub name: String,
    pub width: f64,
    pub height: f64,
    pub grid: GridConfig,
    pub background: Option<String>,
    pub tokens: Vec<Token>,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct Token {
    pub id: TokenId,
    pub card_id: Option<CardId>,
    pub name_override: Option<String>,
    pub value_overrides: BTreeMap<String, Value>,
    pub x: f64, pub y: f64,
    pub w: Option<f64>, pub h: Option<f64>,
    pub rotation: f64,
    pub layer: i32,
    pub visible: bool,
}
```

### 4.5 运行层

```rust
pub struct Session {
    pub id: SessionId,
    pub name: String,
    pub board_id: Option<BoardId>,
    pub state: BTreeMap<String, Value>,
    pub tokens: Vec<Token>,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct Event {
    pub seq: u64,
    pub at: i64,
    pub kind: String,
    pub payload: Value,
    pub note: Option<String>,
}
```

事件类型：

```text
chat.say · chat.action · chat.roll
chat.narration · chat.ooc · chat.whisper
session.start · session.end · token.move · state.set · note · effect.apply
```

### 4.6 项目元数据

```rust
pub struct Manifest {
    pub kind: String,
    pub schema_version: String,
    pub name: String,
    pub version: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub theme_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct Theme {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub variables: BTreeMap<String, String>,
    pub created_at: i64,
    pub updated_at: i64,
}
```

---

## 5. 存储

### 5.1 文本真相源

项目本身是一个文件夹，文本文件是唯一真相源，SQLite 是可删除、可重建的索引。

```text
MyWorld.anvil/
├── manifest.json
├── themes/<uuid>.json
├── types/
│   ├── card_types.json
│   └── relation_kinds.json
├── cards/ab/<uuid>.json
├── relations/from/<card_uuid>.jsonl
├── boards/<uuid>.json
├── scenarios/<uuid>.json
├── sessions/<uuid>/
│   ├── session.json
│   └── events.jsonl
├── assets/images/<uuid>.<ext>
└── .anvil/index.db
```

### 5.2 SQLite 索引

- `.anvil/index.db`，FTS5（trigram tokenizer）
- 重建判断：`PRAGMA user_version` + mtime 比较
- **`values` 是保留字**，列名用 `values_json`

### 5.3 图片缓存

前端 `imageCache` 是模块级内存缓存。`read_image_data_url` 返回 base64 data URL。组件用 `useSyncExternalStore` 订阅。**关闭项目时清空**。

### 5.4 最近项目

`localStorage` 存 `anvil.recentProjects`（最多 10）和 `anvil.lastOpenPath`。**启动时尝试自动打开上次项目**。主动关闭项目清 `lastOpenPath`。

---

## 6. 技术架构

### 6.1 技术栈

| 层 | 选型 |
|---|---|
| 壳 | Tauri 2.x |
| 后端 | Rust |
| 持久化 | 文本文件 + SQLite 索引 |
| 全文检索 | SQLite FTS5（trigram） |
| 表达式求值 | evalexpr |
| 资源包 | zip + walkdir |
| 前端 | React + TypeScript + Vite |
| 状态 | Zustand（slice 模式） |
| 节点图 | React Flow |
| 拖拽排序 | @dnd-kit |
| 力导向布局 | d3-force |
| 包管理器 | pnpm |

### 6.2 目录结构

```text
anvil/
├── src-tauri/src/
│   ├── core/
│   │   ├── model/          # 数据模型
│   │   ├── store/          # 文本文件读写 + 索引 + 资源包
│   │   ├── index/          # SQLite 索引 + FTS
│   │   ├── eval/           # 条件求值
│   │   ├── util.rs
│   │   └── ipc/            # Tauri 命令
│   └── lib.rs
├── src/
│   ├── core/
│   │   ├── ipc/            # 类型 + invoke 封装
│   │   └── use*.ts         # 打开/创建/导入/导出 hook
│   ├── lib/                # id / time / theme / imageCache / commands
│   ├── hooks/              # useDraft / useKeyboard / useDeleteUndo
│   ├── components/         # Modal / Toolbar / CardFrame / CommandPalette
│   ├── shell/              # AppShell / TopBar / LeftNav / Workspace / Inspector / StatusBar
│   ├── features/
│   │   ├── cards/          # ★ 共享核心
│   │   ├── world/          # 图谱
│   │   ├── story/          # 剧情（节点图 + 运行）
│   │   ├── board/          # 棋盘
│   │   ├── session/        # 跑团
│   │   ├── project/        # 项目设置 / 主题 / 合并
│   │   └── commands/       # 命令注册
│   └── stores/
│       ├── projectStore.ts # 组合 slices
│       └── slices/         # 按领域拆分的 Zustand slice
└── package.json
```

### 6.3 通信约定

- 命令：`invoke`
- 前端不裸调 `invoke`，统一走 `lib/ipc.ts`
- Rust snake_case → 前端 camelCase，Tauri 2 自动转换

---

## 7. 条件求值与效果

### 7.1 条件

`Relation.meta.condition` 是字符串表达式，用 `evalexpr` 求值。

```text
visited_anvil == true
gold >= 100
has_key && !door_locked
race == "矮人"
```

### 7.2 效果

`Relation.meta.effects` 是字符串数组：

```text
visited_tavern = true
gold -= 5
san -= 1d3
```

三种操作符：`=` / `+=` / `-=`。

**骰子支持**：`1d3` / `2d6+3` / `1d20-2`。前端本地随机，执行时记录明细。运行视图在场景卡片下方显示。

**效果写入事件日志**：当有会话打开时，效果执行会写入 `effect.apply` 事件。

---

## 8. 主界面

五段布局：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 顶栏：项目 · 打开/新建/导入/合并 · 刷新 · 导出 · 撤销/重做 · 设置     │
├────────────┬──────────────────────────────────────┬──────────────────┤
│            │                                      │                  │
│  左侧导航   │           中间工作区                  │   右侧检查器      │
│            │                                      │                  │
│  世界观     │   卡片墙（卡牌/列表视图）              │   types 模块：   │
│    ├ 卡片   │   图谱（CardFrame 节点 + 连线）        │     卡框预览      │
│    └ 图谱   │   剧情（设置/节点图/运行）             │                  │
│  分支故事   │   棋盘（HTML + 缩放 + 背景 + 加卡）    │   其他模块：      │
│  棋盘       │   跑团（舞台 + 对话流 + 角色列表）     │     卡片编辑      │
│  跑团       │   类型（字段/卡框 tab）               │     边编辑        │
│  类型       │                                      │     Token 编辑    │
│            │                                      │                  │
├────────────┴──────────────────────────────────────┴──────────────────┤
│ 底栏：卡牌数 · 类型数 · 撤销/重做数 · 保存中 · 项目路径              │
└──────────────────────────────────────────────────────────────────────┘
```

**检查器统一编辑**：

- types 模块 + 选中卡牌类型 → 卡框预览
- 点卡片 → 卡片编辑（含关系面板）
- 点边 → 边编辑
- 点 token → Token 编辑
- 三者互斥

**可拖拽宽度**（默认 320），**可折叠**成 28px 竖条。

---

## 9. 图谱

**节点渲染**：`CardFrame small`（140×205）。

**布局**：d3-force。

| 力 | 参数 |
|---|---|
| `forceLink` | distance 220, strength 0.5 |
| `forceManyBody` | strength -600 |
| `forceCenter` | (0,0) |
| `forceCollide` | radius 150 |
| `forceX` / `forceY` | isolated 0.12, 其它 0.02 |

**孤立节点**：少时收拢；多（>8）时排网格放右侧。

**交互**：拖拽节点、缩放、平移、拖拽连线、点击节点/边、搜索过滤。

**位置不持久化**。

---

## 10. 棋盘

**HTML 层渲染**：

- 外层滚动容器 + 内层等比缩放 div
- 背景图 + 网格（SVG 透明层）+ Token（HTML 绝对定位）
- Token 用 `CardFrame small`

**交互**：

- 拖拽 token：位置跟手，被拖的自动提到最前
- **Ctrl/Cmd + 滚轮缩放**：0.25× – 4×
- **Alt + 拖拽旋转**：Shift 吸附 15°
- 多选：Ctrl/Cmd 点击加入集合，拖动任意一个带动全部

**工具栏**：名称、网格开关、吸附开关、格大小、宽高、背景、加卡、缩放、批量操作。

---

## 11. 跑团

**布局**：

```text
┌───────────────────────────────────────────────────────────┐
│ 会话名 · 战场选择                                          │
├───────────────────────────────┬───────────────────────────┤
│                               │                           │
│      舞台（棋盘 HTML）         │    在场角色（列表）         │
│                               │    ⬤ 铁匠布洛克            │
│                               │    ⬤ 学徒格蕾塔            │
│                               │                           │
├───────────────────────────────┴───────────────────────────┤
│ 对话流（消息列表）                                          │
├───────────────────────────────────────────────────────────┤
│ 角色选择 · 说/做/掷/旁白/场外/私聊 · 输入框               │
└───────────────────────────────────────────────────────────┘
```

**角色列表**：列表形式（圆形首字头像 + 名字 + 类型）。

**联动**：角色列表、棋盘 token、检查器共用 `selectedTokenId`。

**消息样式**：say / action / roll / narration / ooc / whisper。

**编辑**：hover 消息 → 编辑 / 删除按钮。

**对话区高度可拖拽调整**。

**存储**：消息写入 `events.jsonl`。

---

## 12. TCG 卡牌

**游戏王风格**（`CardFrameYuGiOh`）：

- 金属渐变外框
- 标题栏用 CardType 颜色
- 图像区（有图显示图，无图显示首字）
- 等级星、类型行、描述框
- ATK / DEF / HP 右下角

**尺寸**：small 140×205 · medium 190×280 · large 260×385

**正文字体**：small 7 · medium 9 · large 11，行高 1.3。

**描述框**：底部渐隐 + `title` 属性（鼠标悬浮显示完整正文）。

**标签自定义**：`atk_label` / `def_label` / `hp_label` / `level_label`。

**`ScaledCardFrame`**：按容器宽度等比缩放。

**渲染统一**：卡片墙、图谱节点、棋盘 token、跑团角色面板、检查器预览都走 `CardFrame`。

---

## 13. 资源包

### 13.1 导出

```text
world.anvilpack (zip)
├── manifest.json
├── themes/ · types/ · cards/ · relations/
├── boards/ · scenarios/ · sessions/ · assets/
```

### 13.2 导入（覆盖式）

选包 → 选目标目录 → 解压 → 自动打开。

### 13.3 合并

把另一个包合并进**当前打开的项目**。类型映射、只导类型、选择性导入、字段合并。ID 都是 UUID 不撞。

---

## 14. 撤销 / 重做 / 自动保存

**撤销栈**：内存中，上限 100 条，关项目清空。

**自动保存**：`useDraft` 监听 draft 变化，800ms 落盘。

**快捷键**：`Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+S` / `Ctrl+K` / `Ctrl+1..5`

**批量操作进撤销栈**：删除卡片、关系、token、剧情、棋盘、会话、类型都支持撤销。

---

## 15. 命令面板

`Ctrl+K` 打开。命令来源：导航、项目操作、编辑、快速打开卡牌。

---

## 16. 主题系统

**CSS 变量**：`src/index.css` 的 `:root`。`theme.ts` 是 JS 侧镜像。

**项目级主题**：`themes/<uuid>.json` 存 `variables`。项目设置 → 主题 tab。`Manifest.theme_id` 记录。

---

## 17. 最近项目

- `localStorage` 存 `anvil.recentProjects`（最多 10）和 `anvil.lastOpenPath`
- 空状态显示最近项目列表
- 启动时尝试自动打开上次项目
- 主动关闭项目清 `lastOpenPath`

---

## 18. 里程碑

**M1 — 卡牌核心** ✅
**M2 — 关系与图谱** ✅
**M3 — 分支故事** ✅
**M4 — 棋盘与跑团** ✅
**M5 — 分享与扩展** ✅

**M6 — 打磨与生态** 🚧

已完成：CardFrame 视觉统一、检查器联动、最近项目、棋盘缩放/背景/旋转、卡框标签自定义、图谱连线、无向关系显示、效果支持骰子、场景对白直接显示、字段拖拽排序、批量选择、投骰日志、撤销覆盖 bulk、图片资源管理、数据统计。

待做：见下一节。

---

## 19. 待办清单

按优先级：

**P0（核心体验）**

1. ~~投骰/效果写入事件日志~~ ✅
2. ~~撤销覆盖 bulk 操作~~ ✅
3. ~~图片资源管理 + 数据统计~~ ✅

**P1（体验升级）**

4. 内置主题（Anvil Light / Parchment / High Contrast / Slate）
5. Session.state 与 Scenario.variables 互通
6. 多风格卡框（minimal / mtg / pokemon）
7. 卡框颜色参数化
8. 应用设置面板

**P2（提升与优化）**

9. 闪卡效果（foil）
10. 时间线功能
11. 导入合并的 schema 版本迁移
12. 图片缩略图
13. 命令面板性能
14. 图谱节点位置持久化
15. 文件监听（notify）

**P3（长期）**

16. Session 提交回原卡
17. 场景卡强制约束
18. 受限插件系统

---

## 20. 明确不做的事

- 不做多人联机
- 不做规则引擎
- 不做 VTT 级别的自动化
- 不做账号系统
- 不做 Web 服务端
- 不做完全无 SQLite 的纯文件系统

---

## 21. 设计原则

1. **数据 > 视图。** 先想清楚数据模型，再想 UI。
2. **文本真相源 > 二进制锁定。** 项目可用 git 管理，SQLite 只是索引。
3. **边界清晰 > 功能快。** `features/cards/` 是共享核心，任何功能不得绕过它私建卡模型。
4. **格式稳定 > 内部优雅。** 资源包一旦发布，破坏性修改要有迁移路径。
5. **本地优先。** 不引入网络依赖就能完整工作。
6. **可读的开源项目。** 命名清晰，注释写「为什么」而不是「是什么」。
7. **内置模块 > 插件。** 四大功能是产品本身，插件只做受限扩展。
8. **高频操作不过 IPC。** 棋盘拖拽、节点图移动在前端内存跑。
9. **颜色走 CSS 变量。**
10. **每个领域一个文件。**
11. **边有归属。** 世界观边和剧情边严格分离。
12. **场景是故事的基本单位。**
13. **视觉一致。** 卡牌渲染统一走 `CardFrame`。
14. **状态单一来源。** 选中态走 store。
15. **无向关系对等显示。**
16. **输入密集处不挂 HTML5 DnD。** 用 Pointer Events。

