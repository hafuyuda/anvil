# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 变更

- 删除出框（extend）功能。`Card.image_extend_override` 与
  `CardFrameConfig.image_extend` 字段从代码中移除；旧项目文件里的
  对应 key 由 serde 静默忽略，下次保存时自动清除。不需要迁移。
  
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
