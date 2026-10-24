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
