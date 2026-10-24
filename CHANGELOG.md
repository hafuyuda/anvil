# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [0.4.0] - 2026-10-24

### 破坏性变更

- **剧情系统整体重写为 weave 剧本语言，schema 升到 0.4，不做迁移。**
  旧的「场景卡 + 分支边」结构废弃：剧本不再按场景一文件，而是按 knot
  （`===` 段落名）组织，可拆分多文件（`scenarios/<id>/*.md`）。
  跳转（`->`）、选项（`*`）、条件（`{表达式: 文本}`）、
  变量声明与赋值（`VAR` / `~`）全部内联在剧本里。
  `Project::open`、资源包导入、预设导入三重门禁：
  `schema_version < 0.4` 的项目直接拒绝打开，提示用旧版本 Anvil。
- **剧情边（Relation.meta 的 scenario_id / condition / effects）彻底删除。**
  分支、条件、变量全部内联到剧本语言中：`-> 跳转`、`{条件: 文本}`、
  `~ 赋值`。前端与后端不再读写这三个 key；旧项目文件里残留的
  key 会在下次保存对应关系时自动清除，不做迁移。
  世界观关系（无 scenario_id 的边）不受影响。
  同时删除了 Rust 侧 `eval_condition` / `validate_condition` 两个
  IPC 命令与 `core::eval` 模块，条件改为前端本地求值。
- **内置预设换成 0.4 格式。** 随包的铁砧堡（anvil_castle）预设不再附带——
  其剧本内容基于旧格式。改为内置 4 个 0.4 预设
  （跑团战役 / 视觉小说 / 卡牌游戏 / 世界设定集，见下方「新增」）。
- **删除跑团规则集与掷骰判定。** 会话不再有 `rule_set`（Rust `Session` 字段与
  前端 `RuleSetId` / `RULE_SETS` / `judge()` / `OutcomeLevel` 一并删除），
  顶栏的规则集下拉、掷骰面板的目标值与快捷骰按钮、先攻按系统切换掷骰表达式
  全部移除。掷骰只记录点数（`{ expr, result, detail, dropped }`），消息不再
  显示「大成功 / 极限成功 / 困难成功 / 失败」等标签。
  原因：三个内置项的阈值表硬编码、不可编辑，与文档「可编辑的阈值表」承诺不符；
  且真实项目中 76 条掷骰记录无一使用目标值。判定需要读卡读状态，属规则引擎，
  与本项目边界冲突。
  兼容：`Session` 模型未开 `deny_unknown_fields`，旧 `session.json` 里的
  `rule_set` 被忽略；旧事件里的 `target` / `outcome` / `natural` 同理，
  回放不受影响。
- **跑团记录精简：战斗 / 先攻 / 帷幕移除，会话与棋盘彻底分开。**
  跑团定位收敛为「单人 KP 的叙事记录器」—— 不判定、不做协同、
  不另建角色模型、不管棋盘。`Session` 不再持有 `board_id` / `tokens` /
  `tracker`，队伍改由卡组承担（`session.group_id`）；事件收敛为
  6 种 `chat.*` + `session.start`。
  兼容：旧 `session.json` 的上述字段被忽略（模型未开
  `deny_unknown_fields`）；旧事件里的 `combat.*` / `board.step` /
  `session.end` / `token.move` / `state.set` / `note` / `effect.apply`
  不再渲染 —— kind 名不迁移，旧会话打开后这部分历史不可读，
  这是删除的既定代价。棋盘自己的落子历史改由棋盘事件流承担（见「新增」）。

### 新增

- **命令面板接入卡牌全文检索（`Ctrl+K`）。** 此前 FTS（`cards_fts` +
  `docs_fts`，覆盖字段值与文档正文）只有卡片墙在用，命令面板靠的是
  「一张卡注册一条 `open.card.<id>` 命令」—— 只匹配卡名，且一万张卡
  就是一万条注册加一万次 `notify`（打开项目的瞬间全量重算一万遍），
  改一张卡名还会把全部命令注销重注册。现在改为**结果源**机制：
  面板拿着 query 问源，源现查现给，卡牌增删改名不触发重新注册。
  - ≥3 字符走 FTS（limit 20，按相关性排序，滤掉索引里残留的已删卡 id）；
    <3 字符退回本地名字过滤（trigram 分词至少要 3 字符）；
    FTS 失败或零结果也退回本地过滤，不让面板空手。
  - 排序规则：标签以 query 开头或关键词正好等于 query 的静态命令永远排最前
    （否则输入「撤销」会被提到「撤销」的卡牌挤掉，回车打开一张卡），
    其余静态命令排在动态结果之后 —— 这样输入卡名时卡牌结果就在最上面。
  - 顺带修掉 `useGlobalCommands` 的 effect 依赖 cards 指纹的问题：
    现在只依赖 `projectPath`。
- **引用扫描与三选一删除确认**（`store/refs.rs`）：
  `scan_card_refs` / `scan_board_refs` / `scan_card_group_refs` /
  `scan_card_type_refs` 只报不改，卡墙多选删除走 `scan_card_refs_batch`
  一次遍历不逐个扫。有引用时弹三选一对话框，列出每一处引用及其位置。
- **老项目体检**：命令面板新增「清理悬空引用」，
  扫描全项目指向不存在卡牌的引用，先报数量、确认后一次性拔除。
- **骰子引擎扩展**：`lib/dice.ts` 支持多段（`1d20+1d4`）、
  百分比骰（`d%`）、取舍（`2d20kh1` / `2d20kl1` / `4d6dl1` / `4d6dh1`）、
  减法修正。解析与掷骰分离，校验路径不产生随机数。
  掷骰只记录点数（`{ expr, result, detail, dropped }`），不判定成败。
- **角色状态面板升级**：`PartyPanel` 从「头像 + 名字 + 类型名」升级为
  角色卡面板。HP 条读写卡上的 `hp` / `max_hp` 字段（支持 `生命值` /
  `最大生命值` 等别名），**改动直接写回卡牌本身，不另建角色模型**。
  卡上所有 number 类型字段自动成为掷骰按钮（预填「角色 · 属性」说明），
  为哪个属性掷骰由用户的卡类型定义决定 —— Anvil 不预设技能名，也不推导调整值。
- **棋盘落子历史（牌谱）**：棋盘动作写进自己的 `boards/<id>/events.jsonl`，
  与会话事件同套 JSONL 机制、复用同一 `Event` 形状。覆盖落子
  （加卡 / 占位 / 卡组导入 / 建卡盒 / 复制）、移动、翻面、层序、删除、
  卡盒（抽 / 洗 / 重置）；payload 带写入时算好的 `summary`，
  读侧不必回查卡牌名。历史面板倒序展示、单条可删；删棋盘连目录一起清掉。
  **牌谱不参与撤销** —— 撤销回滚棋盘，牌谱那条仍是「当初确实这么走过」。
- **单棋盘导入 / 导出**：单个 JSON（`{ kind: "anvil-board",
  schema_version, board, events }`），卡牌本体不跟着走（棋盘只持有
  `card_id`）；导入时 id 撞车重发，不覆盖既有棋盘。列表缩略图是按
  token 真实坐标画的 SVG 示意图，不等资源、不截图。

- **weave 剧本语言，16 种行类型**：knot `=== 名`、变量声明 `VAR 名 = 字面量`、
  旁白 `>`、对白 `**角色**（表情）：`、动作 `*…*`、背景 `@bg`、音乐 `@bgm`、
  音效 `@sfx`、场景引用 `@scene`、角色引用 `@actor`、跳转 `-> knot / END`、
  选项 `* 选项`、汇合 `- 文本`、行内条件 `{表达式: 文本}`、
  赋值 `~ 变量 op 值`、粘合 `<>`。
- **剧本多文件**：一个剧情对应 `scenarios/<id>/` 目录，存放
  scenario.json + 多个 .md 剧本文件；knot 跨文件引用，
  入口 knot 在剧情元数据中指定。
- **两态机运行时**：`continueStep` / `chooseStep` 纯函数推进，
  状态为（当前文件、pc、选项状态、visited 集、变量表），
  支持回退（完整快照）与循环保护（单次推进最多 1000 步）。
- **三栏剧本编辑器**：左栏剧本文件树 + 跨文件 knot 大纲，
  中栏结构 / 源码双模式（当前 knot 联动 + 面包屑定位），
  右栏检查器（入口 knot 下拉、变量表只读、当前 knot 的
  @scene / @actor 引用）。搜索下拉支持跨文件全文检索并定位到行。
- 剧本源码编辑器基于 CodeMirror 6：行号、语法高亮、`Ctrl+F` 查找、
  跨 tab / 场景光标与滚动位置保持。
- 剧本源码编辑器支持上下文补全（说话人 / knot / 变量 / 资源路径）与
  `Ctrl+B` / `Ctrl+I` / `Ctrl+Enter` 快捷键。
- 剧情模块支持跨剧情剧本全文搜索（FTS5 trigram，`scenario_script_fts`）。
- Markdown 导出 knot 化：入口 knot 优先、按可达顺序排列，
  选项渲染为嵌套列表、汇合点标注；HTML 导出为内嵌两态机的单文件阅读器。
- **卡组按类型生成**：新建卡组时可选「空白 / 按类型生成…」；已有卡组工具栏加
  「按类型填充」，支持追加 / 替换。类型多选，每类型显示卡数，结果按卡名排序。
  新卡组默认名取所选类型（1–2 个用 `·` 连接，更多用「X 等 N 类」）。
- 卡牌附属文档：每张卡可写一份 Markdown 长文（`docs/<card_id>.md`），
  卡片编辑面板「文档」tab 用 CodeMirror 编辑，自动保存。
  文档内容并入卡牌搜索（`docs_fts`，FTS5 trigram），随 `.anvilpack`
  导出 / 导入 / 合并，删卡时同步清理。
- 卡牌文档「编辑 / 预览」双 tab：react-markdown（GFM）渲染标题 /
  列表 / 表格 / 任务列表 / 引用 / 代码块。预览实时跟随输入。
- 前端单元测试：parser（weave 解析 / 序列化）与运行时（两态机推进）
  用 vitest 覆盖，`pnpm test` 运行。
- **视觉小说立绘与场景联动**：运行时记录当前说话人 + 表情、当前场景卡；
  试玩按说话人名匹配项目卡渲染立绘（左右站位、入场动画、尊重
  `prefers-reduced-motion`），并接入场景信息浮层（时间 / 地点 /
  参与者 / 描述 + 最近骰点）。立绘只读卡的 `portrait_<表情>` image 字段，
  不新建卡模型（沿用 `features/cards/` 共享核心）。
- **视觉小说运行时键盘操作**：`Space` / `Enter` 推进、`1–9` 选择选项。
- **HTML 导出内嵌角色立绘**：说话人按名匹配卡，读 `portrait` /
  `portrait_<表情>` image 字段并 base64 内嵌，say 行渲染头像；
  内联解析器与现行解析器对齐（允许空说话人 / 空选项 / 空 `@` 值）。
- **内置预设恢复（4 个，0.4 格式）**：`build.rs` 在编译期把
  `src-tauri/presets/<id>/` 各目录（普通 0.4 项目快照）压缩注册为
  `PRESETS`，「添加预设」菜单不再为空。预设类型对应四类典型意图：
  - `ttrpg` 跑团战役 · 矮人矿镇（D&D 矮人主题，角色/地点/怪物/物品卡 +
    敌对/同盟/从属/位于 关系 + 1 地图 + 1 会话，含大量矮人笑话）
  - `vn` 视觉小说 · 矮人王与勇者（角色卡带 `portrait` 立绘 + 场景卡带
    背景 + 示例剧本，演示立绘/表情/选项/分支/`@scene`/`@bg`）
  - `tcg` 卡牌游戏 · 元素对决（费用/攻/防/稀有度 卡牌 + 进化/克制关系 + 起始卡组）
  - `world` 世界设定集 · 铁炉编年（概念/阵营/人物/地点/事件 卡 +
    属于/对立/引发 关系，纯设定用）
  新增预设只需在 `src-tauri/presets/` 下加目录（含 `preset.json` 元数据），
  无需手写二进制 ZIP。
- **交互反馈与动效层**（只动 `transform` / `opacity` / `box-shadow`，
  全部尊重 `prefers-reduced-motion`）：
  - **棋盘**：拖拽时 token 抬起阴影 + 边框高亮，并先给出吸附后的落点预览；
    画布缩放改 rAF 插值（滚轮不再逐帧跳，缩放锚点固定在光标下）。
  - **卡片墙**：先补首屏限额（240 张 + 「加载更多」，与聊天流同源的
    锚点前插补 `scrollTop`），再上筛选 / 排序的 FLIP 动画 —— 没有限额时
    FLIP 会对 N 张卡读 N 次 rect，直接变成 N 倍开销。
  - **卡牌**：翻面走 `rotateY(180deg)` + `preserve-3d`（正反面各自
    `backfaceVisibility: hidden`）；抽牌从卡盒位置 FLIP 飞入棋盘。
  - **箔样倾斜**：闪卡跟随鼠标倾斜，但监听挂在容器上做**事件委托**
    —— 几百张卡各挂一个 `pointermove` 是不可接受的，
    容器统一收事件，只给当前 hover 的那一张写 CSS 变量。
  - **HP 条**：条宽改用 `scaleX`（走合成层，不是每帧改 width），
    与数字滚动共用 `useCountUp` 的同一个插值值，两者天然同步。
  - **模块切换**：`.module-enter` 140ms 淡入，只做入场不做退场
    （退场要先等动画放完才卸载，反而显得迟钝）。
  - 无障碍退路分两路：CSS 里的走 `prefers-reduced-motion` 媒体查询，
    inline style 里的（媒体查询覆盖不到）走 `useReducedMotion` hook。

- **跑团记录改为两栏布局（对话侧栏 + 队伍面板）。** 队伍来自卡组
  （`session.group_id`），会话本身不持有任何实体。拖拽用自研分隔器：
  改 `flex-basis`、比例持久化到 `localStorage`、两侧都能折叠成一竖条。
  之所以自研而不用 `react-resizable-panels`，是因为安装受网络限制
  装不上 —— 反过来看也契合项目少依赖的取向，且不引入额外过渡，
  天然契合 reduced-motion 原则。
- **检查器不再只能手动折叠。** 原先唯一的开合触发源就是那个按钮，
  选中卡牌 / Token 也不会展开，没选中时照样占着 320px 显示「未选中对象」。
  现在：
  - **跟着选中开合**：选中新对象自动展开，取消选中自动收起（把宽度还
    给主区）。`story` / `player` 两家不接管 —— 它们的检查器本身就是
    常驻工作区。同一对象反复重渲染不触发，手动操作永远最高优先级。
  - **悬停预览**：折叠成 28px 竖条后鼠标移上去浮出面板。预览层是
    `position: absolute`，**不进 flex 流** —— 若改成把宽度从 28 拉到
    320，每帧都在挤压中间工作区，卡片墙和棋盘会被迫重排。
  - **`Ctrl+I`** 折叠 / 展开（输入框内放行，那里 `Ctrl+I` 是斜体）。
  - 拖拽条加粗到 6px 并给悬停 / 拖拽金线反馈，**双击恢复默认宽度**。
  - 宽度与折叠状态持久化到 `localStorage`（`anvil.inspectorPrefs`）。
- **文档 tab 字段速览 + rich_text 长文引导（编辑面分工，不合并数据模型）。**
  此前作者在「文档」tab 写长文时要切回「字段」tab 核对 hp / 引用等数值，
  而 `rich_text` 字段又常被误用成长文容器（检查器里只是裸 textarea）。
  现在文档 tab（卡片编辑面板与全屏文档模块）顶部显示只读「字段速览」：
  已设置字段值压缩成最多 6 行，ref 解析为卡名、失效标注「（引用已失效）」、
  长文本压单行截断、空值不占位；类型编辑器里 `rich_text` 字段带引导——
  长文建议放文档 tab，字段留给模块要读取的结构化文本。速览不参与保存、
  不进 `Card.values`：编辑仍归字段 tab，数据仍归 values，两个编辑面不合并
  （文档不进运行时，搬过去的数据对所有模块失明）。

- **棋盘 Token DOM 虚拟化。** 此前整块棋盘的 token 全量挂载，而每枚都是
  一棵完整的 CardFrame 子树，几百枚时拖拽每帧都要扛着整片林子。现在只
  挂载视口内的 token：`useVisibleRect` 管视口矩形（scroll / 缩放 /
  容器尺寸三路重算，scroll 走 rAF 合并，200px 屏幕缓冲，首帧在
  layout effect 里同步算完——不先画一帧全量再裁剪）。两条安全阀：
  拖拽中的 token 强制渲染（防「拖到一半消失」）；框选命中与关系线仍走
  全量表（框选矩形可超出视口，连到视口外 token 的关系边也一样存在）。
  顺带把散落三处的默认 token 尺寸（140×205）集中到 `constants.ts`。

- **卡组三项：使用可见性、卡盒同步、视图重构。**
  - **「用在哪」可见性**：卡组编辑器顶部显示「被 N 处使用」——棋盘卡盒
    chips 可点击跳转（`setCurrentBoard`），会话队伍为纯展示（store 没有
    会话选择态，不为跳转复活跑团精简时删掉的死状态）。删除确认里本来就
    列得出引用，这是让它在编辑时也看得见。
  - **卡盒同步卡组（P2 待办落地）**：卡盒是卡组的活窗口。右键卡盒 →
    「同步卡组（+N）」，把组里新增的卡按组顺序补进 `initial` / `remaining`
    （多重集差额语义，同名的多份不吞；已抽走的不受影响）。组里移除的卡
    不动的（只补不删，与「不静默级联」一致）。无新卡或卡组已删时菜单项
    禁用，状态写在 label 里。记 `board.pile` 事件（`action: sync`），走
    普通撤销栈。
  - **视图重构**：grid / list 两个卡组视图的 DndContext、传感器、重排算法
    与 ×N 聚合原是两份 95% 重复的实现，现抽为共用 `SortableCards` 容器，
    视图文件只留 strategy 与行渲染。行为不变，纯内部减债。

### 修复

- **导出 HTML 的行为与编辑器试玩对齐（同一门剧本语言不再有两套语义）。**
  导出件当时内嵌了一套另写的 JS 阅读器（以为单文件 HTML 无法复用前端模块），
  与 `runtime.ts` 在四处悄悄分叉 —— 作者在编辑器里试玩正常，读者打开的
  导出件却不对。本轮先逐条对齐语义，再把实现合并成一份（见「内部」）：
  - **赋值按变量类型解释**。原先不分类型：文本 `+=` 被强制转数字，
    `~ name += "·阿德"` 直接变成 `NaN`；未知变量会被凭空创建
    （试玩侧跳过）。现在按 `VariableDef.ty` 分流，未知变量跳过。
  - **骰子语法补齐**。原先只认 `NdM±K` 单项，`1d20+1d4` 解析失败后
    退化成字符串，`~ hp -= 1d20+1d4` 在导出件里把 HP 写成 `NaN`。
    现在与 `lib/dice.ts` 同语法：多骰项、修正、`d%`、`kh/kl/dh/dl`。
  - **表达式求值对齐**。导出侧原先多认 `* / -` 与单引号字符串、
    比较不做数值归一（`"10" > "9"` 判假）、非法字符静默跳过；
    现在与 `eval.ts` 一致：只认 `+`、双引号字符串，两侧都能转数值时
    按数值比，语法错误抛出后由条件求值收成 false。
  - **变量类型推断对齐**。Rust 侧用 `f64::parse` 判数字，会吃下
    `1e3` / `+5` / `inf`，而前端正则只认 `-?\d+(\.\d+)?` ——
    `VAR x = 1e3` 于是预览是文本、导出是数字。改为统一走引擎的
    `varsToVariables`（Rust 那份随实现合并删除），并统一「`VAR` 后必须有
    空白」「右值不能为空」「只去成对引号」。
- **条件求值器不再吞掉短路之后的表达式（试玩会直接报错）。**
  `eval.ts` 的 `parseOr` / `parseAnd` 写成
  `truthy(left) || truthy(parseAnd())` —— left 为真时 `parseAnd()`
  根本没执行，词法游标停在 `)` 之前，随后抛「期望 )」。
  于是 `{a && (b || c)}`、`{true || x}` 这类最常见的写法在试玩里
  一律崩，而导出件按假处理、看起来「只是不显示」。
  改为先解析右操作数再合并。
- **条件表达式写错不再中断播放。** `continueStep` 直接调
  `evalCondition`，语法错误会一路抛到 React 事件里；导出件则是
  `tryCond` 捕获后按 false。现在两侧一致：运行时把求值异常收成
  「条件不成立」，笔误由编辑器的校验提示负责，不拖垮整个试玩。
- **棋盘渲染不再 O(T·C)。** `BoardCanvas` 里每个 token 都各自线性扫一遍
  `cards` / `cardTypes` 找自己的卡与类型 —— T 个 token × C 张卡，
  而拖拽时这个循环每帧都在跑。改为进组件时各建一次 `Map`（依赖 cards /
  cardTypes，增删才重建），token 侧改成 O(1) 取用。
- **闪卡倾斜的 rect 测量移进 rAF。** 原先每次 `pointermove` 都同步
  `getBoundingClientRect` 一次；指针事件的频率可以远高于刷新率，
  多出来的那些帧全是白白的强制布局。现在事件里只记坐标，
  一帧内最多测一次。
- **`write_atomic` 补上父目录 fsync，并修掉两个相邻缺陷（数据安全）。**
  原子写原先只做了「写 tmp → fsync 文件 → rename」。缺的一步是
  **fsync 父目录**：rename 改的是目录项，目录项本身不落盘的话，
  断电后可能出现「数据在新 inode 里，目录却还指向旧的」甚至文件消失。
  现在 unix 上 rename 之后补刷父目录（Windows 的 NTFS 自带日志，
  目录项更新由日志覆盖，没有便宜的便携接口，故跳过）。
  顺带修掉两处：
  - **写失败会留残留 tmp**，而 `list_card_ids` 是按 `file_stem`
    照单全收的 —— 残留会让同一个卡 id 进两遍，索引里出现重复项。
    现在写失败由 Drop guard 收掉 tmp，且 `list_card_ids` 只认 `.json`。
  - **tmp 名从 `<name>.tmp` 改为 `<name>.<ext>.tmp`**，
    免得被任何按扩展名过滤的加载器误当成数据。
- **长会话不再 O(n²)（架构级）。** 一局跑团能积累几千条事件，而每说一句话
  的代价是整个会话历史的平方级重算：
  - **后端**：`append_event` 为了算 `max(seq)+1` 把整个 `events.jsonl`
    读进来解析一遍。改为读**尾行**——JSONL 只追加不改写，尾行即最大 seq。
    尾行解析不了（崩了一半 / 单行超过 1MB 窗口 / seq 为 0）时退回全量扫描。
  - **前端**：`logEvent` 追加后整表重读 + 整表 IPC 传输。改为
    `append_event` 返回落库的那条事件（含 seq），前端接到列表末尾。
    整表重载只留给切会话与低频人工操作（编辑 / 删除）。
  - **顺带修掉一个静默数据丢失**：上次写入崩一半时文件不以换行结尾，
    直接追加会让新事件和那半行粘成同一行，两条都读不回来。
    现在追加前先看尾字节，缺换行就先补。
  - **渲染**：对话流限额渲染（首屏 300 条 + 「加载更早」按锚点前插），
    没有引虚拟列表库 —— 消息高度差异极大，估算高度会错位。
    卡表改建一次 `Map`（此前每条消息各自线性扫一遍 cards，N 条 × M 张卡），
    `ChatMessage` 加 `memo` 且调用方回调用 `useCallback` 稳住身份。
  - **自动滚底部**改为只在本来就停在底部（60px 内）时才跟随，
    否则用户翻历史时会被新消息拽走。
- **删除卡牌 / 棋盘 / 卡组不再留下悬空引用（架构级）。**
  此前「一切实体皆卡牌」只建了正向引用（token 指向 card），
  反向无人维护。删卡只清了卡组与文档，以下引用全部遗留：
  棋盘棋子、棋盘卡盒余量、关系边（且只清 from 一侧，反向边留着）。
  用户在棋盘上看到的是无法解释的灰色占位块 —— 能选中、能拖动、
  能挡格子，但不知道它是什么、为什么空了。
  现在删除时按下列规则清理：
  - `remove` 摘掉引用者；`detach` 保留引用者但断开指针，
    把卡名留在 `name_override`（棋子变成「红龙（已删除）」灰块，
    用户知道那儿曾经站着谁）。
  - **不静默级联删除** —— 删一张卡悄悄清空半个棋盘比留悬空边更糟，
    所以选择权交给用户，默认才不留痕。
  - 卡盒移除其中的卡后**保留本体**，`total` 跟着 `initial` 走，
    否则余量与实抽不符。
  - 删卡组摘掉用它做的卡盒；删卡类型的后端防线：还有卡在用就直接拒绝删除。
- 删除卡牌 / 棋盘 / 卡组后整体重载 store：后端连带改了棋盘 / 会话 /
  关系 / 卡组，前端只删卡片本身会导致界面与磁盘不一致
  （用户在棋盘上再动一下，又把悬空 token 写回去）。
- 无法创建剧本文件：`save_script` 的「空内容 = 删除文件」契约
  使创建时传空字符串被静默吞掉。现在创建文件会写入初始 `=== 开场` knot。
- **撤销从「动作级」改成「数据级」，连带修掉两个静默失败的恢复。**
  撤销栈的机制（LIFO、100 条上限）本身没问题，问题在调用方的 restore
  普遍写成「把动作前的整个实体写回去」—— 用户在撤销前又动了同一个实体
  （拖了下别的 Token、改了棋盘宽度、在角色面板改了 HP），后来的编辑
  就被旧快照整个吞掉。具体修掉的：
  - **删 Token 的恢复完全静默失败。** `TokenInspector` 的 restore 调
    `onSave(token)`，而 `onSave` 按 id 做替换，棋子已不在列表里，
    替换找不到目标，Ctrl+Z 之后什么都没有。
  - **删棋盘 Token 用旧 `board` 整体覆盖**，删除后用户对同一棋盘的
    任何修改都会被吞掉。
  - **删卡 / 删棋盘 / 删卡组的恢复只还原本体**，被摘掉的棋子、卡盒、
    关系两侧、卡组成员身份全都不回来。
  - 会话 `savePatch` 与棋盘 `savePatch` 的 undo/redo 同样是整体覆盖。
  现在恢复一律走合并（`lib/undoMerge.ts`）：以 store 当前状态为底，
  **当前值仍处于动作完成那一刻的状态才回滚**，否则保留用户的版本；
  列表按 id 对齐，本次删掉的按原索引插回。删除操作改为删除前采集
  关系网足迹（`core/actions/entityUndo.ts`），撤销时按原位置放回
  棋子 / 卡盒余量 / 关系边 / 卡组成员。
- **结构模块「选什么类型都变成旁白」**：结构化编辑器改为持有自身权威行列表
  （不再用 `serialize → parse` 自我重渲染），解析器对退化空字段
  （`****：`、空选项、`@bg` / `@actor` 空值、空动作）做容错往返，
  空对白不再误判为旁白。
- **源码预览把半截 / 未识别语法误标为「旁白」**：改为标「草稿」，
  与结构化编辑器一致（空行只是空输入、不会变旁白）。
- **视觉小说回退后舞台空白**：回溯快照补充显示行与选项，
  回退精确还原上一停点（不再清屏）。
- **视觉小说点击对话框外区域会跳过当前行文字**：大点击区与对话框
  统一「先补全打字机再推进」的逻辑，消除区域不一致与丢字。
- **视觉小说 BGM 音量 / 循环不跟随全局设置**：`useSceneAudio` 读
  `useAppSettings` 的 `playerVolume` / `playerLoop`。
- **重名 knot 静默覆盖无提示**：`buildKnotIndex` 的 `duplicates`
  经模型暴露，PlayView 顶部黄色 banner 列出重名 knot（`->` 可能跳错）。

### 变更

- 删除出框（extend）功能。`Card.image_extend_override` 与
  `CardFrameConfig.image_extend` 字段从代码中移除；旧项目文件里的
  对应 key 由 serde 静默忽略，下次保存时自动清除。不需要迁移。
- **卡组支持同一张卡的多份引用**。`CardGroup.card_ids` 一直是有序字符串数组，
  本次解除 UI 层去重：卡片墙「加入卡组」与卡组编辑器均可重复添加；卡片 / 列表
  视图按卡聚合显示 `× N` 角标，拖动 / 移除按聚合项操作（移除一份）；卡组编辑器
  Picker 改用 −/+ 数量控件一次加多份。从卡片墙批量加入时若已有重复，弹确认
  （全部加入 / 只加新卡）。底层数据结构与文件格式不变，不需要迁移。
- 结构编辑器的旁白 / 对白 / 动作 / 条件文本改为自动增高输入框，
  粘贴多行自动拆分为多条脚本行。
- 卡牌富文本字段改用自动增高输入框。
- 剧本自动保存按行数动态延迟（> 500 行 1500ms），内容与上次保存一致时不写入。
- **剧本编辑器去上帝组件化**：`ScriptEditor.tsx` 从 1036 行切到 435 行，
  按职责拆成 `editor/useScenarioScripts.ts`（装载 / 防抖保存 / 脏追踪 /
  文件增删）、三个纯展示面板（文件树 + knot 大纲 / 搜索框 / 右栏检查器）、
  `editor/primitives.tsx`，以及 `lineMap.ts`（源码行 ↔ 结构行换算）。
  导入路径不变，`ScenarioEditor` 无感。附带两个行为修正：
  切文件时重置光标行（否则面包屑会拿旧文件的光标去新文件里找 knot）、
  搜索命中跳转前先落盘脏文件（原来自动保存挂在 `currentFile` 上，
  切走即停，原文件的改动要等下次切回去才写盘）。
  拆出的 `lineMap` 补了 8 个用例 —— 那套逻辑两个编辑器都依赖，此前零覆盖。
- **检查器的 Token 编辑也进撤销栈**（此前改位置 / 大小 / 旋转 / 层级 / 可见性 / 扣置都无法撤销），删除与编辑合并同一套语义。
- **`useDraft` 的撤销也改成合并。** 此前编辑卡牌名后自动保存，再去角色面板
  改 HP，Ctrl+Z 会把 HP 一起回滚 —— 恢复写回的是动作前的整张卡。
  现在卡牌 / 卡组 / 卡类型 / 关系类型 / 剧情五个编辑器都通过
  `resolveCurrent` 现取当前值，只回滚本次改动碰过的键。
- `closeProject` 现在一并清空撤销 / 重做栈。此前关项目不清，
  打开另一个项目后按 Ctrl+Z 会拿上一个项目的恢复逻辑乱写。

### 内部

- **CI 开始真的跑测试。** 前端 job 只做了 `tsc` / `prettier`，Rust job 只做了
  `fmt` / `check` —— 仓库里 200 个前端用例与 37 个 Rust 单测从来没在 CI 上
  跑过，等于没有护栏（绿勾只代表能编译、能过格式）。现在 frontend 加
  `pnpm test`，rust 加 `cargo test`，且前端测试排在 prettier 之前，
  用例挂了先看到的是失败而不是格式噪音。
- **剧本语言收敛为一份实现。** 此前同一门语言有三处实现：`script/parser.ts`
  （编辑态）、`play/runtime.ts`（试玩）、`export_html.rs` 内嵌的独立 JS 阅读器
  （导出态），外加 Rust 里一份 `VAR` 类型推断。漂移的症状是「编辑器里正常、
  导出后不对」，且只有读者能发现。现在：

  - 新增 `src/features/story/engine/`（`machine.ts` 状态机、`reader.ts` 从原始
    文件构建阅读器），`play/runtime.ts` 删除，`usePlayState` 直接接引擎；
  - 导出改为把引擎打成 IIFE 内联进 HTML：新增
    `scripts/build-reader-runtime.mjs`，产物
    `src-tauri/src/core/store/reader_runtime.js`（34 KB，`include_str!`）；
  - `export_html.rs` 从 1,459 行降到 538 行：删掉内嵌的 tokenizer / 表达式
    求值 / 剧本解析 / 两态机 / 骰子 / 赋值，删掉 `parse_var_line` ·
    `var_to_def` · `plain_number` · `strip_matching_quotes`，以及
    `ExportData.variables/knots` 与 `ExportFile.knots`（从来没人读的死数据）；
    Rust 只负责收集原文与资源、渲染 DOM；
  - `VariableDef` 结构体随之删除（Rust 侧已无任何使用者）。
  - 三道闸门：`pnpm test` 前置 `check:runtime`（重新构建并逐字节比对产物）、
    `exportParity.test.ts`（31 例，执行产物原文对拍轨迹）、
    `exportTemplate.test.ts`（3 例，模板脚本 + 产物在最小 DOM 桩上真跑
    推进/选项/汇合/结局/重开）。新增 `pnpm build:runtime`。
  - 顺带修掉 `fill_template`：占位符改为单遍替换，剧情文本里出现
    `__RUNTIME__` 不会再被二次展开。
- 删除 `src-tauri/src/core/eval/` 空目录残留（0.4 剧本重写时条件求值移到前端
  `script/eval.ts`，目录与全部引用一并清掉后剩了个空壳）。
- 命令面板抽出结果源机制（`lib/commands.ts` 的 `ResultSource`），
  静态命令与动态结果（卡牌检索）分离，详见 DESIGN §20.1。
  排序规则抽成纯函数 `paletteRanking.ts` 并补 7 个用例。
- **死代码清理（26 处），并新增 `scripts/audit-deadcode.mjs` 把这活固化成检查。**
  0.4.x 连续删掉剧情边、规则集、战斗、帷幕、节点图，每次都留尾巴，靠人记住
  「上次删了什么」不可靠。脚本扫三类：未引用的导出 / `package.json` 里无
  import 的依赖 / CSS 里无人使用的类，`--strict` 可接 CI。本次清掉：

  - 依赖 5 个：`d3-force` + `@types/d3-force`（关系图谱删后残留）、
    `@tauri-apps/plugin-fs`（前后端均零引用）、`tauri-plugin-opener`
    （Cargo 声明了但从未注册，连同 capabilities 里的 `opener:default`）、
    `evalexpr`（`core::eval` 删后零引用）；
  - 死导出 20 个，含 `story/effects.ts` 的 `parseEffect` / `parseEffects` /
    `validateEffects`（旧 `Relation.meta` effects 的解析器，weave 改由
    `machine.ts` 的 `toEffect` 自己构造 `ParsedEffect`）；
  - CSS 死类 `.graph-handle`（节点图残留）。

  刻意保留 7 个「无人引用但属于模式对称接口」的符号（registry 的
  `get/list/has/DEFAULT` 四件套、`SystemEventKind` 事件词表），写进脚本的
  `KEEP` 白名单并注明理由 —— 白名单是决策记录，不是垃圾桶。

## [0.3.0] - 2026-10-13

### 新增

**音频播放器**

- 全局音频播放器（`lib/audioPlayer.ts`），支持播放 / 暂停 / 进度 / 音量 / 循环
- 迷你播放器（MiniPlayer）：右下角常驻，跨模块、跨设置持续播放
- 新增「音乐」模块，走标准三栏布局
- 播放器内导入音频，列表显示大小 / 时长 / 引用数
- 视觉小说运行时进入自动暂停全局播放器，退出恢复

**资源管理**

- 图片 / 音频资源列表加搜索框
- 音频选择器加搜索
- 导入的资源使用可读文件名（如 `铁匠铺.png`），撞名自动追加 `-2` / `-3`

**界面**

- TopBar 极简化：项目菜单收纳打开 / 新建 / 导入 / 导出 / 合并 / 刷新 / 关闭
- 撤销 / 重做 / 保存状态移入 StatusBar
- LeftNav 非卡片墙模块自动收窄（48px），悬停展开（180px）
- LeftNav 模块可拖拽排序，顺序持久化到 `localStorage`
- 跑团顶栏调整：会话名固定宽度，战场选择与 BGM 按钮靠右

**窗口**

- 无边框标题栏（`tauri-plugin-frame`），窗口按钮与 Anvil 配色统一
- 支持 Windows 11 Snap Layout

**设置面板**

- 设置面板加搜索框（顶栏左侧），按分类关键词跳转
- `↑` `↓` 键盘切换分类
- 分类项视觉重做：选中态金色竖条 + 渐变背景
- 浮层视觉贴合铁砧主题：金属渐变顶栏、底部金线渐隐

**卡组**

- 卡组编辑器支持卡片视图（网格）+ 列表视图切换
- 卡组内卡牌拖拽排序（`@dnd-kit`）
- 卡片视图下整卡可拖拽，列表视图下用 `⋮⋮` 手柄拖拽
- 卡片视图下悬停显示移除按钮

**棋盘**

- 「添加卡片」选择器升级为可视化网格：卡片预览 + 搜索 + 类型过滤 + 多选
- 支持一次添加多张卡到棋盘，自动扩充边界

### 变更

- 图像从 base64 data URL 改为 Tauri asset protocol，与音频统一
- `imageCache` 和 `audioCache` 合并为 `assetCache`
- 设置面板移除「音频资源」tab，统一由播放器管理
- `Ctrl+M` 快捷键从打开浮层改为切换到音乐模块
- 设置分类从 8 个精简为 5 个：常规 / 外观 / 资源 / 编辑器 / 高级
- 设置面板从全屏改为居中浮层（1000×680），带遮罩 + 模糊
- 取消设置分类的「项目 / 应用」分组呈现，按用户视角合并分类（存储位置不变）
- 项目 · 数据 + 应用 · 高级 → 「高级」
- 项目 · 主题 + 应用 · 界面 → 「外观」
- 应用 · 编辑器 + 应用 · 视觉小说 → 「编辑器」
- 卡片墙移除「导入棋盘」入口（网格 / 列表 / 批量操作三处），改由棋盘侧承担
- 卡片墙职责收窄：只管卡的组织（加入卡组），不管卡的摆放

- **多预设「添加预设」功能**：内置预设从单一示例世界改为预设注册表（`assets/presets/`）
  - TopBar → 项目菜单新增「添加预设…」，可把预设作为副本追加到**非空项目**
  - 内容实体全部重新生成 UUID；同名实体加 `(2)` / `(3)`；卡类型与关系类型按名字复用
  - 棋盘 token 的 pile（卡盒）`group_id` / 卡 id 映射到新项目，会话 `board_id` 置空
  - 原「载入示例世界」命令保留兼容，指向 `anvil_castle`（铁砧堡）预设

- **闪卡风格注册表化**：新增闪卡效果只加一个 `impl/*.ts` 文件
  - 金箔 / 银箔迁移为 `foil-styles/impl/` 下的独立文件，新增「全息彩虹」风格验证扩展点
  - 注册表用 `import.meta.glob` 自动发现，CSS 在模块加载时一次性注入 `<head>`
  - `resolveFeatures` 用 `hasFoilStyle` 规范化，未知 id 回退金箔不崩
- **卡背风格注册表化**：新增风格只加一个 `impl/*.tsx` 文件
  - 内置图案迁移为 `anvil` 风格，新增 `rune` 风格（暗紫同心圆环 + ᚱ 符文）
  - 类型编辑器和项目设置的「卡背」字段从图片上传改为风格下拉；旧图片数据保留兼容，显示提示条 + 清除按钮
  - 未知 id 回退 `anvil`，不崩
- 宝可梦卡框改为全图卡面：实体标题栏（类型色）+ 全图 + 底部半透明技能面板
- 卡框配置从 20 个固定字段改为 `bindings` 槽位映射，槽位由风格声明
- 加新卡框风格只需声明 `slots`，编辑器自动生成配置项

### 内部

- 新增 `lib/audioPlayer.ts` · `lib/moduleOrder.ts` · `lib/assetCache.ts`
- 删除 `lib/imageCache.ts` · `lib/audioCache.ts` · `features/project/AudioTab.tsx`
- `hooks/useImageUrl` 和 `hooks/useAudioUrl` 合并为 `hooks/useAssetUrl`
- `features/player/` 从全屏浮层（`PlayerPage`）改为模块（`PlayerView` + `PlayerInspector`）
- `assets.rs` 图片 / 音频文件名生成统一走 `unique_readable_name`
- IPC 命令：`audio_abs_path` 改名 `asset_abs_path`，删除 `read_image_data_url`
- 新增 `features/settings/SettingsSearch.tsx` · `AppearancePanel.tsx` · `EditorPanel.tsx` · `AdvancedPanel.tsx`
- 新增 `features/board/CardPickerGridDialog.tsx`（替换原 `PickerDialog` 的文本列表）
- 新增 `features/card-groups/CardGroupCards.tsx`（网格 + 列表 + 拖拽）
- 删除 `features/card-groups/CardGroupCardList.tsx`
- `useBoardActions` 新增 `addCardsToBoard`（批量），`addCardToBoard` 改为其包装
- `stores/slices/types.ts` 加 `CardGroupView` 类型；`uiSlice` 加 `cardGroupView` + `setCardGroupView`
- `SettingsCategory` 联合类型从 8 个值精简为 5 个
- 新增 `core/store/preset.rs`：预设注册表 + `import_preset_from`；`assets/example_world.anvilpack` 移至 `assets/presets/anvil_castle.anvilpack`
- `pack.rs` 的 `read_json_or_default` 改为 `pub(crate)`，供 preset.rs 复用
- 新增 IPC 命令：`list_presets_cmd` / `add_preset`
- 前端新增 `hooks/useAddPreset.ts` · `features/project/AddPresetDialog.tsx`；`TopBar` `MenuItem` 加 `disabled` prop
- 闪卡风格改为注册表 + `import.meta.glob` 自动发现，新增风格只加一个文件
- 新增 `primitives/foil-styles/`（`types.ts` · `registry.ts` · `impl/*.ts`）；`FoilOverlay` 改为 className 结构，金/银/彩虹 CSS 迁入 impl
- `CardFrameConfig` 删除 legacy 字段，`schema_version` 升到 `0.3`
- 新增 `styles/slotUtils.ts` · `model/card_type.rs::migrate_card_frame_json`
- 6 个风格全部改为读 `content.slots`

### 破坏性变更

- 卡框配置从 20 个固定字段改为 `bindings` 槽位映射。
  打开旧项目时自动迁移，`manifest.schema_version` 升到 `0.3`。
  迁移后旧字段从 JSON 清除。**旧版本 Anvil 无法读取迁移后的项目。**

## [0.2.0] - 2026-10-09

第二个公开版本。核心功能全部打通，开箱即用的示例世界覆盖全部特性。

### 新增

**卡牌系统**

- 类型复制：一键复制卡牌类型，字段与卡框配置完整拷贝
- 卡图裁剪：类型级 + 卡级覆盖，拖拽调整可视区域
- 卡图出框：四方向独立滑块，最多撑满内层边界
- 闪卡：暗金流光效果，支持字符串、数字、布尔、数组字段触发
- 卡背：类型级 + 项目级配置，内置「棱形框 + Anvil」图案
- 棋盘 Token 翻牌：双击或检查器勾选，卡盒不参与翻牌
- 卡牌悬浮预览：鼠标悬停引用处，浮出卡框缩略图

**棋盘**

- 网格形状：方格 / 点阵 / 横线 / 竖线
- 占位 Token：纯装饰标记，工具栏一键添加
- 卡盒：堆叠视觉 + 抽 1 / 抽 N / 洗牌 / 重置
- 抽牌放置算法：从卡盒四方向探测空位，四方向都满则原地叠放
- 从卡组导入自动扩充棋盘边界
- 关系线叠加：世界观边显示在棋盘上，支持聚合（>= 2 条合并为粗线 + 计数徽章）、按类型过滤、有向箭头
- Token 宽高比锁定（检查器）

**视觉小说**

- 剧本结构化编辑器：行卡片视图 + 拖拽排序 + 类型延续 + 源码模式
- 场景设置区：背景图片、背景音乐、结局标记
- 立绘表情切换
- 背景音乐和音效播放（asset protocol，不走 base64）
- 导出 Markdown：DFS 遍历 + 场景编号 + 分支列表
- 导出 HTML：单文件静态阅读器，图片内嵌，内嵌求值器

**卡组**

- 卡组模块：有序卡 ID 集合，独立于卡片
- 卡片墙「加入卡组」
- 棋盘「从卡组导入」和「从卡组加卡盒」

**资源管理**

- 音频资源管理：导入 / 删除 / 试听 / 引用计数
- 项目设置新增「音频资源」tab
- 图片资源 tab 保持

**主题与外观**

- 界面缩放：应用设置里的滑块，0.75–1.5
- 关系语序：改为「[对方卡名] 的 [关系名]」，有向边按方向用 name / inverse_name
- 卡牌墙默认按类型排序

**其他**

- 内置示例世界「铁砧堡」：6 类型 / 30 卡 / 22 关系 / 3 卡组 / 1 剧情 / 5 剧本 / 2 棋盘 / 1 会话
- 应用设置扩展：`fontScale`

### 变更

- 图谱移除：全图力导向布局无法建立空间记忆，改为棋盘关系线
- 世界观直接进入卡片墙，去掉「卡片 / 图谱」子视图
- `seed.rs` 从 1144 行硬编码改为从内置 `.anvilpack` 解压
- 骰子逻辑统一到 `lib/dice.ts`，支持空格（`2d6 + 3`）
- 错误处理统一：`alert` → `toast`，`confirm` → `confirmDialog`，`try-catch` → `runWithError`
- 音频改用 Tauri asset protocol（之前未实现）

### 修复

- 项目设置 tab 金线判断写错（图片资源 / 数据统计 tab 无下划线）
- 拖动 token 后删除延迟一拍（`localTokens` 同步逻辑）
- 对话框内 `onClose` 依赖导致 effect 重跑冲掉用户编辑
- 卡盒抽牌后双击翻牌需要先拖动
- 类型编辑器中切换闪卡触发字段被覆盖

### 内部

- 目录结构整理：`features/` 下按子领域分组
- 大文件拆分：`VNStage` / `MergePackDialog` / `ScenarioEditor` / `BoardEditor` / `BoardCanvas` / `ChatMessage` / `ThemePanel` / `CardGroupEditor`
- UI 小组件抽取：`SectionLabel` / `EmptyState` / `Toggle` / `LabeledBlock`
- `core/use*.ts` 迁移到 `hooks/`
- 移除 `__canvas_preview__.tsx`（HyperIDE 注入文件）

---

## [0.1.0] - 早期

首个公开版本。核心功能可用，但 API 和数据格式仍可能变化。
