# Anvil 设计文档

版本 0.14 · 单人创作工具 · 桌面优先 · 开源

> 本文档反映当前实现。M1–M6 完成，M6.5 视觉小说与卡牌扩展已收尾。0.3.0 正在开发。

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

**窗口**：无边框。`tauri-plugin-frame` 提供窗口按钮，与 Anvil 配色统一。支持 Windows 11 Snap Layout。

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
│  Session · Token · Event                          │
└──────────────────────────────────────────────────┘
```

### 3.2 三条铁律

1. **卡牌是唯一内容实体单位。** 世界观 NPC、剧情节点、棋盘角色都是卡。Board、Scenario、Session 是容器。
2. **关系是一等公民。** 卡与卡之间的边独立存储，与卡片字段分离。
3. **跑团不写回原始卡。** 运行时修改的是 Token（副本），Card 保持不变。

### 3.3 四大功能的统一

| 功能     | 数据来源                        | 主要视图                 | 运行时          |
| -------- | ------------------------------- | ------------------------ | --------------- |
| 世界观   | Card + Relation                 | 卡片墙                   | 无              |
| 分支故事 | Card + Scenario（内联逻辑剧本） | 场景 tab + 剧本编辑器    | 条件求值 + 赋值 |
| 棋盘     | Card + Token + Board            | HTML 画布                | 坐标与状态      |
| 跑团     | Card + Session + Token          | 舞台 + 对话流 + 角色列表 | 事件日志        |

**CardGroup** 是辅助索引，服务于「管理一组卡」和「批量铺开」，不属于四大功能之一。
`card_ids` 是有序多重集，同一张卡可以出现多次（对应棋盘上摆 N 个 token）。

**CardPile** 是 Token 的变体，在棋盘上以堆叠形式存在，支持抽牌与洗牌。

### 3.4 场景卡

剧情图的节点推荐用「场景」CardType，而不是角色或地点：

- 故事从场景出发，不从人物出发
- 同一地点可发生多场戏
- 场景卡字段：时间、地点、参与者、氛围、描述、对白

场景卡是**约定**，不强制。

### 3.5 边的分类

- **世界观边**：关系面板和棋盘关系线显示。（剧情分支已内联到剧本语言，
  剧情边已删除。）

**无向关系**（`directed: false`）两侧对等显示。

关系名展示：

- 有向边，当前卡是 from → `[对方卡名] 的 [kind.name]`
- 有向边，当前卡是 to → `[对方卡名] 的 [kind.inverse_name]`
- 无向边 → 永远用 `kind.name`

### 3.6 分支故事 = 视觉小说工具

「分支故事」模块服务于**视觉小说 / 互动叙事**的作者，不是跑团工具。

- 节点是**场景**，边是**剧情转移**
- 条件、变量、效果是剧情状态的表达
- 「运行」是作者的**试玩 / 预览**，全屏浮层
- 可以导出为 Markdown（可读剧本）和 HTML（静态阅读器）

**和跑团完全独立：**

- 不绑定 Session
- 不写跑团事件日志
- `Scenario.variables` 和 `Session.state` 是两套东西
- 两者共享 Card 数据，但运行时不互相操作

**HTML 导出是「导出格式」，不是「游戏引擎」：**

- 支持：文本、背景图、点击推进、选择、条件、效果、骰子、打字机、结局、重玩
- 不支持：立绘渲染、动画、转场、音频播放、存档、成就、打包 EXE / APK
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
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

pub struct CardFrameConfig {
    #[serde(default)]
    pub style: Option<String>,
    /// 槽位绑定：slot_key → SlotBinding。
    #[serde(default)]
    pub bindings: BTreeMap<String, SlotBinding>,
    #[serde(default)]
    pub foil_field: Option<String>,
    #[serde(default)]
    pub foil_values: Vec<String>,
    #[serde(default)]
    pub foil_style: Option<String>,
    #[serde(default)]
    pub image_crop: Option<CropRect>,
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
- `style` 为空时走默认（yugioh）
- `image_crop` 为空时不做裁剪
- `foil_field` / `foil_values` 为空时不触发闪卡
- `foil_style` 为空时走默认（gold）

### 4.2 实例层

```rust
pub struct Card {
    pub id: CardId,
    pub type_id: TypeId,
    pub name: String,
    pub values: BTreeMap<String, Value>,
    pub image_crop_override: Option<CropRect>,
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

`Relation.meta` 里约定的键：剧情分支逻辑（condition / effects /
scenario_id）已删除，meta 现在只承载各功能的扩展数据，前端不再写入
这三个键，旧值在下次保存该关系时自动清除。

### 4.3 剧情

```rust
pub struct Scenario {
    pub id: ScenarioId,
    pub name: String,
    pub description: Option<String>,
    pub entry_node: Option<CardId>,
    pub node_ids: Vec<CardId>,
    pub edge_kinds: Vec<String>,
    pub node_positions: BTreeMap<CardId, [f64; 2]>,  // 保留字段，当前未使用
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

**`node_positions` 保留但不再使用**。节点图已删除，此字段供旧项目兼容，不再写入。

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
    pub group_id: String,
    pub label: String,
    pub remaining: Vec<CardId>,
    pub initial: Vec<CardId>,
    pub total: usize,
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
    pub pile: Option<PileData>,
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
    pub default_card_frame_style: Option<String>,
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

`CURRENT_SCHEMA_VERSION = "0.1"`。`Manifest::new()` 的默认版本是 `"0.1.0"`，与应用版本（`0.3.0`）独立。

### 4.7 卡组

```rust
pub struct CardGroup {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    /// 有序多重集：同一张卡可重复出现，代表多份引用
    pub card_ids: Vec<CardId>,
    pub created_at: i64,
    pub updated_at: i64,
}
```

约束：

- 卡组只是引用，删卡组不影响卡
- `card_ids` 是有序多重集：同一张卡可重复出现，代表多份
- 删卡时同步从所有卡组里移除该卡的所有副本
- 卡组的 `card_ids` 顺序就是棋盘导入 / 铺开 / 抽牌的顺序（重复项依次处理）
- 「按类型生成」：新建卡组时可选择，或对已有卡组「按类型填充」（追加 / 替换），
  按卡名排序
- 不做快照

---

### 4.8 卡牌文档

每张卡可附带一份 Markdown 长文（`docs/<card_id>.md`），与 `scripts/` 同构，
一卡一文件，内容为空时删除文件。

与剧本的区别：**文档不参与运行时**。它是卡牌的附属资料（设定、背景、备注），
不进 `Card.values`，不进剧情引擎，不进 HTML 导出，也不在卡框里渲染。

编辑入口在卡片编辑面板的「文档」tab（CodeMirror 6 源码编辑，自动保存）。

搜索：卡牌墙搜索同时命中 `docs_fts`（FTS5 trigram，与 `cards_fts` 并列，
`cards_fts` 命中排前，文档命中追加在后）。

资源包：`docs/` 随 `.anvilpack` 导出 / 导入；合并时按导入成功的卡 id 复制
（卡被跳过则其文档不合并）。删卡时同步清理文档文件与索引条目。

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
├── docs/<card_uuid>.md
├── assets/
│   ├── images/<文件名>.<ext>
│   └── audio/<文件名>.<ext>
└── .anvil/index.db
```

**目录创建时机**：

- `Project::open` 创建 10 个目录：`cards / types / relations/from / boards / scenarios / sessions / scripts / docs / card_groups / .anvil`
- `themes/` 首次保存主题时创建
- `assets/images/` / `assets/audio/` 首次导入资源时创建

**资源文件名**：使用可读的原始文件名（清理非法字符、截断 40 字符）。撞名自动追加 `-2` / `-3`，超过 1000 个同名时加 uuid8 后缀。

### 5.2 SQLite 索引

- `.anvil/index.db`，FTS5（trigram tokenizer）
- 重建判断：`PRAGMA user_version` 为 0，或 `cards / types / relations` 目录的 mtime 比 db 新
- **`values` 是保留字**，列名用 `values_json`

### 5.3 资源缓存

图片和音频统一走 **asset protocol**，不走 base64。

- 前端 `lib/assetCache.ts` 是模块级缓存，`relative path → asset URL`
- `loadAsset(relative)` → `ipc.assetAbsPath(relative)` → `convertFileSrc(abs)` → 缓存
- 用 `useSyncExternalStore` 订阅
- `invalidateAsset(relative)` 单条失效；`clearAssetCache()` 全清（关闭项目时调）
- **`read_image_data_url` 仍存在**，但只被 HTML 导出用于内嵌图片，前端渲染路径不用

### 5.4 音频资源

音频同样走 asset protocol。

- `open_project` 动态 `allow_directory` 项目根
- **不做 `forbid_directory`**：Tauri 2 的 deny 列表只增不减，调用会让同一路径在「关闭项目 → 重开」后永久被拒
- `asset_abs_path` IPC 返回绝对路径，前端 `convertFileSrc` 转成 `asset://` URL
- WebView 直接从磁盘读，不经过 IPC
- 支持格式：mp3 / ogg / wav / m4a

### 5.5 全局音频播放器

`lib/audioPlayer.ts` 是模块级单例。

- 只有一个 `HTMLAudioElement`，同一时刻只播一首
- 状态通过 `useSyncExternalStore` 订阅
- 组件卸载不停止播放（跨模块、跨设置持续）
- 音量 / 循环持久化到 `appSettings.playerVolume` / `appSettings.playerLoop`

三个 UI：

- `MiniPlayer`：右下角常驻，`position: fixed`，`bottom: calc(var(--statusbar-h) + 12px)`，有曲目时才渲染
- `PlayerInspector`：检查器内，显示当前曲目 + 进度 + 音量 + 循环
- `PlayerView`：音乐模块主区，列表 + 搜索 + 导入 + 播放 + 删除 + 引用计数 + 时长懒加载

### 5.6 最近项目

`localStorage` 存 `anvil.recentProjects`（上限读应用设置 `recentProjectsMax`）和 `anvil.lastOpenPath`。启动时尝试自动打开上次项目。主动关闭项目清 `lastOpenPath`。

---

## 6. 技术架构

### 6.1 技术栈

| 层         | 选型                      |
| ---------- | ------------------------- |
| 壳         | Tauri 2.x                 |
| 后端       | Rust                      |
| 持久化     | 文本文件 + SQLite 索引    |
| 全文检索   | SQLite FTS5（trigram）    |
| 资源包     | zip + walkdir             |
| 无边框窗口 | tauri-plugin-frame        |
| 文件对话框 | tauri-plugin-dialog       |
| 前端       | React + TypeScript + Vite |
| 状态       | Zustand（slice 模式）     |
| 拖拽排序   | @dnd-kit                  |
| 包管理器   | pnpm                      |

**已移除**：`@xyflow/react`（React Flow）—— 节点图删除后不再需要。

### 6.2 目录结构

```text
anvil/
├── src-tauri/
│   ├── assets/
│   │   └── presets/
│   │       └── anvil_castle.anvilpack   # 内置预设（编译嵌入）
│   └── src/
│       ├── core/
│       │   ├── model/       # 数据模型
│       │   ├── store/       # 文本文件读写 + 索引 + 资源包（17 个文件，每领域一个）
│       │   │   ├── assets.rs       # 图片 + 音频
│       │   │   ├── atomic.rs       # 原子写
│       │   │   ├── boards.rs
│       │   │   ├── cards.rs
│       │   │   ├── card_groups.rs
│       │   │   ├── export_html.rs  # HTML 导出
│       │   │   ├── manifest.rs
│   │   │   ├── pack.rs         # 资源包导出 / 导入 / 合并
│   │   │   ├── preset.rs       # 内置预设注册表 + 追加导入
│   │   │   ├── project.rs      # 项目打开 / 重载 / 索引判断
│       │   │   ├── relations.rs
│       │   │   ├── scenarios.rs
│       │   │   ├── scripts.rs
│       │   │   ├── sessions.rs
│       │   │   └── theme.rs
│       │   ├── index/       # SQLite 索引 + FTS
│       │   └── ipc/         # Tauri 命令（按领域拆分）
│       └── lib.rs
├── src/
│   ├── core/                # IPC 类型 + 项目级动作
│   │   ├── ipc/             # api.ts · types.ts · index.ts
│   │   ├── applyProjectTheme.ts
│   │   └── openProjectAt.ts
│   ├── lib/                 # 通用工具
│   │   ├── id.ts · time.ts · theme.ts · fontScale.ts · lookup.ts
│   │   ├── assetCache.ts · audioPlayer.ts · moduleOrder.ts
│   │   ├── toast.ts · confirm.ts · runWithError.ts · saveRegistry.ts
│   │   ├── dice.ts · appSettings.ts · commands.ts
│   │   └── recentProjects.ts
│   ├── hooks/               # 通用 hook
│   │   ├── useAppSettings.ts · useAssetUrl.ts · useCommands.ts
│   │   ├── useCreateProject.ts · useDeleteUndo.ts · useDraft.ts
│   │   ├── useExportPack.ts · useImportPack.ts · useKeyboard.ts
│   │   └── useOpenProject.ts
│   ├── components/
│   │   ├── CardFrame/       # 卡牌渲染（分层：primitives + styles）
│   │   ├── CardGrid/        # 卡片网格（共享布局）
│   │   ├── Modal.tsx · Toolbar.tsx · PickerDialog.tsx
│   │   ├── ToastHost.tsx · ConfirmHost.tsx · CommandPalette.tsx
│   │   ├── HoverPreview.tsx · AudioSelect.tsx · ImageField.tsx · RefField.tsx
│   │   ├── SectionLabel.tsx · EmptyState.tsx · LabeledBlock.tsx
│   │   ├── Toggle.tsx · SaveInput.tsx · TypeMultiSelect.tsx
│   │   ├── EntityListLayout.tsx · ScaledCardFrame.tsx · FieldInput.tsx
│   │   └── ...
│   ├── shell/               # 五段布局
│   │   ├── AppShell.tsx · TopBar.tsx · LeftNav.tsx
│   │   ├── Workspace.tsx · Inspector.tsx · StatusBar.tsx
│   │   └── ErrorBoundary.tsx
│   ├── themes/              # 内置主题定义
│   ├── features/
│   │   ├── cards/           # ★ 共享核心
│   │   │   ├── card/ · card-type/ · card-wall/ · relation/
│   │   ├── card-groups/
│   ├── story/
│   │   ├── scenario/    # 剧情设计 + 导出
│   │   │   └── inspector/   # 检查器内容
│   │   ├── play/
│   │   │   ├── vn/      # VNStage 系列
│   │   │   └── panels/  # 变量面板
│   │   ├── script/
│   │   │   ├── structured/  # 结构编辑
│   │   │   └── source/      # 源码 + 预览
│   │   └── effects.ts
│   │   ├── board/           # 棋盘
│   │   ├── session/         # 跑团
│   │   │   └── chat/        # 对话流、掷骰、消息编辑
│   │   ├── player/          # 音乐模块
│   │   ├── project/         # 项目设置内容 + 资源包合并
│   │   ├── settings/        # 设置浮层
│   │   └── commands/        # useGlobalCommands.ts
│   └── stores/              # Zustand（slice 模式）
└── package.json
```

### 6.3 通信约定

- 命令：`invoke`
- 前端不裸调 `invoke`，统一走 `core/ipc/api.ts`
- Rust snake_case → 前端 camelCase，Tauri 2 自动转换

---

## 7. 剧情条件与赋值

条件和赋值都是**剧本语言的行类型**，不写入数据模型：

- **条件行** `{表达式: 文本}`：表达式为真时显示文本，否则跳过；无冒号则只做门槛
- **赋值行** `~ 变量 操作符 值`：操作符 `=` / `+=` / `-=`

条件表达式由前端本地求值（`script/eval.ts`，递归下降，约 100 行），
不走 IPC：

```text
visited_anvil == true
gold >= 100
has_key && !door_locked
race == "矮人"

变量声明在 Scenario.variables（key / label / 类型 / 默认值）。

骰子支持：赋值值支持 1d3 / 2d6+3 / 1d20-2。前端本地随机，
执行时记录明细。骰子逻辑统一在 src/lib/dice.ts：rollDice 掷骰，
validateDiceExpression 只校验不掷。
```

---

## 8. 错误处理与用户提示

三层机制。

**`lib/toast.ts` + `components/ToastHost.tsx`**

右下角非阻塞提示，3 秒自动消失。三种类型：`info` / `success` / `error`。

用于所有成功、失败、提示类消息。**不再用 `alert()`。**

**`lib/confirm.ts` + `components/ConfirmHost.tsx`**

异步自定义确认框，返回 `Promise<boolean>`。支持 `title` / `confirmLabel` / `cancelLabel` / `danger`。

```ts
if (!(await confirmDialog({ message: "删除？", danger: true }))) return;
```

**`lib/runWithError.ts`**

统一 try-catch 模式。失败时 toast 报错，返回 `{ ok, value }`。

```ts
const r = await runWithError(() => ipc.saveCard(next), "保存失败");
if (!r.ok) return;
```

**边界**：catch 里有额外清理、`throw`、`finally` 时保留原 try-catch。

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

- **只抽高一致性、高频的样式**
- **`Mono` 不抽** —— 绝大多数是 input 的 inline style
- **`LabeledInput` 不抽** —— 各处差异大于共性
- **`Divider` 不抽** —— 常与 flex 布局耦合

---

## 10. 卡牌悬浮预览

**组件**：`components/HoverPreview.tsx`

**两种模式**：

- `position="follow-mouse"`（默认）：跟随鼠标右下
- `position="anchor-right"`：锚定触发元素右侧

**延迟**：200ms 进入 / 300ms 退出。靠近视口边缘自动翻转。

**挂载点**：关系面板的对方卡名、会话消息的作者头像。

---

## 11. 主界面

五段布局：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 顶栏：⚒ Anvil · 项目名 ▾                [搜索框 Ctrl+K]  [设置]     │
│                                                          ⚊ ▢ ✕     │
├────────────┬──────────────────────────────────────┬──────────────────┤
│            │                                      │                  │
│  左侧导航   │           中间工作区                  │   右侧检查器      │
│  (48–180)  │                                      │   (200–700)      │
│            │   卡片墙 / 剧情 / 棋盘 / 卡组          │                  │
│  ◈ 世界观   │   / 跑团 / 音乐 / 类型                │   随模块切换：    │
│  ❖ 视觉小说 │                                      │     卡框预览      │
│  ▦ 棋盘     │                                      │     卡片编辑      │
│  ▤ 卡组     │                                      │     边编辑        │
│  ✦ 跑团     │                                      │     Token 编辑    │
│  ♪ 音乐     │                                      │     剧情上下文    │
│  ◇ 类型     │                                      │     播放器        │
│            │                                      │                  │
│  ── 概览 ── │                                      │                  │
│  卡牌 30    │                                      │                  │
│  关系 22    │                                      │                  │
│  类型 6     │                                      │                  │
├────────────┴──────────────────────────────────────┴──────────────────┤
│ 底栏：卡牌 30 · 类型 6 · ↶ 3 · ↷ 0 · 已保存 · D:\...\MyWorld.anvil  │
└──────────────────────────────────────────────────────────────────────┘
                                                        ┌───────────┐
                                                        │ MiniPlayer │
                                                        └───────────┘
```

### 顶栏（TopBar）

- **左**：`⚒ Anvil · 项目名 ▾` 下拉菜单
  - 打开 / 新建 / 导入资源包
  - （有项目时）导出资源包 / 合并资源包 / 刷新项目 / 关闭项目
- **中**：拖拽区（`data-tauri-drag-region`，双击可最大化）
- **右**：搜索框（点击打开命令面板，显示 `Ctrl+K`）、设置按钮
- **右侧预留**：`paddingRight: calc(12px + var(--tauri-frame-controls-width, 138px))` 给窗口按钮留位

撤销 / 重做 / 保存状态**不在顶栏**，在底栏。

### 左侧导航（LeftNav）

- 7 个模块：世界观 / 视觉小说 / 棋盘 / 卡组 / 跑团 / 音乐 / 类型
- **非卡片墙模块自动收窄**：48px，仅图标
- **悬停或拖拽时展开**：180px
- **可拖拽排序**，顺序持久化到 `localStorage`（`anvil.leftNavOrder`）
- 底部「概览」：卡牌 / 关系 / 类型计数

### 检查器（Inspector）

- 宽度 200–700，默认 320，可拖拽调整
- 可折叠成 28px 竖条（点击展开）
- 按 `activeModule` 决定内容：
  - `types` + 选中卡牌类型 → 卡框预览
  - `story` → `ScenarioInspector`（剧情设置：描述 / 入口 / 节点 / 变量）
  - `player` → `PlayerInspector`
  - 其他：token > edge > card 优先级

### 底栏（StatusBar）

- 卡牌数、类型数
- 撤销 / 重做按钮（带计数），点击执行
- 保存状态（`保存中… (N)` / `已保存`）
- 项目路径

### MiniPlayer

右下角常驻，`bottom: calc(var(--statusbar-h) + 12px)`，有曲目时才渲染。带播放 / 暂停、进度条、关闭。

---

## 12. 剧情模块

### 12.1 布局

```
┌──────────────────────────────────────────────────────────────┐
│ 剧情名  保存状态           [▶ 运行] [导出 MD] [导出 HTML]     │
├──────────────────────────────────────────────────────────────┤
│ [场景1][场景2][场景3]...                                     │
├──────────────────────────────────────────────┬───────────────┤
│                                              │  检查器        │
│                                              │                │
│  剧本编辑器（结构 / 源码 tab）                │  场景 / 剧情    │
│                                              │                │
└──────────────────────────────────────────────┴───────────────┘
```

**顶部一行**：剧情名、保存状态、运行、导出 MD、导出 HTML。

**第二行**：所有场景横向 tab。切换场景刷新主区和检查器。

**主区**：剧本编辑器。结构 / 源码双 tab。

**检查器**（`ScenarioInspector`）：

- 描述 / 入口节点 / 节点勾选 / 变量
- 选中边时切到 `EdgeEditorPanel`（世界观关系的备注 / 类型）

### 12.2 运行

点击「▶ 运行」→ **全屏覆盖层**。`Esc` 或顶部「关闭」按钮退出。

`PlayView` 挂载在覆盖层内。带打字机、背景、立绘、bgm、sfx。

### 12.3 删除的部分

**节点图已删除**。原 `StoryGraphView` / `GraphNode` / React Flow 依赖全部移除。原因：

- 全图力导向布局无法建立空间记忆（位置每次重排）
- 节点间的分支编辑比表单操作更麻烦
- 场景数量有限（通常 < 20），顶部 tab 完全够用

`Scenario.node_positions` 字段保留但不再写入，用于旧项目兼容。

---

## 13. 棋盘

**HTML 层渲染**：外层滚动容器 + 内层等比缩放 div + 背景图 + 网格（SVG 层）+ 关系线（SVG 层）+ Token（HTML 绝对定位）。

**网格形状**：方格 / 点阵 / 横线 / 竖线。

**交互**：

- 拖拽 token：位置跟手，被拖的自动提到最前
- **Ctrl/Cmd + 滚轮缩放**：0.25× – 4×
- **Alt + 拖拽旋转**：Shift 吸附 15°
- 多选：Ctrl/Cmd 点击加入集合
- **双击 token**：翻转 `face_down`
- **单击卡盒**：弹出抽牌面板

**关系线**：

- 只世界观边
- 工具栏「显示关系」开关，默认关闭
- 配置持久化到 Board
- **聚合**：同一对 token 之间的 >= 2 条关系合并为一条粗线 + 中央数字徽章
- 有向带箭头，无向不带
- 线在 token 之下，不可交互

**工具栏**：名称、网格开关、吸附、格大小、形状、宽高、背景、从卡组导入、从卡组加卡盒、显示关系、关系过滤、加卡、加占位、缩放、批量操作。

**从卡组导入（铺开）**：

- 选卡组 → 选顺序（原序 / 随机）→ 网格铺开
- 网格：从左上角开始，8 列，每格 180×240
- **超出棋盘边界时自动扩充宽高**：按 100px 取整，+180 / +240 留白

**卡盒**：

- 从卡组生成，落为一个特殊 Token（`pile` 字段非空）
- 视觉：底卡背 + 双层错位叠影 + 右下角 `N / M` 徽章
- 单击 → 弹 `PileDrawDialog`：抽 1 / 抽 N / 洗牌 / 重置
- **放置算法**：从卡盒位置按「右 → 下 → 上 → 左」四方向探测空位
- **抽牌不扩充棋盘**（与从卡组导入的区别）

**占位 Token**：

- 工具栏「+ 占位」创建
- `card_id: null`，显示为灰色边框 + 名称
- 用于位置标记

**卡背**：优先级 `CardType.card_back` → `Manifest.default_card_back` → 内置图案（双层菱形描边 + "Anvil" 字样）。

**Token 属性**：检查器有宽高比锁定按钮（🔒/🔓），纯 UI 状态。

**批量操作**：`useBoardActions.deleteSelectedTokens(ids)` 支持批量删除 + 撤销。

---

## 14. 跑团

**布局**：顶栏（会话名 + 战场选择 + BGM 按钮）+ 舞台（棋盘 HTML）+ 角色列表 + 对话流 + 输入框。

**角色列表**：圆形首字头像 + 名字 + 类型。

**悬停头像** → 卡牌悬浮预览。

**消息样式**：say / action / roll / narration / ooc / whisper。

**存储**：消息写入 `events.jsonl`。

**卡盒**：会话的 token 是 Board 的副本。会话里可以单击卡盒抽牌，**只影响会话副本**。

---

## 15. 卡牌渲染

槽位由风格声明，SlotDef 决定编辑器配置项

### 15.1 目录结构

```
CardFrame/
├── index.tsx              分派器（resolveStyle + shouldFoil）
├── types.ts               类型 + SIZE_MAP + 预设
├── mapping.ts             mapContent + resolveFeatures
├── primitives/            基础构件
│   ├── CardShell.tsx · CardInner.tsx
│   ├── CardImage.tsx · CardBack.tsx · FoilOverlay.tsx
│   └── back-styles/
│       ├── types.ts · registry.ts
│       └── impl/
│           ├── anvil.tsx · rune.tsx
└── styles/                风格实现
    ├── types.ts · registry.ts
    └── impl/
        ├── YuGiOh.tsx · Generic.tsx · Minimal.tsx
        ├── MTG.tsx · Pokemon.tsx · Rainbow.tsx

```

### 15.2 数据流

```
Card + CardType
  ↓
mapContent(card, cardType)      → CardContent   （纯数据）
resolveFeatures(card, cardType) → CardFeatures  （视觉处理）
  ↓
CardFrame 分派 → 风格组件（只接收 content）
  ↓
shouldFoil → 包一层 FoilOverlay（读 features）
```

**`CardContent`**：title / subtitle / typeLine / level / atk / def / hp / body / image。纯内容，不涉及"该不该显示"。

**`CardFeatures`**：crop / foil / foilVariant。附加视觉处理，风格组件不关心。

### 15.3 风格

`CardFrame` 按优先级分派：

1. 显式传入的 `style` prop
2. `cardType.card_frame.style`
3. `DEFAULT_CARD_FRAME_STYLE`（yugioh）

| 风格                                                     | key       | 视觉定位                                     |
| -------------------------------------------------------- | --------- | -------------------------------------------- |
| 游戏王                                                   | `yugioh`  | 金属渐变外框 + 羊皮纸描述框 + 星号等级       |
| 通用                                                     | `generic` | 深底细描边 + 顶部色条 + 底部属性行           |
| 极简                                                     | `minimal` | 无外框 + 左竖条 + 大留白                     |
| 万智牌                                                   | `mtg`     | 深色石质外框 + 顶部标题条 + 底部羊皮纸文字栏 |
| 宝可梦                                                   | `pokemon` | 浅色圆角 + 顶部标题 + HP + 艺术图            |
| 彩虹                                                     | `rainbow` | 七色渐变外框 + 渐变首字 + 渐变星级           |
| **尺寸**：small 140×205 · medium 190×280 · large 260×385 |

### 15.4 图像区

- 固定像素高（small 84 / medium 116 / large 160）
- 统一走 `CardImage`
- **裁剪**：`image_crop` 类型级，`Card.image_crop_override` 卡级覆盖

- 无图时显示类型色系首字

### 15.5 颜色

全部走 CSS 变量。类型级强调色 `CardType.color` 支持 hex 与 CSS 变量。透明度与加深统一用 `color-mix()`。

### 15.6 闪卡

**触发**：

- `foil_field` 指定字段 key
- `foil_values` 指定命中的值列表
- 支持的字段值类型：`string` / `number` / `boolean` / `string[]`

**风格**：

- `foil_style` 指定，默认 `"gold"`
- 每个风格在 `primitives/foil-styles/impl/` 下是一个 `.ts` 文件
- 默认导出 `{ id, label, css }`
- 注册表（`foil-styles/registry.ts`）用 `import.meta.glob` 自动发现，CSS 在模块加载时一次性注入到 `<head>`
- 加新风格只加一个文件
- 颜色通过 CSS 变量配置：`--card-foil-base` / `--card-foil-shine` / `--card-foil-edge`（金），`--card-foil-silver-base` / `--card-foil-silver-shine` / `--card-foil-silver-edge`（银）

**渲染**：

- `FoilOverlay` 三层：静态基色 + 流光 + 边缘描边
- 流光用 `transform: translate3d` 动画，GPU 合成
- **不用 `mixBlendMode`**（每次重绘做色彩混合，代价高）
- `prefers-reduced-motion: reduce` 时禁用动画
- `.foil-overlay` 的结构定位在 `index.css`，颜色与动画交给各风格 impl CSS（`.foil--{id}` 限定选择器）

**启用**：

- 视图层显式传 `<CardFrame foil={true} />`
- 卡片墙和检查器预览启用，棋盘 / 跑团不启用
- 两个条件都满足才闪：视图层启用 + 数据层命中

**扩展**：加新效果只加一个文件（`impl/*.ts`），注册表与下拉自动发现。

### 15.7 卡背

优先级：`CardType.card_back` → `Manifest.default_card_back` → 内置图案。

### 15.8 标签自定义

`atk_label` / `def_label` / `hp_label` / `level_label`。

### 15.9 渲染统一

卡片墙、棋盘 token、跑团角色面板、检查器预览都走 `CardFrame`。

`ScaledCardFrame` 按容器宽度等比缩放。`CardGrid` 是共享的卡片网格布局组件。

---

## 16. 剧本与导出

### 16.1 剧本格式

Markdown。语法（10 种行类型，分支 / 条件 / 变量全部内联在剧本里）：

```text
> 文本              → 旁白
**说话人**（表情）：文本 → 对白
*文本*              → 动作
@bg 路径            → 背景切换
@bgm 路径           → 音乐切换
@sfx 路径           → 音效
-> 场景名           → 跳转（运行时按卡名解析为 card.id）
{表达式: 文本}      → 条件（满足才显示文本；无冒号则只做门槛）
~ 变量 操作符 值    → 赋值（操作符：= += -=，值支持骰子如 2d6+1）
<>                  → 粘合（下一文本行与前一显示行拼接）
```

frontmatter（`---` 包围）可写：`bg` / `bgm` / `is_ending` / `ending_name`。

条件表达式前端本地求值（`script/eval.ts`，递归下降，约 100 行）：
运算符 `== != < <= > >= && || ! +`；字面量数字 / 双引号字符串 / 布尔；
标识符从变量表读取。不走 IPC。

### 16.2 剧本编辑器

双 tab：

- **结构**（默认）：行卡片列表，每行一个类型选择器 + 对应字段。支持拖拽排序，回车新建下一行（类型延续）
- **源码**：CodeMirror 6 编辑 Markdown + 右侧面板（预览 / 大纲双 tab）

顶部固定场景设置区：背景（图片选择器）、音乐（音频选择器）、结局标记、结局名。

结构视图行内：

- 对白行：说话人 + 表情 + 内容
- 音效行：`AudioSelect` 音频选择器
- 背景行：图片路径文本
- 跳转行：场景下拉（从剧情 node_ids 选，显示卡名）
- 条件行：表达式输入 + 显示文本输入
- 赋值行：变量下拉 + 操作符选择 + 值输入
- 粘合行：无字段，仅标记
- 旁白 / 对白内容 / 动作 / 条件文本使用 `AutoGrowTextarea` 自动增高；
  粘贴多行文本自动拆分为多条脚本行

源码编辑器（CodeMirror 6）：

- 行号、语法高亮（`StreamLanguage` tokenizer，10 种行类型 + frontmatter）、
  `Ctrl+F` 查找、撤销重做、自动折行
- 上下文补全：`@bg/@bgm/@sfx` 资源路径、`->` 场景名、`~` / `{}` 变量名、
  `**` 说话人（项目卡名）
- 快捷键：`Ctrl+B` 包裹 `**…**`、`Ctrl+I` 包裹 `*…*`、`Ctrl+Enter` 插入 `-> `
- 跨 tab / 场景切换后光标与滚动位置恢复（按 cardId 缓存）
- 右侧「大纲」tab：汇总跳转 / 条件 / 赋值行，点击定位到对应源码行

数据流：`content` 是唯一真源。结构视图解析 → 编辑 → 序列化回 `content` → 自动保存到 `scripts/<card_id>.md`。

**自动保存延迟**：读 `appSettings.autoSaveDelayMs`（默认 800ms）；超过 500 行的剧本
延迟加倍（1500ms），内容与上次保存一致时跳过写入。

### 16.3 导出 Markdown

场景 → 导出按钮 → 保存对话框 → `剧情名-剧本.md`。

输出结构：标题 + 简介 + 变量列表 + 场景（入口优先，其余按 node_ids
顺序编号）+ 分支列表（扫描各场景剧本的 `->` 行，去重后列出）。

### 16.4 导出 HTML

单文件 HTML，图片 base64 内嵌，音频不导出。目标：

- 支持：文本、背景图、点击推进、`->` 选择、条件、赋值（含骰子）、
  粘合、打字机、结局、重玩
- 不支持：立绘渲染（数据里有 `portrait` 但 JS 不渲染）、动画、转场、
  音频播放（bgm / sfx 只显示为文本行）、存档、成就

技术要点：Rust 侧生成 JSON 数据（不再导出剧情边）+ 内嵌 HTML 模板 +
内嵌约 600 行 JS 运行时（tokenizer + 表达式求值 + 骰子 + 剧本解析
（10 种行）+ pc 扫描 stepper + 打字机 + 选择 + 效果 + 结局）。
固定中性深色主题。

### 16.5 跨场景搜索

`script_fts`（FTS5 trigram）索引 `scripts/` 下全部文件。
`save_script` / `delete_script` 增量维护，`rebuild_index` 全量重灌。
剧情模块顶栏搜索，结果按当前剧情的 `node_ids` 过滤。
中文短查询（< 3 字符）无效，与卡片搜索一致。

卡牌墙搜索同时命中 `docs_fts`（卡牌文档，见 4.8），`cards_fts` 命中排前。

---

## 17. 音频资源

**用途**：视觉小说运行（bgm 播放 + sfx 触发）+ 音乐模块（用户手动播放）。

**目录**：`assets/audio/<文件名>.<ext>`。格式：mp3 / ogg / wav / m4a。

**传输**：Tauri asset protocol（见 5.4）。

**UI 组件**：

- `AudioSelect` 下拉 + 导入 + 试听 + 清除（剧本编辑器内嵌）
- `PlayerView` 音乐模块主区（列表 + 搜索 + 导入 + 播放 + 删除 + 引用计数）
- `PlayerInspector` 检查器内（当前曲目 + 进度 + 音量 + 循环）
- `MiniPlayer` 右下角常驻

**运行播放**：`useSceneAudio` 处理。

- bgm 循环播放，跨行保持，只有显式 `@bgm` 或新场景 frontmatter 时切换
- sfx 单次播放，运行时产出的 sfx 列表变化时触发
- 淡入淡出 150ms
- 组件卸载时停止
- **进入视觉小说运行时自动暂停全局播放器，退出恢复**

---

## 18. 资源包

### 18.1 导出

```text
world.anvilpack (zip)
├── manifest.json
├── types/
├── cards/
├── relations/
├── boards/
├── scenarios/
├── sessions/
├── card_groups/
└── assets/
    ├── images/
    └── audio/
```

导出时更新 `manifest.updated_at`。跳过以 `.` 开头的文件 / 目录，以及 `node_modules` / `target`。

### 18.2 导入（覆盖式）

选包 → 选目标目录 → 解压 → 自动打开。防路径遍历（拒绝含 `..` 或绝对路径的条目）。

### 18.3 合并

把另一个包合并进**当前打开的项目**。类型映射、只导类型、选择性导入、字段合并。ID 都是 UUID 不撞。

合并规则：

- **卡牌类型**：
  - `Skip`：跳过，其卡片也不导入
  - `Existing { target_id }`：映射到现有类型。字段逐 key 合并（本地缺的补上）。本地无 `card_back` 时用对方的。裁剪 / 出框**仅在双方都有 `card_frame` 时**逐项合并（本地为空才填）
  - `New`：重新生成 UUID，其他字段完整复制
- **关系类型**：`Skip` / `Existing` / `New` 同上
- **卡片**：仅在类型映射非 Skip 且卡 ID 不冲突时导入
- **关系**：仅在 from / to 都已导入且关系 ID 不冲突时导入。`kind` 按映射表替换
- **剧情**：选择性导入，ID 冲突跳过。节点 ID 过滤为本次导入的卡；`edge_kinds` 按映射表替换；`entry_node` 不在节点里时改为第一个
- **棋盘**：选择性导入，ID 冲突跳过
- **会话**：选择性导入，ID 冲突跳过。事件重新分配 `seq`
- **卡组**：选择性导入，ID 冲突跳过。保留原 ID，卡组内引用只保留本次导入的卡
- **图片**：同名跳过，不同名复制
- **音频**：合并时**不处理** `assets/audio/`（已知缺口，见 §24）
- **Manifest**：目标项目的元数据不被覆盖

### 18.4 内置预设

内置预设是编译进二进制的 `.anvilpack`，存放在 `src-tauri/assets/presets/` 下，通过 `include_bytes!` 嵌入。

唯一入口是「添加预设…」（TopBar → 项目菜单，新建项目时也会询问是否添加）：
把指定预设作为**副本**追加到当前已打开的项目。内容实体全部重新生成 UUID；
与现有项目同名的实体加 `(2)` / `(3)`；卡类型与关系类型按**名字**复用
（已有同名字的类型不再新建），其余内容（卡 / 关系 / 剧情 / 棋盘 / 会话 /
卡组 / 图片）一律新建。不修改目标项目的 manifest。

预设注册表定义在 `src-tauri/src/core/store/preset.rs`，`PRESETS` 常量列出所有可用预设（id / label / description）。新增预设只需把 `.anvilpack` 放进 `assets/presets/` 并在 `PRESETS` 中登记一行。`anvil_castle`（铁砧堡）是首个预设，内容：6 个类型 / 30 张卡 / 5 个关系类型 + 22 条关系 / 3 个卡组 / 1 个剧情「失踪的学徒」+ 5 个场景完整剧本 / 2 个棋盘 / 1 个会话 / 4 张 SVG 背景图。覆盖 5 种卡框风格、闪卡、卡背、卡盒、翻牌、剧本结构化编辑器、音频选择器。

导入顺序：类型 → 关系 → 剧情 → 卡组 → 棋盘 → 会话 → 图片。棋盘 token 的 pile（卡盒）里 `group_id` 映射到新建卡组 id，`remaining`/`initial` 里的卡 id 映射到新建卡 id，`total` 重算；会话的 `board_id` 按映射指向新导入的棋盘（映射失败则置空）。

---

## 19. 撤销 / 重做 / 自动保存

**撤销栈**：内存中，上限 100 条，关项目清空。

**自动保存**：`useDraft` 监听 draft 变化，默认 800ms 落盘（延迟由 `appSettings.autoSaveDelayMs` 提供）。`registerFlusher` 让 `Ctrl+S` 时 `flushAll()` 立即保存所有脏 draft。

**快捷键**：`Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` / `Ctrl+S` / `Ctrl+K` / `Ctrl+M` / `Ctrl+1..5`

**批量操作进撤销栈**：删除卡片、关系、token、剧情、棋盘、会话、类型、卡组都支持撤销。卡盒抽牌 / 洗牌 / 重置也支持。

---

## 20. 命令面板

`Ctrl+K` 打开。命令来源：

- **导航**：5 个模块（world / story / board / session / types）
- **界面**：重置模块排序
- **项目**：打开 / 新建 / 导入资源包 / 合并资源包（+ 有项目时：导出 / 刷新 / 关闭）
- **编辑**：撤销 / 重做（有项目时）
- **播放**：音频播放器（有项目时，`Ctrl+M`）
- **打开卡牌**：快速跳转到某张卡（有项目时）
- **最近项目**：最近 5 个

---

## 21. 主题系统

**CSS 变量**：`src/index.css` 的 `:root`。`theme.ts` 是 JS 侧镜像。

**项目级主题**：`themes/<uuid>.json` 存 `variables`。设置面板 → 外观分类。`Manifest.theme_id` 记录。

**主题应用优先级**（`applyProjectTheme`）：

1. 若 `manifest.theme_id` 命中内置主题 → `resetTheme()` + `applyTheme(内置)`
2. 否则从 `ipc.listThemes()` 找项目主题 → `resetTheme()` + `applyTheme(项目)`
3. 都没有 → `resetTheme()`

**内置主题**：Anvil Dark / Anvil Light / Parchment / High Contrast / Slate。

**所有视觉变量都可被主题覆盖**：

- 背景 / 文字 / 边框 / 强调色 / 语义色
- 卡牌：`--card-frame-default-accent`、`--card-yugioh-*`、`--card-generic-*`、`--card-minimal-*`、`--card-mtg-*`、`--card-pokemon-*`
- 卡背：`--card-back-*`
- 闪卡：`--card-foil-*`（金）、`--card-foil-silver-*`（银）
- 对话气泡：`--chat-*`（全部派生自主变量）
- 主按钮：派生自 `--accent-copper`

**原则**：不硬编码颜色。

---

## 22. 设置面板

设置是**居中浮层**（`1000×680`，`maxWidth: calc(100vw - 48px)`），带遮罩 + 模糊。TopBar 一个「设置」按钮进入。`Esc` 或点击遮罩关闭。

**布局**：

- 顶部两行：标题行（⚒ 设置 + 关闭按钮）+ 搜索框行
- 底部金线渐隐
- 主体：左 NAV 200px + 右内容 max 760px 居中
- 键盘：`↑` `↓` 切分类（在输入框内不响应）

**分类按存储位置划分**（存项目文件夹 → 项目分类；存 `localStorage` → 应用分类），但**不按「项目 / 应用」分组呈现**。

**分类列表**：

| key          | 标签   | glyph | requiresProject | 内容                                                              |
| ------------ | ------ | ----- | --------------- | ----------------------------------------------------------------- |
| `general`    | 常规   | ◆     | ✓               | 名称 / 版本 / 作者 / 描述 / 默认卡背 / 默认卡框风格               |
| `appearance` | 外观   | ◈     | ✗               | 项目主题（ThemePanel）+ 界面缩放（AppInterfacePanel）             |
| `resources`  | 资源   | ▣     | ✓               | 图片资源（AssetsTab）：导入 / 搜索 / 引用计数 / 扫描未引用 / 清理 |
| `editor`     | 编辑器 | ✎     | ✗               | 自动保存延迟 / 最近项目上限 + 打字机速度 / 启用 / 旁白            |
| `advanced`   | 高级   | ⚙     | ✗               | 项目统计（有项目时）+ 清除缓存 / 恢复默认设置                     |

**未打开项目时**，`general` 和 `resources` 隐藏。

### 22.1 项目设置

存 `manifest.json` 和项目文件夹。

| 键                                            | 说明                             |
| --------------------------------------------- | -------------------------------- |
| `name` / `version` / `author` / `description` | 项目元数据                       |
| `default_card_back`                           | 项目默认卡背                     |
| `default_card_frame_style`                    | 项目默认卡框风格（新建类型时用） |
| `theme_id`                                    | 项目当前主题                     |

**层级**：项目默认 → 应用默认 → 内置默认。

### 22.2 应用设置

存 `localStorage`（`anvil.appSettings`）。

| 键                      | 默认       | 分组   | 说明                                 |
| ----------------------- | ---------- | ------ | ------------------------------------ |
| `fontScale`             | `1.0`      | 外观   | 界面缩放，0.75–1.5                   |
| `autoSaveDelayMs`       | `800`      | 编辑器 | `useDraft` 自动保存延迟              |
| `recentProjectsMax`     | `10`       | 编辑器 | 最近项目记录上限                     |
| `typewriterSpeed`       | `35`       | 编辑器 | 毫秒 / 字                            |
| `typewriterEnabled`     | `true`     | 编辑器 | 全局开关                             |
| `typewriterNarration`   | `false`    | 编辑器 | 旁白是否也打字机                     |
| `defaultCardFrameStyle` | `"yugioh"` | —      | 应用级默认卡框风格（项目未设时生效） |
| `playerVolume`          | `0.7`      | —      | 播放器音量（只由播放器 UI 调）       |
| `playerLoop`            | `false`    | —      | 播放器循环（只由播放器 UI 调）       |

**界面缩放**：`#root` 上的 CSS `zoom`（`lib/fontScale.ts`）。

**响应式**：`useAppSettings` 基于 `useSyncExternalStore`。

**恢复默认**：高级分类提供，同时重置 `moduleOrder`。

### 22.3 高级

- **清除缓存**：清空 `assetCache`。不影响项目数据
- **恢复默认设置**：重置 `anvil.appSettings` + `anvil.leftNavOrder`

---

## 23. 里程碑

**M1 — 卡牌核心** ✅
**M2 — 关系与图谱** ✅
**M3 — 分支故事** ✅
**M4 — 棋盘与跑团** ✅
**M5 — 分享与扩展** ✅

**M6 — 打磨与生态** ✅

已完成：CardFrame 视觉统一、检查器联动、最近项目、棋盘缩放/背景/旋转、卡框标签自定义、效果支持骰子、字段拖拽排序、批量选择、投骰日志、撤销覆盖 bulk、图片资源管理、数据统计、内置主题、多风格卡框、卡框强调色参数化、应用设置面板、目录结构整理、卡组功能、闪卡、卡背、翻牌、卡盒抽牌、骰子重构、类型复制、卡图裁剪、卡图出框、占位 Token、大文件拆分、音频资源管理、卡牌悬浮预览、seed 重构、错误处理统一、UI 小组件抽取、网格形状、界面缩放、CardFrame 接口重构、剧情模块改造、银箔闪卡。

**M6.5 — 视觉小说** ✅

已完成：阅读器、剧本结构化编辑器、剧本行拖拽排序、立绘多表情、剧本解析与序列化、导出 Markdown、导出 HTML、bgm / sfx 播放。

**0.2.0 已发布**（2026-10-09）。

**0.3.0 开发中** —— 音频播放器 + 音乐模块、无边框标题栏、LeftNav 可拖拽排序、TopBar 极简化、设置面板重构、剧情模块改造（内联逻辑剧本）、卡框渲染分层、资源管理搜索、卡组卡片视图、卡组多份引用 + 按类型生成。

---

## 24. 待办清单

**P2（提升与优化）**

- [ ] 时间线视图
- [ ] 导入合并的 schema 版本迁移
- [ ] 图片缩略图
- [ ] 命令面板性能
- [ ] 文件监听（notify）
- [ ] 卡组同步到棋盘（只补不删）
- [ ] 位置单元（Cell）—— 命名位置 + 吸附布局
- [ ] 闪卡扩展（全息彩虹等）
- [ ] 第二种卡背风格
- [ ] 资源包合并支持音频

**技术债（顺手改）**

- [ ] 内联样式 → 组件（`SectionLabel` / `EmptyState` / `Toggle`）长尾替换
- [ ] `useEffect` 依赖数组隐患逐个核实
- [ ] 单元测试（从 `lib/dice.ts` 和 `script/parser.ts` 开始）
- [ ] CI 增强（加 `cargo check` + `cargo fmt --check` + `prettier --check`）
- [ ] `index.css` 里 `.graph-handle` 残留样式清理

**P3（长期）**

- [ ] Session 提交回原卡
- [ ] 场景卡强制约束
- [ ] 受限插件系统
- [ ] Ren'Py 脚本导出

---

## 25. 明确不做的事

- 不做多人联机
- 不做规则引擎
- 不做 VTT 级别的自动化
- 不做账号系统
- 不做 Web 服务端
- 不做完全无 SQLite 的纯文件系统
- 不做视觉小说的完整演出引擎（立绘渲染、动画、转场、音频导出、存档、打包 EXE）

---

## 26. 设计原则

1. **数据 > 视图。** 先想清楚数据模型，再想 UI。
2. **文本真相源 > 二进制锁定。** 项目可用 git 管理，SQLite 只是索引。
3. **边界清晰 > 功能快。** `features/cards/` 是共享核心，任何功能不得绕过它私建卡模型。
4. **内部优雅 > 格式稳定。**
5. **本地优先。** 不引入网络依赖就能完整工作。
6. **可读的开源项目。** 命名清晰，注释写「为什么」而不是「是什么」。
7. **内置模块 > 插件。** 四大功能是产品本身，插件只做受限扩展。
8. **高频操作不过 IPC。** 棋盘拖拽在前端内存跑。
9. **颜色走 CSS 变量。**
10. **每个领域一个文件。**
11. **边即世界观。** 关系边只表达世界观连接；剧情分支内联在剧本语言里。
12. **场景是故事的基本单位。**
13. **视觉一致。** 卡牌渲染统一走 `CardFrame`。
14. **状态单一来源。** 选中态走 store。
15. **无向关系对等显示。**
16. **输入密集处不挂 HTML5 DnD。** 用 Pointer Events。
17. **引用是快照，不自动同步。**
18. **一次性逻辑不拆。** `seed.rs` 这类特殊文件保持整块。
19. **大文件优先拆组件，不拆数据。** 目标：单文件 400 行内可读。
20. **子组件放同一 feature 目录，不进 `components/`。**
21. **对话框的 `onClose` 用 ref 稳定。**
22. **结构化编辑器是创作工具的主视图。**
23. **弹窗统一。** `alert` → `toast`，`confirm` → `confirmDialog`，`try-catch` → `runWithError`。
24. **高频重复样式抽成语义组件。** 差异大于共性时不抽。
25. **音频走 asset protocol。** 不走 base64，不进 JS 堆。
26. **卡框渲染分层。** `mapContent` 提取内容，`resolveFeatures` 判断特性，风格组件只看内容。
27. **视觉特性可扩展。** 闪卡 / 卡背 / 卡框风格均为注册表（`import.meta.glob` 自动发现），加新风格只加一个文件，不改任何现有组件。
28. **动画走合成属性。** `transform` / `opacity`。不用 `background-position`、`mixBlendMode` 等触发主线程重绘的属性。
29. **设置的边界由存储位置决定。** 项目文件夹 vs `localStorage`，决定进哪个分类。
30. **设置形态统一。** 居中浮层，左分类右内容。带搜索框和键盘切换。
31. **状态管理双轨。** Zustand（业务状态）+ 模块级单例（跨组件共享的工具状态）。
32. **模块可重排。** LeftNav 顺序持久化到 `localStorage`，新模块自动追加，已删模块自动过滤。
