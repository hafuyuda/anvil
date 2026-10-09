# Anvil 设计文档

版本 0.12 · 单人创作工具 · 桌面优先 · 开源

> 本文档反映当前实现。M1–M6 完成，M6.5 视觉小说与卡牌扩展进行中。

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
┌──────────────────────────────────────────────────┐
│  类型层 (Schema)                                  │
│  CardType · FieldDef · RelationKind · VariableDef │
├──────────────────────────────────────────────────┤
│  实例层 (Project)                                 │
│  Card · Relation · Board · Scenario · CardGroup  │
│  Theme                                            │
├──────────────────────────────────────────────────┤
│  运行层 (Runtime)                                 │
│  Session · Token · Event                         │
└──────────────────────────────────────────────────┘
```

### 3.2 三条铁律

1. **卡牌是唯一内容实体单位。** 世界观 NPC、剧情节点、棋盘角色都是卡。Board、Scenario、Session 是容器。
2. **关系是一等公民。** 卡与卡之间的边独立存储，与卡片字段分离。
3. **跑团不写回原始卡。** 运行时修改的是 Token（副本），Card 保持不变。

### 3.3 四大功能的统一

| 功能     | 数据来源                            | 主要视图                 | 运行时          |
| -------- | ----------------------------------- | ------------------------ | --------------- |
| 世界观   | Card + Relation                     | 卡片墙 / 图谱 / 时间线   | 无              |
| 分支故事 | Card + Relation（条件边）+ Scenario | 节点图 / 运行视图        | 条件求值 + 效果 |
| 棋盘     | Card + Token + Board                | HTML 画布                | 坐标与状态      |
| 跑团     | Card + Session + Token              | 舞台 + 对话流 + 角色列表 | 事件日志        |

**CardGroup** 是辅助索引，服务于「管理一组卡」和「批量铺开」，不属于四大功能之一。

**CardPile** 是 Token 的变体，在棋盘上以堆叠形式存在，支持抽牌与洗牌。

### 3.4 场景卡

剧情图的节点推荐用「场景」CardType，而不是角色或地点：

- 故事从场景出发，不从人物出发
- 同一地点可发生多场戏
- 场景卡字段：时间、地点、参与者、氛围、描述、对白

场景卡是**约定**，不强制。

### 3.5 边的分类

- **世界观边**：无 `scenario_id`。关系面板显示。
- **剧情边**：有 `scenario_id`。只在该剧情的节点图显示。

**无向关系**（`directed: false`）两侧都显示在「本卡参与」，用 `⇄` 连接符。

关系名的展示：

- 有向边，当前卡是 from → `[对方卡名] 的 [kind.name]`
- 有向边，当前卡是 to → `[对方卡名] 的 [kind.inverse_name]`
- 无向边 → 永远用 `kind.name`

### 3.6 分支故事 = 视觉小说工具

「分支故事」模块服务于**视觉小说 / 互动叙事**的作者，不是跑团工具。

- 节点是**场景**，边是**剧情转移**
- 条件、变量、效果是剧情状态的表达
- 「运行」tab 是作者的**试玩 / 预览**
- 可以导出为 Markdown（可读剧本）和 HTML（静态阅读器）

**和跑团完全独立：**

- 不绑定 Session
- 不写跑团事件日志
- `Scenario.variables` 和 `Session.state` 是两套东西
- 两者共享 Card 数据，但运行时不互相操作

**HTML 导出是「导出格式」，不是「游戏引擎」：**

- 支持：文本、立绘、背景、点击推进、选择、条件、打字机
- 不支持：动画、转场、音效播放、存档、成就、打包 EXE / APK
- 想要完整演出，请把剧本导入 Ren'Py 或 Godot

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
    pub card_back: Option<String>,
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

pub struct CropRect {
    pub x: f64,  // 0–1，从左边起
    pub y: f64,  // 0–1，从上边起
    pub w: f64,  // 0–1，占原图宽度的比例
    pub h: f64,  // 0–1，占原图高度的比例
}

pub struct ImageExtend {
    pub top: f64,     // 0–2，相对图像区高度的比例
    pub bottom: f64,
    pub left: f64,    // 0–2，相对图像区宽度的比例
    pub right: f64,
}

pub struct CardFrameConfig {
    pub style: Option<String>,   // "yugioh" | "generic" | "minimal" | "mtg" | "pokemon"
    pub title: Option<String>,
    pub subtitle: Option<String>,
    pub image: Option<String>,
    pub image_crop: Option<CropRect>,
    pub image_extend: Option<ImageExtend>,
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
    pub foil_field: Option<String>,
    pub foil_values: Vec<String>,
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
- `style` 为空时走默认（yugioh），合法值见 `CardFrameStyle`
- 只设 `style` 不设字段映射是合法状态：走启发式映射 + 指定风格的皮
- `image_crop` / `image_extend` 为空时不做裁剪、不出框
- `foil_field` / `foil_values` 为空时不触发闪卡

### 4.2 实例层

```rust
pub struct Card {
    pub id: CardId,           // UUID v4
    pub type_id: TypeId,
    pub name: String,
    pub values: BTreeMap<String, Value>,
    pub image_crop_override: Option<CropRect>,
    pub image_extend_override: Option<ImageExtend>,
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

| 键            | 类型     | 说明               |
| ------------- | -------- | ------------------ |
| `condition`   | string   | 剧情边的条件表达式 |
| `effects`     | string[] | 剧情边的效果指令   |
| `scenario_id` | string   | 剧情边归属         |

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
    pub show_relations: bool,
    pub visible_relation_kinds: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct GridConfig {
    pub size: f64,
    pub offset_x: f64,
    pub offset_y: f64,
    pub visible: bool,
    pub snap: bool,
    pub shape: String,   // "square" | "dots" | "horizontal" | "vertical"
}

pub struct PileData {
    pub group_id: String,        // 来源卡组 ID
    pub label: String,           // 显示名
    pub remaining: Vec<CardId>,  // 还没抽出的卡，头部 = 下一张
    pub initial: Vec<CardId>,    // 初始完整列表，用于重置
    pub total: usize,            // 初始总张数
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
    pub face_down: bool,
    pub pile: Option<PileData>,  // Some 时此 token 是卡盒
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
    pub default_card_back: Option<String>,
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

### 4.7 卡组

卡组是**卡 ID 的有序引用列表**。不拥有卡，多对多，顺序即铺开顺序。

```rust
pub struct CardGroup {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub card_ids: Vec<CardId>,   // 有序
    pub created_at: i64,
    pub updated_at: i64,
}
```

约束：

- 卡组只是引用，删卡组不影响卡
- 删卡时同步从所有卡组里移除该卡 ID
- 卡组的 `card_ids` 顺序就是棋盘导入时的铺开顺序
- 不做快照、不做类型区分

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
├── card_groups/<uuid>.json
├── sessions/<uuid>/
│   ├── session.json
│   └── events.jsonl
├── scripts/<card_uuid>.md
├── assets/
│   ├── images/<uuid>.<ext>
│   └── audio/<uuid>.<ext>
└── .anvil/index.db
```

### 5.2 SQLite 索引

- `.anvil/index.db`，FTS5（trigram tokenizer）
- 重建判断：`PRAGMA user_version` + mtime 比较
- **`values` 是保留字**，列名用 `values_json`

### 5.3 图片缓存

前端 `imageCache` 是模块级内存缓存。`read_image_data_url` 返回 base64 data URL。组件用 `useSyncExternalStore` 订阅。**关闭项目时清空**。

### 5.4 音频资源

音频走 **Tauri asset protocol**，不走 base64。

- `open_project` 命令动态 `allow_directory` 项目根目录，`close_project` 时 `forbid_directory`
- `audioAbsPath` IPC 返回绝对路径，前端 `convertFileSrc` 转成 `asset://` URL
- WebView 直接从磁盘读，不经过 IPC，不进 JS 堆
- 前端 `audioCache` 只缓存路径 → URL 的映射，关闭项目时清空

### 5.5 最近项目

`localStorage` 存 `anvil.recentProjects`（上限读应用设置）和 `anvil.lastOpenPath`。**启动时尝试自动打开上次项目**。主动关闭项目清 `lastOpenPath`。

---

## 6. 技术架构

### 6.1 技术栈

| 层         | 选型                      |
| ---------- | ------------------------- |
| 壳         | Tauri 2.x                 |
| 后端       | Rust                      |
| 持久化     | 文本文件 + SQLite 索引    |
| 全文检索   | SQLite FTS5（trigram）    |
| 表达式求值 | evalexpr                  |
| 资源包     | zip + walkdir             |
| 前端       | React + TypeScript + Vite |
| 状态       | Zustand（slice 模式）     |
| 节点图     | React Flow                |
| 拖拽排序   | @dnd-kit                  |
| 力导向布局 | d3-force                  |
| 包管理器   | pnpm                      |

### 6.2 目录结构

```text
anvil/
├── src-tauri/
│   ├── assets/
│   │   └── example_world.anvilpack   # 内置示例世界（编译嵌入）
│   └── src/
│       ├── core/
│       │   ├── model/       # 数据模型
│       │   ├── store/       # 文本文件读写 + 索引 + 资源包
│       │   │   ├── seed.rs  # 从内置 pack 解压示例世界
│       │   │   └── export_html.rs
│       │   ├── index/       # SQLite 索引 + FTS
│       │   ├── eval/        # 条件求值
│       │   └── ipc/         # Tauri 命令
│       └── lib.rs
├── src/
│   ├── core/                # IPC 类型与封装 + 项目级动作
│   │   ├── ipc/
│   │   └── use*.ts
│   ├── lib/                 # 通用工具
│   │   ├── id.ts · time.ts · theme.ts
│   │   ├── imageCache.ts · audioCache.ts
│   │   ├── toast.ts · confirm.ts · runWithError.ts
│   │   ├── dice.ts · appSettings.ts · commands.ts
│   │   └── recentProjects.ts · saveRegistry.ts
│   ├── hooks/               # 通用 hook
│   ├── components/          # 通用组件
│   │   ├── CardFrame/       # 卡牌渲染（5 风格 + 卡背 + 覆盖层）
│   │   ├── Modal.tsx · Toolbar.tsx · PickerDialog.tsx
│   │   ├── ToastHost.tsx · ConfirmHost.tsx
│   │   ├── HoverPreview.tsx · AudioSelect.tsx · ImageField.tsx
│   │   ├── SectionLabel.tsx · EmptyState.tsx
│   │   ├── Toggle.tsx · LabeledBlock.tsx
│   │   └── ...
│   ├── shell/               # 五段布局
│   ├── themes/              # 内置主题定义
│   ├── features/
│   │   ├── cards/           # ★ 共享核心
│   │   │   ├── card/ · card-type/ · card-wall/ · relation/
│   │   ├── card-groups/
│   │   ├── world/           # 只余卡片墙入口
│   │   ├── story/
│   │   │   ├── scenario/ · play/ · script/
│   │   │   └── effects.ts
│   │   ├── board/
│   │   ├── session/chat/
│   │   ├── project/
│   │   ├── app/
│   │   └── commands/
│   └── stores/
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

**骰子支持**：`1d3` / `2d6+3` / `1d20-2`。前端本地随机，执行时记录明细。

**骰子逻辑统一在 `src/lib/dice.ts`**：`rollDice` 掷骰，`validateDiceExpression` 只校验不掷。跑团、视觉小说效果、RollDialog 都调它。

**效果写入事件日志**：当有会话打开时，效果执行会写入 `effect.apply` 事件。

---

## 8. 错误处理与用户提示

**三层机制**：

**`lib/toast.ts` + `components/ToastHost.tsx`**

右下角非阻塞提示，3 秒自动消失。三种类型：`info` / `success` / `error`。

用于所有成功、失败、提示类消息。**不再用 `alert()`。**

**`lib/confirm.ts` + `components/ConfirmHost.tsx`**

异步自定义确认框，返回 `Promise<boolean>`。支持 `title` / `confirmLabel` / `cancelLabel` / `danger`。

```ts
if (!(await confirmDialog({ message: "删除？", danger: true }))) return;
```

**不再用 `window.confirm()`**（除了没挂 host 时的 fallback）。

**`lib/runWithError.ts`**

统一 try-catch 模式。失败时 toast 报错，返回 `{ ok, value }`。

```ts
const r = await runWithError(() => ipc.saveCard(next), "保存失败");
if (!r.ok) return;
```

**边界**：catch 里有额外清理（如 `removeRecentProject`）、有 `throw`、有 `finally` 时**不替换**，保留原 try-catch。

---

## 9. UI 小组件

重复样式抽成语义化组件：

| 组件                           | 用途                                        |
| ------------------------------ | ------------------------------------------- |
| `<SectionLabel variant="...">` | 区块小标题（三档：section / block / field） |
| `<EmptyState>`                 | 虚线框空状态                                |
| `<Toggle>`                     | checkbox + label                            |
| `<LabeledBlock>`               | SectionLabel + 内容包裹                     |

规则：

- **只抽高一致性、高频的样式**。差异大于共性时不抽
- **`Mono` 不抽**——绝大多数是 input 的 inline style，无法包裹
- **`LabeledInput` 不抽**——各处 gap / 内层元素差异大于共性
- **`Divider` 不抽**——常与 flex 布局耦合

---

## 10. 卡牌悬浮预览

**组件**：`components/HoverPreview.tsx`

**两种模式**：

- `position="follow-mouse"`（默认）：跟随鼠标右下，用于句子里的文本引用
- `position="anchor-right"`：锚定触发元素右侧，用于头像等固定锚点

**延迟**：200ms 进入 / 300ms 退出。**靠近视口边缘自动翻转**。

**挂载点**：

- 关系面板 → 对方卡名
- 会话消息 → 作者头像

**不做**：点击、pin、多浮层同时显示、跟随鼠标平滑移动。

---

## 11. 主界面

五段布局：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 顶栏：项目 · 打开/新建/导入/合并 · 刷新 · 导出 · 撤销/重做 · 应用设置 · 设置 │
├────────────┬──────────────────────────────────────┬──────────────────┤
│            │                                      │                  │
│  左侧导航   │           中间工作区                  │   右侧检查器      │
│            │                                      │                  │
│  世界观     │   卡片墙（卡牌/列表视图）              │   types 模块：   │
│  视觉小说   │   剧情（设置/节点图/剧本/运行）        │     卡框预览      │
│  棋盘       │   棋盘（HTML + 缩放 + 背景 + 卡盒）    │                  │
│  卡组       │   卡组（列表 + 编辑器）                │   其他模块：      │
│  跑团       │   跑团（舞台 + 对话流 + 角色列表）     │     卡片编辑      │
│  类型       │   类型（字段/卡框 tab）               │     边编辑        │
│            │                                      │     Token 编辑    │
│            │                                      │                  │
├────────────┴──────────────────────────────────────┴──────────────────┤
│ 底栏：卡牌数 · 类型数 · 撤销/重做数 · 保存中 · 项目路径              │
└──────────────────────────────────────────────────────────────────────┘
```

**世界观直接进入卡片墙**，不再有「卡片 / 图谱」子视图。

**检查器统一编辑**：

- types 模块 + 选中卡牌类型 → 卡框预览
- 点卡片 → 卡片编辑（含关系面板）
- 点边 → 边编辑
- 点 token → Token 编辑
- 三者互斥

**可拖拽宽度**（默认 320），**可折叠**成 28px 竖条。

---

## 12. 棋盘

**HTML 层渲染**：

- 外层滚动容器 + 内层等比缩放 div
- 背景图 + 网格（SVG 透明层）+ 关系线（SVG 层）+ Token（HTML 绝对定位）

**网格形状**：方格 / 点阵 / 横线 / 竖线，工具栏下拉切换。

**交互**：

- 拖拽 token：位置跟手，被拖的自动提到最前
- **Ctrl/Cmd + 滚轮缩放**：0.25× – 4×
- **Alt + 拖拽旋转**：Shift 吸附 15°
- 多选：Ctrl/Cmd 点击加入集合，拖动任意一个带动全部
- **双击 token**：翻转 `face_down`（显示卡背）
- **单击卡盒**：弹出抽牌面板

**关系线**：

- 只世界观边
- 工具栏「显示关系」开关，默认关闭
- 配置持久化到 Board（`show_relations` / `visible_relation_kinds`）
- **聚合**：同一对 token 之间的 >= 2 条关系合并为一条粗线 + 中央数字徽章
- 有向带箭头，无向不带；颜色用 `RelationKind.color`
- 线在 token 之下，不可交互
- 配置持久化到 Board

**工具栏**：名称、网格开关、吸附开关、格大小、网格形状、宽高、背景、从卡组导入、从卡组加卡盒、显示关系、关系过滤、加卡、加占位、缩放、批量操作。

**从卡组导入（铺开）**：

- 选卡组 → 选顺序（原序 / 随机）→ 网格铺开
- 网格：从左上角开始，8 列，每格 180×240
- 失效卡自动跳过
- **超出棋盘边界时自动扩充宽高**（+2 格留白）

**卡盒**：

- 从卡组生成，落为一个特殊 Token（`pile` 字段非空）
- 视觉：底卡背 + 双层错位叠影 + 右下角 `N / M` 徽章
- 单击 → 弹 `PileDrawDialog`：抽 1 / 抽 N / 洗牌 / 重置
- 抽出的牌扣着放在卡盒附近
- **放置算法**：从卡盒位置按「右 → 下 → 上 → 左」四方向探测，遇到已占位则继续外扩；四方向都满时叠在卡盒原地
- 抽牌 / 洗牌 / 重置进撤销栈
- 卡盒与源卡组解耦：卡组改了不影响已有卡盒
- **卡盒抽牌不扩充棋盘**（与从卡组导入的区别）

**占位 Token**：

- 工具栏「+ 占位」创建
- `card_id: null`，显示为灰色边框 + 名称
- 用于位置标记（如凯尔特十字的 10 个牌位）

**卡背**：

- 解析优先级：`Token.card_id` 所属类型的 `card_back` → `Manifest.default_card_back` → 内置图案
- 内置图案：双层菱形描边 + "Anvil" 字样
- 可被主题覆盖 `--card-back-*` 变量

**翻牌**：

- 双击 `face_down` 取反
- 检查器有「扣着」勾选框
- 卡盒不参与翻牌

**Token 属性**：

- 检查器有宽高比锁定按钮（🔒/🔓），纯 UI 状态，不持久化
- 锁定后改宽自动按比例改高，反之亦然

---

## 13. 跑团

**布局**：

```text
┌───────────────────────────────────────────────────────────┐
│ 会话名 · 战场选择                                          │
├───────────────────────────────┬───────────────────────────┤
│                               │                           │
│      舞台（棋盘 HTML）         │    在场角色（列表）         │
│                               │                           │
├───────────────────────────────┴───────────────────────────┤
│ 对话流（消息列表）                                          │
├───────────────────────────────────────────────────────────┤
│ 角色选择 · 说/做/掷/旁白/场外/私聊 · 输入框               │
└───────────────────────────────────────────────────────────┘
```

**角色列表**：列表形式（圆形首字头像 + 名字 + 类型）。

**悬停头像** → 显示该角色的卡牌悬浮预览。

**消息样式**：say / action / roll / narration / ooc / whisper。

**存储**：消息写入 `events.jsonl`。

**卡盒**：会话的 token 是 Board 的副本。会话里可以单击卡盒抽牌，**只影响会话副本，不动 Board**。

---

## 14. 卡牌渲染

**五风格，共用 mapping 与尺寸。** `CardFrame` 按优先级分派：

1. 显式传入的 `style` prop
2. `cardType.card_frame.style`
3. `DEFAULT_CARD_FRAME_STYLE`（yugioh）

| 风格   | key       | 视觉定位                                     |
| ------ | --------- | -------------------------------------------- |
| 游戏王 | `yugioh`  | 金属渐变外框 + 羊皮纸描述框 + 星号等级       |
| 通用   | `generic` | 深底细描边 + 顶部色条 + 底部属性行           |
| 极简   | `minimal` | 无外框 + 左竖条 + 大留白                     |
| 万智牌 | `mtg`     | 深色石质外框 + 顶部标题条 + 底部羊皮纸文字栏 |
| 宝可梦 | `pokemon` | 浅色圆角 + 顶部标题 + HP + 艺术图            |

**尺寸**：small 140×205 · medium 190×280 · large 260×385

**图像区**：

- 固定像素高（small 84 / medium 116 / large 160）
- 统一走 `CardImage` 组件
- **裁剪**：`image_crop` 类型级，`Card.image_crop_override` 卡级覆盖
- **出框**：`image_extend` 四方向独立数值（0–2 滑块），最多撑满内层
- 无图时显示类型色系首字

**颜色**：全部走 CSS 变量。类型级强调色 `CardType.color` 支持 hex 与 CSS 变量，推荐后者（随主题变化）。透明度与加深统一用 `color-mix()`。

**闪卡**：

- 类型级配置：`foil_field` 指定触发字段，`foil_values` 指定命中的值
- 支持的字段类型：字符串、数字、布尔、数组
- 渲染：`FoilOverlay` 覆盖层，暗金基色 + 斜向流光 + 边缘描边
- 需视图层显式启用：`<CardFrame foil={true} />`
- 卡片墙和检查器预览启用，图谱 / 棋盘 / 跑团不启用

**卡背**：`CardBack` 组件。三层优先级。

**渲染统一**：卡片墙、棋盘 token、跑团角色面板、检查器预览都走 `CardFrame`。

**`ScaledCardFrame`**：按容器宽度等比缩放。

---

## 15. 剧本与导出

### 15.1 剧本格式

Markdown。语法：

```text
> 文本              → 旁白
**说话人**（表情）：文本 → 对白
*文本*              → 动作
@bg 路径            → 背景切换
@bgm 路径           → 音乐切换
@sfx 路径           → 音效
```

frontmatter（`---` 包围）可写：`bg` / `bgm` / `is_ending` / `ending_name`。

### 15.2 剧本编辑器

双 tab：

- **结构**（默认）：行卡片列表，每行一个类型选择器 + 对应字段。支持拖拽排序，回车新建下一行（类型延续）
- **源码**：textarea 直接编辑 Markdown + 右侧解析预览

顶部固定场景设置区：背景（图片选择器）、音乐（音频选择器）、结局标记、结局名。

结构视图行内：

- 对白行：说话人 + 表情 + 内容
- 音效行：`AudioSelect` 音频选择器
- 背景行：图片路径文本（暂无选择器）

数据流：`content` 是唯一真源。结构视图解析 → 编辑 → 序列化回 `content` → 800ms 自动保存到 `scripts/<card_id>.md`。

### 15.3 导出 Markdown

场景 → 导出按钮 → 保存对话框 → `剧情名-剧本.md`。

输出结构：

- 标题 + 简介
- 变量列表
- 按 DFS 顺序编号的场景
- 每个场景：元信息 + 剧本内容 + 分支列表

### 15.4 导出 HTML

单文件 HTML，图片 base64 内嵌，音频不导出。目标：

- 支持：文本、立绘、背景、点击推进、选择、条件、打字机、结局、重玩
- 不支持：动画、转场、音效播放、存档、成就

技术要点：

- Rust 侧生成 JSON 数据 + 内嵌 HTML 模板
- 内嵌约 300 行 JS 运行时（求值器、效果执行、打字机、分支、结局）
- 固定中性深色主题，不跟随项目主题

---

## 16. 音频资源

**用途**：仅视觉小说运行（bgm 播放 + sfx 触发）。不做卡片字段、不做跑团环境音。

**目录**：`assets/audio/<uuid>.<ext>`

**格式**：mp3 / ogg / wav / m4a。

**传输**：Tauri asset protocol，不走 base64（见 5.4）。

**UI 组件**：

- `AudioSelect`：下拉 + 导入 + 试听 + 清除
- 用在剧本场景设置（bgm）和结构视图的 sfx 行

**运行播放**：

- `useSceneAudio` 处理
- bgm 循环播放，跨行保持，只有显式 `@bgm` 或新场景 frontmatter 时才切换
- sfx 单次播放，`lineIndex` 变化时触发当前行的音效列表
- 淡入淡出 150ms
- 组件卸载时停止

**音频库管理**：`项目设置 → 音频资源` tab。列表显示文件名、大小、时长、引用数。支持导入 / 删除 / 试听。

---

## 17. 资源包

### 17.1 导出

```text
world.anvilpack (zip)
├── manifest.json
├── themes/ · types/ · cards/ · relations/
├── boards/ · scenarios/ · sessions/ · card_groups/
└── assets/
    ├── images/
    └── audio/
```

### 17.2 导入（覆盖式）

选包 → 选目标目录 → 解压 → 自动打开。

### 17.3 合并

把另一个包合并进**当前打开的项目**。类型映射、只导类型、选择性导入、字段合并。ID 都是 UUID 不撞。

合并规则：

- **卡牌类型**：字段逐 key 合并。本地无卡背时用对方的。卡框的裁剪 / 出框在双方都有 `card_frame` 时逐项合并
- **关系类型**：ID 映射表，同名可选映射到现有
- **卡片**：仅在类型映射非 Skip 且卡 ID 不冲突时导入
- **关系**：仅在 from / to 都已导入时导入
- **剧情 / 棋盘 / 会话**：选择性导入，ID 冲突跳过
- **卡组**：保留原 ID，卡组内引用只保留本次导入的卡，空卡组跳过
- **图片 / 音频**：同名跳过，不同名复制
- **Manifest**：目标项目的元数据不被覆盖

### 17.4 内置示例世界

`src-tauri/assets/example_world.anvilpack`，编译时通过 `include_bytes!` 嵌入。

「载入示例世界」命令：解压 pack 到当前项目根（跳过 `manifest.json`），重建索引。

内容：

- 6 个类型（角色 / 地点 / 物品 / 组织 / 事件 / 场景）
- 30 张卡
- 5 个关系类型 + 22 条关系
- 3 个卡组
- 1 个剧情「失踪的学徒」，5 个场景完整剧本，含背景音乐和音效
- 2 个棋盘（铁砧堡广场含卡盒 / 深铁矿洞 · 岔道含占位 token + 关系线）
- 1 个会话「炉边夜话」
- 4 张 SVG 背景图

覆盖 5 种卡框风格、闪卡、卡背、卡盒、翻牌、剧本结构化编辑器、音频选择器。

---

## 18. 撤销 / 重做 / 自动保存

**撤销栈**：内存中，上限 100 条，关项目清空。

**自动保存**：`useDraft` 监听 draft 变化，默认 800ms 落盘（延迟可在应用设置里改）。

**快捷键**：`Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+S` / `Ctrl+K` / `Ctrl+1..5`

**批量操作进撤销栈**：删除卡片、关系、token、剧情、棋盘、会话、类型、卡组都支持撤销。卡盒抽牌 / 洗牌 / 重置也支持。

---

## 19. 命令面板

`Ctrl+K` 打开。命令来源：导航、项目操作、编辑、快速打开卡牌。

---

## 20. 主题系统

**CSS 变量**：`src/index.css` 的 `:root`。`theme.ts` 是 JS 侧镜像。

**项目级主题**：`themes/<uuid>.json` 存 `variables`。项目设置 → 主题 tab。`Manifest.theme_id` 记录。

**内置主题**：Anvil Dark / Anvil Light / Parchment / High Contrast / Slate。

**所有视觉变量都可被主题覆盖**：

- 背景 / 文字 / 边框 / 强调色 / 语义色
- 卡牌：`--card-frame-default-accent`、`--card-yugioh-*`、`--card-generic-*`、`--card-minimal-*`、`--card-mtg-*`、`--card-pokemon-*`
- 卡背：`--card-back-*`
- 对话气泡：`--chat-*`（全部派生自主变量）
- 主按钮：派生自 `--accent-copper`

**原则**：不硬编码颜色。

---

## 21. 应用设置

跨项目偏好，存 `localStorage`（`anvil.appSettings`）。TopBar 独立入口。

| 键                      | 默认       | 说明                    |
| ----------------------- | ---------- | ----------------------- |
| `defaultCardFrameStyle` | `"yugioh"` | 新建卡牌类型时用        |
| `typewriterSpeed`       | `35`       | 毫秒 / 字               |
| `typewriterEnabled`     | `true`     | 全局开关                |
| `typewriterNarration`   | `false`    | 旁白是否也打字机        |
| `autoSaveDelayMs`       | `800`      | `useDraft` 自动保存延迟 |
| `recentProjectsMax`     | `10`       | 最近项目记录上限        |
| `fontScale`             | `1.0`      | 界面缩放，0.75–1.5      |

**界面缩放**：`#root` 上的 CSS `zoom`。Chromium 生效。

**响应式**：`useAppSettings` 基于 `useSyncExternalStore`。

---

## 22. 里程碑

**M1 — 卡牌核心** ✅
**M2 — 关系与图谱** ✅
**M3 — 分支故事** ✅
**M4 — 棋盘与跑团** ✅
**M5 — 分享与扩展** ✅

**M6 — 打磨与生态** ✅

已完成：CardFrame 视觉统一、检查器联动、最近项目、棋盘缩放/背景/旋转、卡框标签自定义、无向关系显示、效果支持骰子、场景对白直接显示、字段拖拽排序、批量选择、投骰日志、撤销覆盖 bulk、图片资源管理、数据统计、内置主题、多风格卡框、卡框强调色参数化、应用设置面板、目录结构整理、卡组功能、闪卡、卡背、翻牌、卡盒抽牌、骰子重构、类型复制、卡图裁剪、卡图出框、占位 Token、大文件拆分、音频资源管理、卡牌悬浮预览、seed 重构（内置 pack）、错误处理统一（toast / confirm / runWithError）、UI 小组件抽取、网格形状、界面缩放。

**M6.5 — 视觉小说** ✅

已完成：阅读器（打字机 / 背景切换 / 结局标记）、剧本结构化编辑器、剧本行拖拽排序、立绘多表情、剧本解析与序列化、导出 Markdown、导出 HTML、bgm / sfx 播放。

---

## 23. 待办清单

**P2（提升与优化）**

- [ ] 时间线视图
- [ ] 导入合并的 schema 版本迁移
- [ ] 图片缩略图
- [ ] 命令面板性能
- [ ] 文件监听（notify）
- [ ] 卡组同步到棋盘（只补不删，看实际需要）
- [ ] 位置单元（Cell）——命名位置 + 吸附布局
- [ ] 闪卡扩展（银箔 / 全息 / 鼠标跟随）
- [ ] 第二种卡背风格

**技术债（顺手改）**

- [ ] 内联样式 → 组件（`SectionLabel` / `EmptyState` / `Toggle`）长尾替换
- [ ] `LabeledInput` 差异较大，暂不抽

**P3（长期）**

- [ ] Session 提交回原卡
- [ ] 场景卡强制约束
- [ ] 受限插件系统
- [ ] Ren'Py 脚本导出

---

## 24. 明确不做的事

- 不做多人联机
- 不做规则引擎
- 不做 VTT 级别的自动化
- 不做账号系统
- 不做 Web 服务端
- 不做完全无 SQLite 的纯文件系统
- 不做视觉小说的完整演出引擎（动画、转场、音频导出、存档、打包 EXE）
- 不做 TCG 卡组（对战用）

---

## 25. 设计原则

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
17. **引用是快照，不自动同步。**
18. **一次性逻辑不拆。** `seed.rs` 这类特殊文件保持整块。
19. **大文件优先拆组件，不拆数据。** 目标：单文件 400 行内可读。
20. **子组件放同一 feature 目录，不进 `components/`。** `components/` 只放跨 feature 通用组件。
21. **对话框的 `onClose` 用 ref 稳定。** 避免 effect 重跑冲掉用户编辑。
22. **结构化编辑器是创作工具的主视图。**
23. **弹窗统一。** `alert` → `toast`，`confirm` → `confirmDialog`，`try-catch` → `runWithError`。
24. **高频重复样式抽成语义组件。** 差异大于共性时不抽。
25. **音频走 asset protocol。** 不走 base64，不进 JS 堆。
