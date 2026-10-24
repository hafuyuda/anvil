# Anvil 项目长期记忆

## 环境约束
- **沙箱无法访问 npm registry**：`pnpm add` 会卡在「Lockfile passes supply-chain policies」之后无限挂起（约 9 分钟被超时杀掉，EXIT=124）。任何需要联网拉取的新 npm 依赖都装不上。**结论：优先用零依赖的自研实现**，不要尝试引入需要 npm 安装的库（react-resizable-panels 等）。已装依赖可正常用于构建/测试（`npx tsc`/`vite build`/`vitest` 均可用）。

## 设计原则（与代码一致，已写入 DESIGN.md）
- 动效只走合成属性（transform/opacity/box-shadow），全部尊重 `prefers-reduced-motion`；先限额再动效。
- 不做关系图谱、不做 VTT 级自动化、不做规则引擎。
- **掷骰只记点数，不做判定**：0.4.0 已删除「跑团规则集」（generic/coc7/dnd5e）、8 级判定标签
  （`OutcomeLevel`）、`Session.rule_set`、顶栏规则集下拉、掷骰目标值与快捷骰按钮。
  别再以「加个规则集」的形式把判定加回来 —— 判定要读卡读状态，属规则引擎，越过项目边界。
- 剧本系统是自己手写的 ink 风格语言 + 运行时（parser.ts / play/runtime.ts），非真 ink；@scene/@actor 卡引用是差异化核心。

## 减法靠脚本，不靠自觉
- `scripts/audit-deadcode.mjs`（零依赖，`node scripts/audit-deadcode.mjs`，`--strict` 接 CI）。
  三类检查：未引用导出 / package.json 里无 import 的依赖 / CSS 死类。
  **每次删完大功能就跑一遍** —— 0.4.x 删剧情边、规则集、战斗、帷幕、节点图都留了尾巴。
- 已知误报两类（脚本不代删，人工确认）：registry 模式的动态查表符号；
  Tauri 插件类依赖（可能只在 Rust 侧注册）。
- 子路径导入（`@tauri-apps/api/core`）与模板串类名拼接（`cls${cond ? " is-active" : ""}`）
  会造成误报，脚本已处理，别改回简单匹配。

## 0.4.0 已发布（2026-10-24，tag v0.4.0，commit df9d35a）
- 版本号三处同步：`package.json` / `src-tauri/Cargo.toml` / `src-tauri/tauri.conf.json`。
  以后发版别漏 Cargo.toml —— 它决定安装包文件名。
- 构建：`node node_modules/@tauri-apps/cli/tauri.js build`（先跑 beforeBuildCommand
  `pnpm build` = build-reader-runtime + tsc + vite build）。target 被清过后完整重编译约 4 分钟。
  产物：`bundle/msi/anvil_0.4.0_x64_en-US.msi` 与 `bundle/nsis/anvil_0.4.0_x64-setup.exe`。
- **CI 用 `pnpm install --frozen-lockfile`**，改完 package.json 必须同步 lockfile。
  沙箱无网络，但 `pnpm install --lockfile-only --offline` 可用（只删包时够用），
  删完用 `--frozen-lockfile --offline --lockfile-only` 验证通过再提交。
- 测试真实规模是 **16 个文件 / 173 个用例**（不是 4 个）—— `*.test.ts` 就近放置，
  只 grep `__tests__` 目录会严重低估。board / session / undo 都有覆盖。

## VTT（虚拟桌面）议题：结论是不拓展（2026-10-24 讨论）
- 用户问过「Anvil 适合拓展成 VTT 吗」，结论：**不适合拓展，适合另开仓库复用 `features/cards` 数据层**。
- 依据：DESIGN.md §24 四条与 VTT 定义正面冲突 —— 不做多人联机 / 不做规则引擎 / 不做账号 / 不做 Web 服务端；
  加回 VTT 等于推翻 0.4.x 精简结论（帷幕、战斗已删）。
- 能力断层：卡牌模型 + 棋盘渲染 + 牌谱 JSONL 已具备（可复用）；规则判定、GM/玩家视野分层、
  实时同步三块全缺，且正是「让 VTT 成为 VTT」的部分。
- 若将来真要做，最小切口是**只读共享导出**（复用 §16.4 单文件 HTML 导出流水线），
  零服务端零账号零判定，落在现有边界内。完整 VTT = 另一个产品。

## 跑团模块边界（0.4.x 精简后，见 DESIGN.md §14）
- **跑团 = 单人 KP 的叙事记录器**。解决的问题是「一局跑团结束后留下可信的记录」，不是多人协同，也不是桌面战棋。
- 四条硬边界（新需求先过这四条）：**不判定 / 不做协同 / 不另建角色模型 / 不管棋盘**。
- 已删且**不要加回来**：战斗与先攻追踪、帷幕（KP/玩家双层视图、秘密消息、暗骰、揭示）、会话内的棋盘与牌谱。
  会话 = `{ id, name, group_id, state }`，队伍来自卡组，事件只剩 6 种 chat.* + `session.start`。
- **会话不持有任何实体**：只通过 `group_id` 引用卡组。删卡走「卡组成员」这一路，删卡组必须解绑会话队伍。

## 棋盘模块（0.4.x 增强，见 DESIGN.md §13）
- **落子历史（牌谱）已落地**：存在棋盘自己的 `boards/<id>/events.jsonl`，
  复用会话那套 JSONL 机制和同一个 `Event` 形状（不再需要从 sessionId 泛化）。
  种类：`board.place / move / flip / layer / delete / pile`，payload 里带写入时算好的 `summary`。
  **牌谱不参与撤销** —— 撤销回滚棋盘，牌谱那条仍是「当初确实这么走过」。
  删棋盘要连 `boards/<id>/` 目录一起清掉。
- 单棋盘导入 / 导出：`{ kind:"anvil-board", schema_version, board, events }`，
  卡牌本体不跟着走（棋盘只持有 card_id）。导入时 id 撞车重发，不覆盖既有棋盘。
- 列表缩略图是按 token 真实坐标画的 SVG 示意图，**不是截图**（零依赖、不等资源）。
- 棋盘事件`/`会话事件两套命令并存：`*_board_event` vs 会话的 `*_event`，别混用。
