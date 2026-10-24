# Anvil 设计文档

版本 0.4.0 · 单人创作工具 · 桌面优先 · 开源

> 本文档反映当前实现。M1–M6 完成，M6.5 视觉小说与卡牌扩展已收尾。0.3.0 已发布（2026-10-13），Unreleased 开发中。

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
3. **角色数值活在卡牌上。** 角色的 HP / 属性活在卡牌上，改动直接写回卡（见 §14.5），不另建角色模型。

### 3.3 四大功能的统一

| 功能     | 数据来源                            | 主要视图                             | 运行时                    |
| -------- | ----------------------------------- | ------------------------------------ | ------------------------- |
| 世界观   | Card + Relation                     | 卡片墙                               | 无                        |
| 分支故事 | Card + Scenario（weave 多文件剧本） | 三栏编辑器（文件树 / 编辑 / 检查器） | 两态机（条件求值 + 赋值） |
| 棋盘     | Card + Token + Board                | HTML 画布                            | 坐标与状态                |
| 跑团     | Card + Session（+ 卡组当队伍）      | 对话流 + 角色面板                    | 事件日志                  |

**CardGroup** 是辅助索引，服务于「管理一组卡」和「批量铺开」，不属于四大功能之一。
`card_ids` 是有序多重集，同一张卡可以出现多次（对应棋盘上摆 N 个 token）。

**CardPile** 是 Token 的变体，在棋盘上以堆叠形式存在，支持抽牌与洗牌。

### 3.4 场景卡与角色卡

剧本通过名字引用项目中的卡，而不是把流程绑在卡上：

- `@scene 卡名` / `@actor 卡名` 把场景卡 / 角色卡挂到当前 knot（0.4 起 parser 仅识别，运行时联动是后续扩展点）
- `**角色**（表情）：对白` 的说话人按名字匹配卡，立绘从卡的 `portrait_<表情>` image 字段读取
- 场景卡推荐字段：时间、地点、参与者、氛围、描述

场景卡是**约定**，不强制。

### 3.5 边的分类

- **世界观边**：关系面板和棋盘关系线显示。

**无向关系**（`directed: false`）两侧对等显示。

关系名展示：

- 有向边，当前卡是 from → `[对方卡名] 的 [kind.name]`
- 有向边，当前卡是 to → `[对方卡名] 的 [kind.inverse_name]`
- 无向边 → 永远用 `kind.name`

### 3.6 分支故事 = 视觉小说工具

- 剧本按 **knot**（`===` 段落）组织，`->` 在 knot 间跳转，跨文件可跳
- 条件、变量是剧情状态的表达，全部内联在剧本里
- 「运行」是作者的**试玩 / 预览**，全屏浮层
- 可以导出为 Markdown（可读剧本）和 HTML（静态阅读器）

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
- `style` 为空时走默认（anvil）
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

### 4.3 剧情

```rust
/// 剧情元数据。流程拓扑不在其中——剧本本体是 `scenarios/<id>/*.md`（weave 语法）。
pub struct Scenario {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    /// 入口 knot。为空时运行时取文件名字典序第一个文件的第一个 knot。
    pub entry_knot: Option<String>,
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

流程结构（knot、跳转、选项、条件）全部在剧本文件里，`Scenario` 只存元数据。
变量由剧本中的 `VAR` 行声明（运行时推断类型），`VariableDef` 保留给
后续把变量提升为剧情设置用。

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
    pub group_id: Option<GroupId>,       // 队伍卡组
    pub state: BTreeMap<String, Value>,
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

新增字段全部 `#[serde(default)]`，旧数据缺失即取默认值，**向后兼容，不迁移**。

事件类型：

```text
chat.say · chat.action · chat.roll
chat.narration · chat.ooc · chat.whisper
session.start
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

`CURRENT_SCHEMA_VERSION = "0.4"`。`Manifest::new()` 的 `schema_version` 取 `CURRENT_SCHEMA_VERSION`，与应用版本独立。

**0.4 硬门禁，不做迁移**：`Project::open` 读取已存在 manifest 时，`schema_version`
不是 `0.4` 直接报错（旧项目不受支持，请新建项目）。资源包导入与预设导入同样检查
（`ensure_pack_schema`）。这是剧本格式从场景卡分支图到 weave 多文件的重写，
旧数据结构无法自动映射。

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
- 「按类型生成」新建卡组时可选择，或对已有卡组「按类型填充」（追加 / 替换），
  按卡名排序
- **卡盒是卡组的活窗口（只补不删）**：卡组新增的卡，可在棋盘上对卡盒执行
  「同步卡组」补入——多重集差额语义（组里 N 份、卡盒 M 份则补 N-M 份），
  按组顺序追加进 `initial` / `remaining`，`total` 跟随 `initial`；
  组里被移除的卡**不动**卡盒，棋盘上的删除只能是用户的显式动作
  （与 §4.9「不静默级联」一致）。同步记 `board.pile` 事件（`action: sync`），
  走普通撤销栈
- 编辑器顶部显示「被 N 处使用」：棋盘卡盒 chips 可点击跳转，会话队伍为
  纯展示（store 没有会话选择态，不为跳转复活已删的死状态）——
  删除确认里列得出引用，编辑时也该看得见
- 不做快照

---

### 4.8 卡牌文档

每张卡可附带一份 Markdown 长文（`docs/<card_id>.md`），与剧本文件同构，
一卡一文件，内容为空时删除文件。

与剧本的区别：**文档不参与运行时**。它是卡牌的附属资料（设定、背景、备注），
不进 `Card.values`，不进剧情引擎，不进 HTML 导出，也不在卡框里渲染。

编辑入口在卡片编辑面板的「文档」tab（CodeMirror 6 源码编辑，自动保存）。
编辑面板实时预览，预览用 react-markdown（GFM）渲染。

搜索：卡牌墙搜索同时命中 `docs_fts`（FTS5 trigram，与 `cards_fts` 并列，
`cards_fts` 命中排前，文档命中追加在后）。

资源包：`docs/` 随 `.anvilpack` 导出 / 导入；合并时按导入成功的卡 id 复制
（卡被跳过则其文档不合并）。删卡时同步清理文档文件与索引条目。

**编辑面分工**：文档 tab 顶部有「字段速览」（只读），写长文时不必切回字段 tab 核对数值；ref 解析为
卡名，失效引用标注「（引用已失效）」而不是把 uuid 丢给用户。类型编辑器
里 `rich_text` 字段带引导：长文建议放文档 tab，字段留给模块要读取的
结构化文本。速览不参与保存、不进 `values`——编辑仍归字段 tab，数据仍归
`Card.values`，两个编辑面不合并（合并即双真相源，且文档不进运行时，
搬过去的数据对所有模块失明）。

### 4.9 引用与删除

**卡牌是共享核心，但核心不保护自己的被引用状态。** 每个模块都指向它，
没人维护指向它的边。删掉一张卡，棋盘上的棋子还蹲在那儿 ——
它仍在原地，能被选中、能拖动、能挡住格子，但用户不知道它是什么、
为什么是空的、该怎么处理。

引用图如下（`←` 表示引用方向，删右侧的东西必须处理左侧）：

```text
棋盘 token.card_id       ┐
棋盘卡盒 pile.remaining  ├─→ 卡牌
关系 from / to（两侧）   │
卡组 card_ids            ┘

棋盘卡盒 pile.group_id ──→ 卡组
会话 group_id ──────────→ 卡组
卡 type_id ─────────────→ 卡类型
```

三条规则：

**一、扫描与清理分离。** `store/refs.rs` 里 `scan_*_refs` 只报不改，
`purge_*_refs` 才动数据。扫描可以随便调用，清理必须经过用户确认。

**二、不静默级联删除。** 删一张卡悄悄清空半个棋盘，比留下悬空边更糟 ——
用户会以为误操作，且无从察觉。所以删除前有引用时弹三选一：

```text
删除卡牌
「红龙斯毛格」还被 5 处引用：
  棋盘棋子   棋盘「铁炉酒馆」上有它的棋子
  棋盘卡盒   棋盘「铁炉酒馆」的卡盒「遭遇堆」里有它
  关系       「索林」指向它的关系「宿敌」
  ...
  [取消] [留个空位（标记已删除）] [移除棋子并删除]
```

`remove` 摘掉引用者；`detach` 保留引用者但断开指针，并把卡名留在
`name_override`（棋子退化成 `红龙（已删除）` 的灰占位块 ——
用户知道那儿曾经站着谁，也知道该怎么收拾它）。

**三、容器不是引用者。** 卡盒里少一张牌，卡盒本身要留着 ——
它装的不止这一张。`total` 跟着 `initial` 走，否则余量与实抽不符。

会话只通过 `group_id` 引用卡组，因此删卡走「卡组成员」这一路，
删卡组走「解绑会话队伍」这一路 —— 会话本身不持有任何实体，无需扫描。

顺序上先摘引用再删本体：反了就取不到卡名，`detach` 也就留不下墓碑。

**已知未覆盖的一处：**

- **剧本文本引用不做扫描。** 0.4 的 weave 用 `@scene` / `@actor` 后面跟
  **卡名**（不是卡 id）来引用卡牌。按名字做文本匹配误报率极高
  （`@scene 深岩矿坑` 未必是卡），提示噪声比缺失更糟。
  等剧本改用 id 引用或提供引用注解后再接入。

撤销要把被摘掉的关系网一并还原，语义见 §19。

**老项目体检**：命令面板「清理悬空引用」扫全项目指向不存在卡牌的引用，
先报数量、确认后一次性拔除。不可逆，所以入口放在命令面板而非自动执行。

**删除后必须整体重载 store。** 后端连带改了棋盘 / 会话 / 关系 / 卡组，
前端若只删卡片本身，界面与磁盘就不一致了 —— 用户切到棋盘还能看见那个
棋子，再拖一下又把它写回磁盘。

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
├── scenarios/<uuid>/          # 一剧情一目录
│   ├── scenario.json          # 剧情元数据（Scenario）
│   └── main.md                # 剧本文件（weave 语法，可多个）
├── card_groups/<uuid>.json
├── sessions/<uuid>/
│   ├── session.json
│   └── events.jsonl
├── docs/<card_uuid>.md
├── assets/
│   ├── images/<文件名>.<ext>
│   └── audio/<文件名>.<ext>
└── .anvil/index.db
```

**目录创建时机**：

- `Project::open` 创建 9 个目录：`cards / types / relations/from / boards / scenarios / sessions / docs / card_groups / .anvil`
- `themes/` 首次保存主题时创建
- `assets/images/` / `assets/audio/` 首次导入资源时创建

**资源文件名**：使用可读的原始文件名（清理非法字符、截断 40 字符）。撞名自动追加 `-2` / `-3`，超过 1000 个同名时加 uuid8 后缀。

### 5.2 事件流：为什么追加是 O(1)

`sessions/<id>/events.jsonl` 是会话的唯一历史，按设计**只追加不改写**
（揭示是「本体打标记 + 流尾追加公开副本」，编辑 / 删除才整表重写）。
这让追加可以做到常数时间，但有两个坑：

**一、seq 不能靠全量扫描算。** `append_event` 最初为了拿 `max(seq)+1`
把整个文件读进来解析一遍 —— 长会话里每说一句话就是一次全量读 +
全量解析，累计 O(n²)。现在改读**尾行**：JSONL 只追加不改写，尾行即
最大 seq。尾行解析不了（崩了一半 / 单行超过 1MB 读取窗口 / seq 为 0）
时退回全量扫描，正确性优先于速度。

**二、尾行没换行符必须补。** 上次写入崩一半时文件不以 `\n` 结尾，
直接 `writeln!` 会让新事件和那半行粘成同一行，两条都读不回来。
所以追加前先看尾字节，不是 `\n` 就先补一个。

**前端同样不能为刷新而整表重读。** `append_event` / `reveal_event`
现在返回落库的那条事件（含分配到的 seq），`useSessionEvents` 直接接到
列表末尾。整表重载只发生在切会话和低频人工操作（编辑 / 删除）时。

### 5.3 SQLite 索引

- `.anvil/index.db`，FTS5（trigram tokenizer）
- 重建判断：`PRAGMA user_version` 为 0，或 `cards / types / relations` 目录的 mtime 比 db 新
- **`values` 是保留字**，列名用 `values_json`

### 5.4 资源缓存

图片和音频统一走 **asset protocol**，不走 base64。

- 前端 `lib/assetCache.ts` 是模块级缓存，`relative path → asset URL`
- `loadAsset(relative)` → `ipc.assetAbsPath(relative)` → `convertFileSrc(abs)` → 缓存
- 用 `useSyncExternalStore` 订阅
- `invalidateAsset(relative)` 单条失效；`clearAssetCache()` 全清（关闭项目时调）
- **`read_image_data_url` 仍存在**，但只被 HTML 导出用于内嵌图片，前端渲染路径不用

### 5.5 音频资源

音频同样走 asset protocol。

- `open_project` 动态 `allow_directory` 项目根
- **不做 `forbid_directory`**：Tauri 2 的 deny 列表只增不减，调用会让同一路径在「关闭项目 → 重开」后永久被拒
- `asset_abs_path` IPC 返回绝对路径，前端 `convertFileSrc` 转成 `asset://` URL
- WebView 直接从磁盘读，不经过 IPC
- 支持格式：mp3 / ogg / wav / m4a

### 5.6 全局音频播放器

`lib/audioPlayer.ts` 是模块级单例。

- 只有一个 `HTMLAudioElement`，同一时刻只播一首
- 状态通过 `useSyncExternalStore` 订阅
- 组件卸载不停止播放（跨模块、跨设置持续）
- 音量 / 循环持久化到 `appSettings.playerVolume` / `appSettings.playerLoop`

三个 UI：

- `MiniPlayer`：右下角常驻，`position: fixed`，`bottom: calc(var(--statusbar-h) + 12px)`，有曲目时才渲染
- `PlayerInspector`：检查器内，显示当前曲目 + 进度 + 音量 + 循环
- `PlayerView`：音乐模块主区，列表 + 搜索 + 导入 + 播放 + 删除 + 引用计数 + 时长懒加载

### 5.7 最近项目

`localStorage` 存 `anvil.recentProjects`（上限读应用设置 `recentProjectsMax`）和 `anvil.lastOpenPath`。启动时尝试自动打开上次项目。主动关闭项目清 `lastOpenPath`。

---

## 6. 技术架构

### 6.1 技术栈

| 层            | 选型                                        |
| ------------- | ------------------------------------------- |
| 壳            | Tauri 2.x                                   |
| 后端          | Rust                                        |
| 持久化        | 文本文件 + SQLite 索引                      |
| 全文检索      | SQLite FTS5（trigram）                      |
| 资源包        | zip + walkdir                               |
| 无边框窗口    | tauri-plugin-frame                          |
| 文件对话框    | tauri-plugin-dialog                         |
| 前端          | React + TypeScript + Vite                   |
| 状态          | Zustand（slice 模式）                       |
| 拖拽排序      | @dnd-kit                                    |
| 包管理器      | pnpm                                        |
| Markdown 渲染 | react-markdown + remark-gfm（卡牌文档预览） |
| 剧本源码编辑  | CodeMirror 6（行号 / 高亮 / 补全 / 查找）   |
| 前端测试      | vitest（`pnpm test`）                       |

**已移除**：`@xyflow/react`（React Flow）—— 节点图删除后不再需要。

### 6.2 目录结构

```text
anvil/
├── src-tauri/
│   └── src/
│       ├── core/
│       │   ├── model/       # 数据模型
│       │   ├── store/       # 文本文件读写 + 索引 + 资源包（15 个领域文件 + mod.rs）
│       │   │   ├── assets.rs       # 图片 + 音频
│       │   │   ├── atomic.rs       # 原子写
│       │   │   ├── boards.rs
│       │   │   ├── cards.rs
│       │   │   ├── card_groups.rs
│       │   │   ├── docs.rs         # 卡牌附属文档（docs/<card_id>.md）
│       │   │   ├── export_html.rs  # HTML 导出（内嵌两态机阅读器）
│       │   │   ├── manifest.rs
│       │   │   ├── pack.rs         # 资源包导出 / 导入 / 合并 / 0.4 门禁
│       │   │   ├── preset.rs       # 内置预设注册表（build.rs 生成）+ 追加导入
│       │   │   ├── project.rs      # 项目打开 / 0.4 版本门禁 / 重载 / 索引判断
│       │   │   ├── relations.rs
│       │   │   ├── scenarios.rs    # 剧情元数据 + 剧本文件（scenarios/<id>/*.md）
│       │   │   ├── sessions.rs
│       │   │   └── theme.rs
│       │   ├── index/       # SQLite 索引 + FTS
│       │   └── ipc/         # Tauri 命令（按领域拆分）
│       └── lib.rs
├── src/
│   ├── core/                # IPC 类型 + 项目级动作
│   │   ├── ipc/             # api.ts · types.ts · index.ts
│   │   ├── applyProjectTheme.ts
│   │   ├── entityUndo.ts    # 删除的足迹采集与数据级恢复
│   │   ├── reloadIntoStore.ts
│   │   └── openProjectAt.ts
│   ├── lib/                 # 通用工具
│   │   ├── id.ts · time.ts · theme.ts · fontScale.ts · lookup.ts
│   │   ├── assetCache.ts · audioPlayer.ts · moduleOrder.ts
│   │   ├── toast.ts · confirm.ts · runWithError.ts · saveRegistry.ts
│   │   ├── dice.ts · appSettings.ts · commands.ts
│   │   ├── undoMerge.ts · refConfirm.ts · refAwareDelete.ts
│   │   └── recentProjects.ts
│   ├── hooks/               # 通用 hook
│   │   ├── useAppSettings.ts · useAssetUrl.ts · useCommands.ts
│   │   ├── useCreateProject.ts · useDeleteUndo.ts · useDraft.ts
│   │   ├── useExportPack.ts · useImportPack.ts · useKeyboard.ts
│   │   └── useOpenProject.ts
│   ├── components/
│   │   ├── ui/              # 纯 UI 原子（Modal / Toggle / SectionLabel / EmptyState / Toolbar / SaveInput / LabeledBlock）
│   │   ├── card/            # 卡牌领域（CardFrame / CardGrid / HoverPreview / ScaledCardFrame）
│   │   ├── field/           # 字段编辑（FieldInput / ImageField / RefField / AudioSelect / TypeMultiSelect）
│   │   ├── overlay/         # 顶层浮层（ToastHost / ConfirmHost / CommandPalette / PickerDialog）
│   │   └── layout/          # 通用布局（EntityListLayout）
│   ├── shell/               # 五段布局
│   │   ├── AppShell.tsx · TopBar.tsx · LeftNav.tsx
│   │   ├── Workspace.tsx · Inspector.tsx · StatusBar.tsx
│   │   └── ErrorBoundary.tsx
│   ├── themes/              # 内置主题定义
│   ├── features/
│   │   ├── cards/           # ★ 共享核心
│   │   │   ├── card/ · card-type/ · card-wall/ · relation/
│   │   ├── card-groups/
│   │   │   └── views/       # 卡片 / 列表视图
│   │   ├── story/
│   │   │   ├── scenario/    # 剧情设计 + 导出
│   │   │   │   └── inspector/   # 检查器内容
│   │   │   ├── engine/      # 剧本语义唯一实现（parser/eval/状态机/reader）
│   │   │   ├── play/        # React 侧：usePlayState 接引擎 + VN 舞台
│   │   │   │   ├── vn/      # VNStage 系列
│   │   │   │   └── panels/  # 变量面板
│   │   │   └── script/      # weave 剧本语言（parser / serializer / eval / __tests__）
│   │   │       ├── structured/  # 结构编辑
│   │   │       ├── source/      # 源码 + 预览（CodeMirror）
│   │   │       └── editor/      # 编辑器外壳：状态机 hook + 三个面板 + 小零件
│   │   ├── board/           # 棋盘
│   │   │   └── grid/        # 网格渲染与形状
│   │   ├── session/         # 跑团
│   │   │   └── chat/        # 对话流、掷骰、消息编辑
│   │   ├── player/          # 音乐模块
│   │   ├── project/         # 项目设置内容 + 资源包合并
│   │   │   └── theme/       # 主题编辑面板
│   │   ├── settings/        # 设置浮层
│   │   │   └── categories/  # 分类注册表与 impl
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
```

变量由剧本 `VAR` 行声明，类型按字面量推断（数字 / 布尔 / 字符串）。
运行时额外提供内置变量 `visited_<knot>`（该 knot 是否被扫过）。

骰子属于跑团（Session 事件），不属于剧情引擎。剧情条件不掷骰。

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

**组件**：`components/card/HoverPreview.tsx`

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

- 宽度 200–700，默认 320，可拖拽调整；拖拽条悬停 / 拖拽时现金线，**双击恢复默认宽度**
- 可折叠成 28px 竖条：
  - **鼠标移上去浮出预览** —— 预览是 `position: absolute` 的浮层，**不进 flex 流**，
    因此展开预览时中间工作区尺寸一动不动。若改用「把 28px 拉宽到 320px」的做法，
    每帧都在挤压主区，卡片墙 / 棋盘会被迫重排。
  - **`Ctrl+I`** 折叠 / 展开（输入框内放行，因为那里 `Ctrl+I` 是斜体）
- **跟着选中开合**：`story` / `player` 的检查器本身就是常驻工作区（剧本大纲、播放列表），
  不接管；其余模块下，**选中新对象自动展开，取消选中则自动收起**，宽度还给主区。
  同一个对象反复重渲染不会触发，手动折叠 / `Ctrl+I` 始终最高优先级。
- 宽度与折叠状态持久化到 `localStorage`（`anvil.inspectorPrefs`）
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

## 12. 剧情模块（即用户侧「视觉小说」模块；数据 / 体裁层称「分支故事」。三套说法指同一模块，见 §3.6）

### 12.1 布局

```
┌──────────────────────────────────────────────────────────────┐
│ 剧情名                    [▶ 运行] [导出 MD] [导出 HTML]      │
├────────┬─────────────────────────────────────┬───────────────┤
│ 文件树  │ 面包屑：文件 › 当前knot   保存状态   │  检查器       │
│        │ [结构][源码]   [搜索框]              │               │
│ *.md   │                                     │  剧情设置      │
│ + 新建  │  剧本编辑器                          │  （入口 knot） │
│        │                                     │  变量（只读）  │
│ knot   │                                     │  当前 knot     │
│ 大纲    │                                     │  @scene/@actor │
└────────┴─────────────────────────────────────┴───────────────┘
```

**顶部一行**：剧情名、运行、导出 MD、导出 HTML。

**左栏**（180px）：剧本文件树（增删文件、脏标记）+ knot 大纲
（跨文件合并解析，点击切文件并定位到行）。

**主区**：面包屑（当前文件 › 当前 knot）+ 保存状态 + 剧本内搜索 +
编辑器。结构 / 源码双 tab，光标行实时上报用于「当前 knot」显示，
外部定位（大纲 / 搜索命中点击）双向打通。

**检查器**（280px）：剧情设置（描述 / 入口 knot 下拉，来自全部文件的
knot 名）、变量只读面板（VAR 行解析）、当前 knot 信息（@scene / @actor）。

### 12.2 运行

点击「▶ 运行」→ **全屏覆盖层**。`Esc` 或顶部「关闭」按钮退出。

`PlayView` 挂载在覆盖层内。带打字机、背景、立绘、bgm、sfx、
变量面板（双列历史，可改值 / 重置）。

### 12.3 删除的部分

**节点图已删除**。原 `StoryGraphView` / `GraphNode` / React Flow 依赖、
`EdgeEditorPanel`、`ScenarioNodesEditor`、`ScenarioVariablesEditor`
全部移除。原因：

- 全图力导向布局无法建立空间记忆（位置每次重排）
- 节点间的分支编辑比表单操作更麻烦
- 剧本文本本身就是最好的分支视图，knot 大纲承担导航

---

## 13. 棋盘

**HTML 层渲染**：外层滚动容器 + 内层等比缩放 div + 背景图 + 网格（SVG 层）+ 关系线（SVG 层）+ Token（HTML 绝对定位）。

**Token 虚拟化**：只挂载视口内的 token。每枚 token 是一棵完整的 CardFrame
子树，几百枚全量挂载时拖拽每帧都要扛着整片林子——与卡片墙「首屏限额」
同源的思路，视口外的不进 DOM，滚动到位再挂。实现：`useVisibleRect`
（scroll / ResizeObserver / zoom 三路重算，scroll 走 rAF 合并，200px
屏幕缓冲；首帧在 layout effect 里同步算完，不先画一帧全量再裁剪）。
两条安全阀：**拖拽中的 token 强制渲染**（它跟着指针走，可能被甩出
缓冲圈，否则拖到一半会消失）；**框选命中与关系线仍走全量表**
（框选矩形可以超出视口，连到视口外 token 的关系边也一样存在）。
默认 token 尺寸（140×205）集中在 `constants.ts`。

**网格形状**：方格 / 点阵 / 横线 / 竖线。

**交互**：

- 拖拽 token：位置跟手，被拖的自动提到最前
- **Ctrl/Cmd + 滚轮缩放**：0.25× – 4×
- **Alt + 拖拽旋转**：Shift 吸附 15°
- 多选：Ctrl/Cmd 点击加入集合
- **框选**：空白处左键拖拽拉框，一次选中框内所有 token
- **平移**：空格 + 拖拽，或中键拖拽
- **测量**：工具栏「测量」开关，空白处拖拽即量距离，实时显示格数 + px
- **双击 token**：翻转 `face_down`
- **单击卡盒**：弹出抽牌面板

**网格偏移**：`GridConfig.offset_x / offset_y` 是格内相位（`-size..size`），
四种形状都按它平移起画点，用于把网格对齐到背景图上的实际格线。

**关系线**：

- 只世界观边
- 工具栏「显示关系」开关，默认关闭
- 配置持久化到 Board
- **聚合**：同一对 token 之间的 >= 2 条关系合并为一条粗线 + 中央数字徽章
- 有向带箭头，无向不带
- 线在 token 之下，不可交互

**工具栏**：名称、网格开关、吸附、格大小、网格偏移、形状、宽高、背景、从卡组导入、从卡组加卡盒、显示关系、关系过滤、加卡、加占位、缩放、测量、历史、批量操作。

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

**同步卡组**：右键卡盒 → 「同步卡组（+N）」。把卡组里新增的卡按组顺序
补进 `initial` / `remaining`（多重集差额语义，同名多份不吞；已抽走的牌
不影响，补的进 remaining 尾部）。组里被移除的卡不动（只补不删）。
无新卡或卡组已删时菜单项禁用，状态写在 label 里。记 `board.pile` 事件，
走普通撤销栈。语义详见 §4.7。

**占位 Token**：

- 工具栏「+ 占位」创建
- `card_id: null`，显示为灰色边框 + 名称
- 用于位置标记

**卡背**：优先级 `CardType.card_back` → `Manifest.default_card_back` → 内置图案（双层菱形描边 + "Anvil" 字样）。

**Token 属性**：检查器有宽高比锁定按钮（🔒/🔓），纯 UI 状态。

**批量操作**：`useBoardActions.deleteSelectedTokens(ids)` 支持批量删除 + 撤销。
选中多枚后底栏给出批量翻转 / 置顶 / 置底 / 连线 / 删除。

**落子历史（牌谱）**：

- 存储：`boards/<id>/events.jsonl`，与会话事件（§14.6）同一套 JSONL 机制，
  复用同一个 `Event` 形状（seq / at / kind / payload / note）。只追加，
  尾行即最大 seq（算 seq 不读全文件，见 §5.2）。
- 记录点：落子（加卡 / 占位 / 卡组导入 / 创建卡盒 / 复制）、移动、翻面、
  层序调整、删除、卡盒动作（抽 / 洗 / 重置）。
- 事件种类：`board.place` / `board.move` / `board.flip` / `board.layer` /
  `board.delete` / `board.pile`。payload 里带写入时就算好的 `summary`，
  读的时候不必再回头查卡牌名。
- **不参与撤销**：撤销回滚棋盘状态，牌谱里那一条仍是「当初确实这么走过」。
  单条可删 —— 只擦记录，不动棋盘。
- 面板：工具栏「历史」开关，右侧栏按时间倒序列出。
- 删棋盘时连同 `boards/<id>/` 整个目录清掉，不留孤儿事件文件。

**导入 / 导出**：

- 导出：列表行「导出」→ 单个 JSON
  （`{ kind:"anvil-board", schema_version, board, events }`），
  棋盘 + 它的落子历史。卡牌本体不跟着走 —— 棋盘只持有 `card_id` 引用。
- 导入：列表头部「导入棋盘…」→ id 撞车时重发 id，**不覆盖既有棋盘**；
  历史 seq 重新分配。非棋盘文件或版本不符直接报错，不静默吞掉。
- 缩略图：列表里按 token 真实坐标画的 SVG 迷你布局图（不是截图 ——
  不渲染卡面、不等资源、棋盘一改就跟着改）。卡盒 / 背面朝上用不同颜色区分。

---

## 14. 跑团记录

> **0.4.x 精简**：战斗（先攻追踪）与帷幕（KP / 玩家双层视图）已整体删除，
> 棋盘从本模块剥离。理由与删除清单见 §14.1、§14.2。
> 分析过程存档在 `docs/TRPG-SIMPLIFY-PLAN.md`。

**布局**：顶栏（会话名 + 队伍卡组选择）+ 两栏（对话流 | 角色面板）。

### 14.1 模块边界

跑团模块解决的问题是：**一局跑团结束后，能完整、可信、可回看地留下「发生了什么」。**

四条边界规则 —— 任何新需求先过这四条，过不了就不进模块：

1. **不判定。** 不引入规则集、目标值、成败标签。掷骰只记录点数。
   判定要读卡、读状态、读武器护甲，那是规则引擎，越过了本项目边界。
2. **不做协同。** 不引入多端、分屏、实时同步。视图是滤镜，不是协作。
3. **不另建角色模型。** 角色数值一律读写卡牌字段，会话只持有卡组引用。
4. **不管棋盘。** 棋盘归棋盘模块。会话不存棋子，也不绑定棋盘。

**为什么删战斗**：先攻追踪是 §14.4「掷骰不做判定」这条边界划出之后遗留的
半截设计 —— 它保留了「轮到谁」的战棋骨架，却抽掉了让骨架产生意义的血肉。
最直接的证据：`combat.turn` 事件在对话流里没有渲染分支，落到了
`systemText` 的 default，显示为英文 kind 原文。战斗确实发生了，
却在叙事记录里留不下任何可读痕迹。

**为什么删帷幕**：单机同屏下，KP 全景 / 玩家视图是同一台机器上的两个滤镜。
所有「为玩家在场而设计」的设施都缺少使用场景。删掉视图过滤后
`Event.visibility` 就失去了意义 —— 秘密消息变成「谁都看不见」，
与之绑定的暗骰、揭示机制、`chat.reveal` 副本一并移除。

### 14.2 会话与事件

`Session` 只持有 `{ id, name, group_id, state }`。队伍 = `group_id` 指向的
卡组成员，角色的数值仍活在卡牌上（§14.5）。

事件类型精简后只剩两类：

```text
chat.say · chat.action · chat.roll · chat.narration · chat.ooc · chat.whisper
session.start
```

删除项及其理由：

| 事件 / 字段                                                          | 处置理由                                   |
| -------------------------------------------------------------------- | ------------------------------------------ |
| `combat.round` / `combat.turn`                                       | 战斗已删                                   |
| `board.step`                                                         | 棋盘已剥离                                 |
| `session.end` / `token.move` / `state.set` / `note` / `effect.apply` | 有渲染分支但全前端无产生方，属零收益复杂度 |
| `Event.visibility` / `revealed` / `chat.reveal`                      | 帷幕已删                                   |
| `Session.board_id` / `tokens` / `tracker`                            | 棋盘已剥离、战斗已删                       |

**kind 名保持不变**：`board.step`、`combat.*` 等已落盘的事件不迁移，
只是前端不再渲染它们。旧会话打开后这部分历史不可读 —— 这是删除的既定代价。

### 14.3 骰子

`lib/dice.ts` 是唯一真相源（剧情模块的 `~` 赋值也走它）。

```text
表达式 := 项 (('+' | '-') 项)*
项     := 骰子项 | 数字
骰子项 := [个数]d<面数 | %> [取舍]
取舍   := kh 保留最高 | kl 保留最低 | dh 丢弃最高 | dl 丢弃最低
```

例：`1d20`、`2d6+3`、`1d8-2`、`4d6dl1`、`2d20kh1+5`、`1d20+1d4`、`d%`、`5`。

**解析与掷骰分离**：`parseDiceExpression` 不产生随机数，
`validateDiceExpression` 供编辑器实时校验使用。

### 14.4 掷骰不做判定

Anvil 只记录点数，不判定成败。掷骰面板接受一个表达式与一句可选说明，
结果写成 `chat.roll` 事件：`{ expr, result, detail, dropped }`。
表达式初值取上次使用的那条（`appSettings.lastRollExpr`），不按系统预置。

曾经存在的「规则集」（generic / coc7 / dnd5e）与 8 级判定标签（大成功 →
大失败）在 0.4.0 移除，原因有三条：

1. 阈值表硬编码在三个内置项里，**不可编辑**，与文档承诺不符；
2. 真实数据中从未被使用（项目里 76 条掷骰记录全部没有目标值）；
3. 判定要读卡、读状态、读武器护甲，那是规则引擎，越过了本项目的边界。

**边界**：Anvil 记录「掷出 13」，**不回答「13 对 DC 12 算不算成功」**。

### 14.5 角色面板：数据活在卡牌上

`PartyPanel` 不再是「头像 + 名字 + 类型名」，而是角色卡面板。
成员来自会话绑定的卡组 —— 会话只持有引用，不加一层自己的队伍模型：

- **HP 条**：读取卡上 `hp` / `max_hp` 字段（兼容 `生命值` / `最大生命值` 等别名），
  改动**直接写回卡牌本身**。没有这些字段就不画血条 —— 有数据才呈现，不假装有。
- **属性即骰点入口**：卡类型里所有 `number` 字段自动成为按钮，点击打开掷骰面板
  并把「角色 · 属性」预填进说明。用户定义了什么属性，就能为它掷骰。
  Anvil 不预设技能名，不推导调整值，也不判定成败。

这条是硬约束：**角色的一切数据都活在卡牌上**。
另建一套角色模型会绕过 `features/cards` 这个共享核心。

### 14.6 消息样式

say / action / roll / narration / ooc / whisper。

**存储**：消息写入 `events.jsonl`。

**会话内没有卡盒**：抽牌是棋盘模块的能力（§13）。会话的棋盘引用已剥离。

### 14.7 长会话：三条成本线

一局跑团可以积累几千条事件。三条成本线各自处理，别让任何一条退化成 O(n²)：

**读**：追加只读尾行拿 seq，详见 §5.2。

**传**：`append_event` / `reveal_event` 返回落库的那条事件，前端接到列表末尾。
整表重载只留给切会话与低频人工操作（编辑 / 删除）。

**渲染**：对话流**限额渲染** —— 首屏 300 条，往上翻有「加载更早」。
没有引虚拟列表库，理由有两条：消息高度差异极大（一行对白 vs. 带骰点明细的
roll vs. 整段旁白），估算高度会错位；而限额 + 按需加载是聊天气泡的既有交互，
用户本来就知道往上翻要加载。前插时按锚点补回 `scrollTop`，视口不跳。

配套的两处小优化：卡表建一次 `Map`（此前每条消息各自线性扫一遍 `cards`，
N 条消息 × M 张卡）；`ChatMessage` 加 `memo`，且调用方的三个回调用
`useCallback` 稳住身份 —— 不然后者会让 memo 形同虚设。

自动滚底部也加了判断：只有本来就停在底部（60px 内）才跟着新消息滚，
否则用户正翻历史时会被一条新消息拽走。

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
│   ├── back-styles/
│   │   ├── types.ts · registry.ts
│   │   └── impl/
│   │       └── anvil.tsx · rune.tsx
│   └── foil-styles/
│       ├── types.ts · registry.ts
│       └── impl/
│           └── gold.ts · silver.ts · rainbow.ts
└── styles/                风格实现
    ├── types.ts · registry.ts
    └── impl/
        ├── YuGiOh.tsx · Generic.tsx · Minimal.tsx
        ├── MTG.tsx · Pokemon.tsx · Rainbow.tsx · Anvil.tsx
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
3. `DEFAULT_CARD_FRAME_STYLE`（anvil）

| 风格                                                     | key       | 视觉定位                                                                                                      |
| -------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| 游戏王                                                   | `yugioh`  | 金属渐变外框 + 羊皮纸描述框 + 星号等级                                                                        |
| 通用                                                     | `generic` | 深底细描边 + 顶部色条 + 底部属性行                                                                            |
| 极简                                                     | `minimal` | 无外框 + 左竖条 + 大留白                                                                                      |
| 万智牌                                                   | `mtg`     | 深色石质外框 + 顶部标题条 + 底部羊皮纸文字栏                                                                  |
| 宝可梦                                                   | `pokemon` | 浅色圆角 + 顶部标题 + HP + 艺术图                                                                             |
| 彩虹                                                     | `rainbow` | 七色渐变外框 + 渐变首字 + 渐变星级                                                                            |
| 铁砧锻造                                                 | `anvil`   | 矮人锻造风：锻铁外框+四角铆钉+铁制标题板+羊皮纸文字框，以 yugioh/mtg 的 TCG 骨架为母本、覆以铁/木/火/纹章材质 |
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

Markdown（weave 语法），一剧情一目录（`scenarios/<id>/`），可多文件。
剧本按 **knot** 分段，跳转 / 分支 / 条件 / 变量全部内联在剧本里。
16 种行类型：

```text
=== knot 名         → knot 段落（跳转目标；. 子分段仅编辑器展示）
VAR 变量 = 字面量    → 变量声明（类型按字面量推断：数字/布尔/字符串）
> 文本              → 旁白
**说话人**（表情）：文本 → 对白（说话人按名字匹配卡，立绘读 portrait_<表情>）
*文本*              → 动作
@bg 路径            → 背景切换
@bgm 路径           → 音乐切换
@sfx 路径           → 音效
@scene 卡名         → 场景卡引用（0.4 仅 parser 识别，运行时联动是扩展点）
@actor 卡名         → 角色卡引用（同上）
-> knot 名          → 跳转（全局索引按名字解析，跨文件可跳；END 结束）
* 选项文本          → 选项（连续 * 行成组，组内后续行是该选项 body）
- 文本              → 汇合（gather，选项组后第一个 - 行是汇合点）
{表达式: 文本}      → 条件（满足才显示文本；无冒号则只做门槛）
~ 变量 操作符 值    → 赋值（操作符：= += -=）
<>                  → 粘合（下一文本行与前一显示行拼接）
```

frontmatter（`---` 包围）可写：`bg` / `bgm` / `is_ending` / `ending_name`。

行内条件 `{expr: A|B}`：`|` 分隔分支（双引号内的 `|` 不算），渲染前按
求值结果取分支替换。仅旁白 / 对白 / 动作三种文本行支持。

条件表达式前端本地求值（`script/eval.ts`，递归下降）：运算符
`== != < <= > >= && || ! +`；字面量数字 / 双引号字符串 / 布尔；标识符
从变量表与内置变量（`visited_<knot>`）读取。不走 IPC。

运行时是**两态机纯函数**（`story/engine/machine.ts`，预览与导出件共用）：`continueStep` 推进一行，
`chooseStep` 选择选项分支。状态 = `(file, pc, choice 状态, visited 集, 变量表)`。
循环保护：单次运行最多 1000 步。

### 16.2 剧本编辑器

三栏布局（见 12.1）。编辑区双 tab：

- **结构**（默认）：行卡片列表，每行一个类型选择器（16 种）+ 对应字段。
  支持拖拽排序，回车新建下一行（类型延续）
- **源码**：CodeMirror 6 编辑 Markdown

结构视图行内：

- knot 行：knot 名输入
- var 行：变量名 + 字面量双输入
- 对白行：说话人 + 表情 + 内容
- 音效 / 音乐行：`AudioSelect` 音频选择器
- 背景行：图片路径文本
- 场景卡 / 角色行：卡名输入
- 跳转行：knot 下拉（全部文件的 knot 名 + END）
- 选项 / 汇合 / 条件 / 赋值 / 粘合行：对应文本与字段输入
- 旁白 / 对白内容 / 动作 / 条件文本使用 `AutoGrowTextarea` 自动增高；
  粘贴多行文本自动拆分为多条脚本行

源码编辑器（CodeMirror 6）：

- 行号、语法高亮（`StreamLanguage` tokenizer，16 种行类型）、
  `Ctrl+F` 查找、撤销重做、自动折行
- 上下文补全：`@bg/@bgm/@sfx` 资源路径、`@scene/@actor` 卡名、
  `->` knot 名（附 END）、`~` 变量名、`{}` 变量 + `visited_*`、
  `**` 说话人（项目卡名）
- 快捷键：`Ctrl+B` 包裹 `**…**`、`Ctrl+I` 包裹 `*…*`、`Ctrl+Enter` 插入 `-> `
- 跨 tab / 文件切换后光标与滚动位置恢复（按 `scenarioId:文件名` 缓存）
- 右侧「大纲」tab：汇总跳转 / 条件 / 赋值行，点击定位到对应源码行

数据流：每个文件 `content` 是唯一真源。结构视图解析 → 编辑 → 序列化回
`content` → 防抖自动保存到 `scenarios/<id>/<文件名>`（`save_scenario_script`）。

**自动保存延迟**：默认 800ms；超过 500 行的文件延迟加倍（1500ms），
切换文件 / 增删文件前立即落盘全部脏文件。

### 16.3 导出 Markdown

剧情 → 导出按钮 → 保存对话框 → `剧情名-剧本.md`。

输出结构：标题 + 简介 + 入口 knot 标注，之后每个 knot 一个二级标题。
入口 knot 排第一，其余按从入口出发的首次可达顺序编号（不可达的按文件
顺序补后）。choice 渲染为嵌套列表，gather 标注「汇合」，多文件时标题
后缀来源文件名。

### 16.4 导出 HTML

单文件 HTML，图片 base64 内嵌，音频不导出。目标：

- 支持：文本、背景图、**角色立绘（说话人按名匹配卡，读 `portrait` /
  `portrait_<表情>` 并 base64 内嵌，say 行渲染头像）**、点击推进、选项分支、
  条件、赋值、行内条件、粘合、打字机、结局（frontmatter `is_ending`）、重玩
- 不支持：动画、转场、音频播放（bgm / sfx 只显示为文本行）、存档、成就

技术要点：整条流水线只有**一份**剧本语义实现——
`src/features/story/engine`（parser + eval + effects + 状态机 + reader）。
它有两个消费者：

1. 预览：`play/usePlayState.ts` 直接 import；
2. 导出：`scripts/build-reader-runtime.mjs` 把它打成 IIFE
   （`src-tauri/src/core/store/reader_runtime.js`，生成物），Rust 用
   `include_str!` 内联进模板的 `__RUNTIME__` 占位符。

Rust 侧只收集 ExportData（场景元数据 + 全部文件原始行 + 资源 dataURL）
与渲染 DOM（打字机、选项按钮、结局界面），**不解析任何剧本语法**，
也不推断变量类型。固定中性深色主题。

#### 防漂移的三道闸门

| 闸门       | 位置                                                                                                                                                     | 拦什么                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 产物新鲜度 | `package.json` 的 `test` 前置 `check:runtime`：重新构建并逐字节比对                                                                                      | 改了引擎忘了 `pnpm build:runtime`                              |
| 行为对拍   | `__tests__/exportParity.test.ts`：执行产物原文（`?raw` + `new Function`）跑同一批剧本，比对显示行/选项/变量/visited/bg/bgm/结束/错误；骰子用同种子随机源 | 引擎内部被绕过、或产物与源码语义不一致                         |
| 导出件冒烟 | `__tests__/exportTemplate.test.ts`：模板脚本原文 + 产物，在最小 DOM 桩上真跑「推进 → 选项 → 汇合 → 结局 → 重开」                                         | 模板胶水层写错（`reader.choose` / `frontmatter` 之类调用失误） |

`__tests__/fixtures/varDefs.json` 是变量类型推断的契约表，作为语言规则
的可执行说明保留（Rust 侧的 `var_to_def` 已随第三份实现一并删除）。

引擎的硬约束（由冒烟测试的「产物不引用 DOM / Node 运行时」把守）：
`engine/` 及其依赖闭包不得出现 DOM、React、IPC、store。

已知且接受的不一致：导出件不建模场景卡与跨行立绘，`@scene` / `actor`
只推进；重复选项标签在导出件里按标签去重。

### 16.5 剧本内搜索

`scenario_script_fts`（FTS5 trigram）索引 `scenarios/*/` 下全部 .md 文件。
`save_script` / `delete_script` 增量维护，`rebuild_index` 全量重灌。
剧情编辑器顶栏搜索（≥3 字），命中显示 `文件:行号` + 高亮片段，
点击切换文件并定位到行。

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
├── scenarios/        # 一剧情一目录（scenario.json + *.md）
├── sessions/
├── card_groups/
├── docs/             # 卡牌文档
└── assets/
    ├── images/
    └── audio/
```

导出时更新 `manifest.updated_at`。跳过以 `.` 开头的文件 / 目录，以及 `node_modules` / `target`。

### 18.2 导入（覆盖式）

选包 → 选目标目录 → 解压 → 自动打开。防路径遍历（拒绝含 `..` 或绝对路径的条目）。

**版本门禁**：导入前检查包内 `manifest.json` 的 `schema_version`
（`ensure_pack_schema`），不是 `0.4` 直接报错。

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
- **剧情**：选择性导入，ID 冲突跳过。整目录复制（`scenario.json` + 全部
  剧本 .md）；ID 冲突时连目录一起跳过。`entry_knot` 原样保留
- **棋盘**：选择性导入，ID 冲突跳过
- **会话**：选择性导入，ID 冲突跳过。事件重新分配 `seq`
- **卡组**：选择性导入，ID 冲突跳过。保留原 ID，卡组内引用只保留本次导入的卡
- **图片**：同名跳过，不同名复制
- **音频**：合并时**不处理** `assets/audio/`（已知缺口，见 §24）
- **Manifest**：目标项目的元数据不被覆盖

### 18.4 内置预设

内置预设是编译进二进制的 0.4 项目快照。**现内置 4 个 0.4 格式预设**。

**预设以源码目录维护**：每个预设是 `src-tauri/presets/<id>/` 下的**普通 0.4
项目目录**（JSON + 资源），由 `build.rs` 在编译期 zip 成字节，生成
`OUT_DIR/preset_bundles.rs`（`pub static PRESETS: &[PresetDef]`），
`preset.rs` 用 `include!` 引入。因此预设是可版本化、可 diff 的纯文本，
无需手写二进制 ZIP。新增预设只需：

1. 在 `src-tauri/presets/<id>/` 建一个 0.4 项目目录；
2. 放入 `preset.json` 元数据 `{ "id", "label", "description" }`。

> **坑**：导入器只读 `cards/<子目录>/*.json`，卡**必须**放在 `cards/` 的
> 子目录里；直接放 `cards/*.json` 会被静默跳过。

**四个预设（对应四类典型意图）**：

| 预设                          | 卡类型                                     | 关系类型                  | 演示重点                           |
| ----------------------------- | ------------------------------------------ | ------------------------- | ---------------------------------- |
| `ttrpg` 跑团战役 · 矮人矿镇   | 角色 / 地点 / 怪物 / 物品                  | 敌对 / 同盟 / 从属 / 位于 | 棋盘 + 会话 + 卡牌三支柱           |
| `vn` 视觉小说 · 矮人王与勇者  | 角色（带 `portrait` 立绘）/ 场景（带背景） | —                         | 立绘 + 场景联动、HTML 导出内嵌立绘 |
| `tcg` 卡牌游戏 · 元素对决     | 卡牌（费用 / 攻 / 防 / 稀有度）            | 进化 / 克制               | 卡组 + 关系                        |
| `world` 世界设定集 · 铁炉编年 | 概念 / 阵营 / 人物 / 地点 / 事件           | 属于 / 对立 / 引发        | 纯设定，无演出                     |

判定「典型性」的原则：命名用**用户语言**（跑团 / 视觉小说 / 卡牌 / 设定）；
卡类型与关系用**领域常识默认值**；每个预设**必须触发它要展示的特性**
（例如 VN 预设不带 `portrait` 卡，立绘功能就看不见）；全部 0.4 合规。

预设导入仍走「追加副本」语义：内容实体全部重新生成 UUID；与现有项目
同名的实体加 `(2)` / `(3)`；卡类型与关系类型按**名字**复用；剧情整目录
复制。不修改目标项目的 manifest。导入前同样检查 0.4 门禁。

---

## 19. 撤销 / 重做 / 自动保存

**撤销栈**：内存中，上限 100 条，关项目清空。

**自动保存**：`useDraft` 监听 draft 变化，默认 800ms 落盘（延迟由 `appSettings.autoSaveDelayMs` 提供）。`registerFlusher` 让 `Ctrl+S` 时 `flushAll()` 立即保存所有脏 draft。

**快捷键**：`Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` / `Ctrl+S` / `Ctrl+K` / `Ctrl+M` / `Ctrl+I` / `Ctrl+1..5`

**批量操作进撤销栈**：删除卡片、关系、token、剧情、棋盘、会话、类型、卡组都支持撤销。卡盒抽牌 / 洗牌 / 重置也支持。

### 19.1 数据级撤销，不是动作级

撤销栈的机制（LIFO、100 条上限、失败回滚）本身没问题。问题出在调用方的 restore 普遍写成「把动作前的整个实体写回去」。那样只要用户在撤销前又动了同一个实体 —— 拖了下别的 Token、改了棋盘宽度、推进了一个回合 ——后来的编辑就会被旧快照整个吞掉。更糟的是删 Token 那条：restore 调的是`onSave(token)`，而 `onSave` 按 id 做替换，棋子已经不在列表里，替换找不到目标，恢复就这么静默失败了。

所以恢复一律走合并，规则只有一条：

> **当前值仍处于动作完成那一刻的状态，才回滚到动作前；否则说明用户之后
> 又改过，保留用户的版本。**

`lib/undoMerge.ts` 是这套规则的原语：

- `mergeListById(before, after, current)` —— 列表按 id 对齐。本动作删掉的
  按**原索引**插回；本动作改过而用户没再动的回滚；用户之后又改了的保留；
  用户后加的保留。重做时把 `before` / `after` 对调，语义对称。
- `mergeEntity(before, after, current)` —— 实体按键合并。只遍历本次改动
  碰过的键；嵌套普通对象递归（棋盘 grid 改可见性，不会连带吞掉之后改的
  吸附）；带 id 的列表走上面那个；无 id 的数组按整体值判断。

`core/actions/entityUndo.ts` 负责删除操作的撤销。删卡时后端会连带摘掉
棋盘棋子、卡盒、关系两侧与卡组成员（§4.9），所以删除**前**先从
store 采集一份足迹，撤销时按 id 与当前状态合并，只把这次删除摘掉的东西
按原位置放回去：

| 后端动作                          | 撤销动作                               |
| --------------------------------- | -------------------------------------- |
| Remove：整枚摘掉棋子              | 按原索引插回                           |
| Detach：断开 `card_id`、留墓碑名  | 恢复 `card_id`；名字仍是墓碑才恢复名字 |
| 卡盒 `remaining` / `initial` 摘牌 | 插回原位置，`total` 跟着 `initial`     |
| 关系两侧删除                      | 缺的才补，不覆盖用户后建的同 id 边     |
| 卡组成员被摘                      | 插回原位置                             |
| 会话 `group_id` 被解绑            | 用户没选别的队伍才还回去               |

用户在删除之后又做的编辑全部保留 —— 拖动过的位置、改过的名字、
另选的队伍。这是「合并」相对「写回快照」唯一重要的事。

**写撤销栈的两条纪律**：

1. 撤销 / 重做里读状态一律走 `useProjectStore.getState()`，不要用组件
   渲染时捕获的旧对象。
2. `do` 里闭包的是动作那一刻的旧状态时，必须自己提供 `redo`
   （`useDeleteUndo` 支持 `redo` 选项），否则重做会把用户在此期间的编辑
   整个吞掉。

`useDraft`（编辑器自动保存）走同一条路：`resolveCurrent` 选项让恢复时现取
store 里的当前实体，只回滚本次改动碰过的键。不提供的编辑器仍按旧行为整体
写回 —— 那条路上，用户在保存之后通过别的面板做的改动会被吞掉
（典型：改完卡牌名去角色面板改 HP，再 Ctrl+Z，HP 跟着回滚）。
目前五个编辑器（卡牌 / 卡组 / 卡类型 / 关系类型 / 剧情）都已接上。

---

## 20. 命令面板

`Ctrl+K` 打开。命令来源：

- **导航**：5 个模块（world / story / board / session / types）—— 卡组 / 音乐两个模块无独立导航命令，不在其列；全模块见 §11
- **界面**：重置模块排序
- **项目**：打开 / 新建 / 导入资源包 / 合并资源包（+ 有项目时：导出 / 刷新 / 关闭）
- **编辑**：撤销 / 重做（有项目时）
- **结果源**：卡牌全文检索（有项目时）
- **播放**：音频播放器（有项目时，`Ctrl+M`）
- **打开卡牌**：快速跳转到某张卡（有项目时）
- **最近项目**：最近 5 个

### 20.1 结果源：为什么不是「一张卡一条命令」

卡牌检索最初的做法是在 `useGlobalCommands` 里给每张卡注册一条
`open.card.<id>` 命令。两个问题：

- **一万张卡就是一万条注册**，而 `register` 每次都 `notify()` ——
  打开项目的瞬间是一万次全量重算。而且 effect 依赖 cards 指纹，
  改一张卡名就把全部命令注销重注册一遍。
- **只匹配卡名。** FTS（`cards_fts` + `docs_fts`）能搜字段值与文档正文，
  那条路完全够不到。

所以面板加了「结果源」概念（`lib/commands.ts` 的 `ResultSource`）：
面板拿着 query 去问源，源现查现给。卡牌增删改名不触发任何重新注册。

```text
CommandPalette
  ├─ 静态命令   registry.list()        （useSyncExternalStore 订阅）
  └─ 动态结果   registry.listSources()  （挂载时注册一次，渲染时现取）
```

### 20.2 排序：强匹配的静态命令永远排最前

静态命令与动态结果混排时的规则（`paletteRanking.ts`，7 个用例）：

- **标签以 query 开头、或某个关键词正好等于 query 的静态命令排最前。**
  否则输入「撤销」会被一堆正文里提到「撤销」的卡牌挤下去，回车打开一张卡。
- **其余静态命令排在动态结果之后。** 这样输入一个卡名时卡牌结果就在最上面 ——
  这正是接入检索的目的。
- 动态结果**不**按 query 二次过滤：源已经选好了，而命中可能来自字段或
  文档正文，label 里根本没有那个词。

### 20.3 卡牌结果源的两条查询路径

`cardResultSource.ts`：

- **≥3 字符走 FTS**（`ipc.searchCards`，limit 20）。trigram 分词至少要 3 个
  字符才匹配得上。返回的 id 按 FTS 相关性排序，映射回卡时保持这个顺序。
  索引里可能残留已删卡的 id，映射时滤掉。
- **<3 字符走本地名字过滤**（store 里已载入的卡）。行为与卡片墙一致。
- FTS 抛错或零结果时也退回本地过滤，不让面板空手。

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

| 键                      | 默认      | 分组   | 说明                                 |
| ----------------------- | --------- | ------ | ------------------------------------ |
| `fontScale`             | `1.0`     | 外观   | 界面缩放，0.75–1.5                   |
| `autoSaveDelayMs`       | `800`     | 编辑器 | `useDraft` 自动保存延迟              |
| `recentProjectsMax`     | `10`      | 编辑器 | 最近项目记录上限                     |
| `typewriterSpeed`       | `35`      | 编辑器 | 毫秒 / 字                            |
| `typewriterEnabled`     | `true`    | 编辑器 | 全局开关                             |
| `typewriterNarration`   | `false`   | 编辑器 | 旁白是否也打字机                     |
| `defaultCardFrameStyle` | `"anvil"` | —      | 应用级默认卡框风格（项目未设时生效） |
| `playerVolume`          | `0.7`     | —      | 播放器音量（只由播放器 UI 调）       |
| `playerLoop`            | `false`   | —      | 播放器循环（只由播放器 UI 调）       |

**界面缩放**：`#root` 上的 CSS `zoom`（`lib/fontScale.ts`）。

**响应式**：`useAppSettings` 基于 `useSyncExternalStore`。

**恢复默认**：高级分类提供，同时重置 `moduleOrder`。

### 22.3 高级

- **清除缓存**：清空 `assetCache`。不影响项目数据
- **恢复默认设置**：重置 `anvil.appSettings` + `anvil.leftNavOrder`

---

## 23. 里程碑

**M1 — 卡牌核心** ✅
**M2 — 关系** ✅（图谱视图已移除：节点图 / React Flow 在 §6.1、§12.3 删除，关系仅以列表 + 棋盘连线呈现，不做力导向布局，见 §25.3）
**M3 — 分支故事** ✅
**M4 — 棋盘与跑团** ✅
**M5 — 分享与扩展** ✅

**M6 — 打磨与生态** ✅

已完成：CardFrame 视觉统一、检查器联动、最近项目、棋盘缩放/背景/旋转、卡框标签自定义、效果支持骰子、字段拖拽排序、批量选择、投骰日志、撤销覆盖 bulk、图片资源管理、数据统计、内置主题、多风格卡框、卡框强调色参数化、应用设置面板、目录结构整理、卡组功能、闪卡、卡背、翻牌、卡盒抽牌、骰子重构、类型复制、卡图裁剪、占位 Token、大文件拆分、音频资源管理、卡牌悬浮预览、seed 重构、错误处理统一、UI 小组件抽取、网格形状、界面缩放、CardFrame 接口重构、剧情模块改造、银箔闪卡。

**M6.5 — 视觉小说** ✅

已完成：阅读器、剧本结构化编辑器、剧本行拖拽排序、立绘多表情、剧本解析与序列化、导出 Markdown、导出 HTML、bgm / sfx 播放。

**0.2.0 已发布**（2026-10-09）。

**0.3.0 已发布**（2026-10-13）—— 音频播放器 + 音乐模块、无边框标题栏、LeftNav 可拖拽排序、TopBar 极简化、设置面板重构、剧情模块改造（内联逻辑剧本）、银箔闪卡、卡框渲染分层、资源管理搜索、卡组卡片视图、多预设 / 添加预设、闪卡与卡背风格注册表化。

**Unreleased 开发中** —— 剧情边彻底删除、剧本语言扩展到 10 种行类型、CodeMirror 6 源码编辑器、卡牌附属文档、卡组多份引用 + 按类型生成、出框（卡图框外溢出显示，区别于「裁剪 image_crop」）删除；裁剪功能保留（见 §15.4）。

**0.4.0（未发布，开发中）** —— **剧本格式破坏性重写（schema 0.4，硬门禁不迁移）**：剧本从场景卡分支图改为 weave 多文件 + knot 语法（16 种行类型，支持 `@scene/@actor` 卡引用解析）、两态机运行时（条件求值 + 赋值 + `visited_` 内置变量 + 循环保护）、`scenarios/<id>/` 一剧情一目录多文件、schema 0.4 打开 / 资源包 / 预设三重门禁、三栏剧情编辑器（文件树 + knot 大纲 / 结构·源码 / 检查器）、剧本内 FTS 搜索、导出 knot 化（MD 按可达顺序编号 / HTML 内嵌两态机）、引入 vitest 前端测试、内置预设换成 4 个 0.4 预设。

**0.4.x 跑团精简** —— **删除战斗**（先攻追踪条、先攻设置对话框、`combat.round` / `combat.turn` 事件、`Session.tracker`）、**删除帷幕**（KP / 玩家双层视图、`Event.visibility` / `revealed`、`chat.reveal` 副本、暗骰、揭示机制）、**剥离棋盘**（`Session.board_id` / `Session.tokens`、内嵌 `BoardCanvas`、牌谱 `boardRecord` + `BoardReplay`、会话内抽牌）、清理五个无产生方的系统事件分支；队伍改为引用卡组（`Session.group_id`）。模块从 4 371 行降到约 1 500 行。

---

## 24. 待办清单

> 进度以 §23 里程碑为唯一真源。本节「已完成」仅镜像已落地项，「待办」为尚未启动项；避免三处清单各自漂移。

**P2（提升与优化）**

- [ ] 时间线视图
- [ ] 图片缩略图
- [ ] 命令面板性能
- [ ] 文件监听（notify）
- [x] 卡组同步到棋盘（只补不删）—— 已落地：卡盒右键「同步卡组（+N）」，
      多重集差额补入 initial / remaining，见 §4.7 / §13
- [ ] 位置单元（Cell）—— 命名位置 + 吸附布局
- [ ] 资源包合并支持音频
- [x] `@scene` / `@actor` 运行时联动（卡立绘 / 场景背景自动应用）—— 试玩已按说话人名匹配卡渲染立绘、接入场景信息浮层；HTML 导出内嵌立绘

**技术债（顺手改）**

- [ ] 内联样式 → 组件（`SectionLabel` / `EmptyState` / `Toggle`）长尾替换
- [ ] `useEffect` 依赖数组隐患逐个核实
- [ ] CI 增强（加 `cargo check` + `cargo fmt --check` + `prettier --check`）
- [ ] `index.css` 里 `.graph-handle` 残留样式清理

**已完成**

- [x] 交互反馈与动效层（棋盘拖拽 / 缩放、卡片墙限额 + FLIP、翻牌与抽牌飞入、箔样倾斜、HP 条与数字滚动、模块淡入）；全部走合成属性并接入 `prefers-reduced-motion`（§25）
- [x] 单元测试（`script/parser.ts` 5 例、`play/runtime.ts` 7 例、Rust store 9 例）

**P3（长期）**

- [x] 棋盘的落子历史（原「牌谱」随跑团精简一并移除，棋盘模块自此没有历史能力）——
      已落地：棋盘自有 `boards/<id>/events.jsonl`（见 §13「落子历史」）
- [ ] 场景卡强制约束
- [ ] 受限插件系统
- [ ] Ren'Py 脚本导出

---

## 25. 动效层

**动效是反馈，不是装饰。** 每加一条动效都要能回答「它让哪个操作更容易看懂」，答不上来就不加。

### 25.1 三条硬约束

1. **只动合成属性。** `transform` / `opacity` / `box-shadow`。改 `width` / `top` / `left` 的动画一律不做 —— 它们每帧都要重排，是掉帧的头号来源。
2. **每条动效都要有无障碍退路。** 写在 CSS 里的走 `prefers-reduced-motion` 媒体查询；写在 inline style 里的（CSS 覆盖不掉）走 `useReducedMotion` hook。两套并存，不混用。
3. **动效基数必须有限。** 给 N 张卡各挂一个 `pointermove`、或每帧各读一次 `getBoundingClientRect`，就是 N 倍开销。所以**先限额，再动效**：卡片墙先有 `visibleLimit`，才谈得上 FLIP。

### 25.2 清单

| 位置              | 动效                               | 实现要点                                                                       | reduced-motion     |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------ | ------------------ |
| 棋盘拖拽          | 抬起阴影 + 边框高亮 + 格子对齐预览 | `useTokenDrag` 暴露 `snapped` 坐标，松手前先给落点                             | 直接跳位           |
| 画布缩放          | rAF 插值                           | 滚轮逐帧插值，锚点固定在光标下                                                 | 直接跳到目标倍率   |
| 卡片墙筛选 / 排序 | FLIP                               | 提交 DOM 前记旧 rect → Invert → Play；只在 `visibleLimit` 内跑                 | 跳过，直接重排     |
| 卡片墙首屏        | 限额 240 张 + 「加载更多」         | 与 `ChatLog` 同源：插入前记高度，提交后补 `scrollTop`                          | —                  |
| 卡牌翻面          | `rotateY(180deg)` + `preserve-3d`  | 正反双面 `backfaceVisibility: hidden`                                          | 直接换面           |
| 抽牌飞入          | 从卡盒 rect 起飞的 FLIP            | 新 token 记 `enterFrom`，首帧先摆到起飞点                                      | 直接出现           |
| 箔样倾斜          | 跟随鼠标的 `rotateX/rotateY`       | **容器级事件委托**，几百张卡只挂一个 `pointermove`，只给 hover 那张写 CSS 变量 | `transform: none`  |
| HP 条             | `scaleX` + 数字滚动                | 条宽与数字共用 `useCountUp` 的同一个插值值，天然同步；`scaleX` 走合成层        | 直接到值           |
| 模块切换          | `.module-enter` 淡入 140ms         | 只做入场不做退场 —— 退场要先等动画放完才卸载，反而显得迟钝                     | `animation: none`  |
| LeftNav 展宽      | `width 150ms`                      | 全项目唯一改 `width` 的动效，历史包袱                                          | `transition: none` |

---

## 26. 明确不做的事

- 不做多人联机（玩家视图是本机第二个窗口，不是网络会话）
- 不做规则引擎（连「掷骰 → 成败」的判定也不做，只记录点数；
  不推导调整值，不预设技能名，不内置任何系统的判定表）
- 不做账号系统
- 不做 Web 服务端
- 不做完全无 SQLite 的纯文件系统
- 不做视觉小说的完整演出引擎（动画、转场、音频导出、存档、打包 EXE）；立绘与场景背景联动、HTML 阅读器内嵌立绘属于预览 / 导出范畴，已实现
- 不做关系图谱

---

## 27. 设计原则

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
12. **视觉一致。** 卡牌渲染统一走 `CardFrame`。
13. **状态单一来源。** 选中态走 store。
14. **无向关系对等显示。**
15. **输入密集处不挂 HTML5 DnD。** 用 Pointer Events。
16. **引用是快照，不自动同步。**
17. **一次性逻辑不拆。** `seed.rs` 这类特殊文件保持整块。
18. **大文件优先拆组件，不拆数据。** 目标：单文件 400 行内可读。
19. **子组件放同一 feature 目录，不进 `components/`。**
20. **对话框的 `onClose` 用 ref 稳定。**
21. **结构化编辑器是创作工具的主视图。**
22. **弹窗统一。** `alert` → `toast`，`confirm` → `confirmDialog`，`try-catch` → `runWithError`。
23. **高频重复样式抽成语义组件。** 差异大于共性时不抽。
24. **音频走 asset protocol。** 不走 base64，不进 JS 堆。
25. **卡框渲染分层。** `mapContent` 提取内容，`resolveFeatures` 判断特性，风格组件只看内容。
26. **视觉特性可扩展。** 闪卡 / 卡背 / 卡框风格均为注册表（`import.meta.glob` 自动发现），加新风格只加一个文件，不改任何现有组件。
27. **动画走合成属性。** `transform` / `opacity`。不用 `background-position`、`mixBlendMode` 等触发主线程重绘的属性。
28. **设置的边界由存储位置决定。** 项目文件夹 vs `localStorage`，决定进哪个分类。
29. **设置形态统一。** 居中浮层，左分类右内容。带搜索框和键盘切换。
30. **状态管理双轨。** Zustand（业务状态）+ 模块级单例（跨组件共享的工具状态）。
31. **模块可重排。** LeftNav 顺序持久化到 `localStorage`，新模块自动追加，已删模块自动过滤。
32. **动效是反馈。** 加动效前先回答它让哪个操作更容易看懂；答不上来就不加（§25）。
33. **先限额，再动效。** 基数不受控时，任何逐元素动效都会被放大成 N 倍开销。
34. **动效的退路与动效同时写。** 媒体查询管 CSS，hook 管 inline style（§25.1）。
