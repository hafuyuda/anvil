# Anvil 项目长期记忆

## 环境约束
- **沙箱无法访问 npm registry**：`pnpm add` 会卡在「Lockfile passes supply-chain policies」之后无限挂起（约 9 分钟被超时杀掉，EXIT=124）。任何需要联网拉取的新 npm 依赖都装不上。**结论：优先用零依赖的自研实现**，不要尝试引入需要 npm 安装的库（react-resizable-panels 等）。已装依赖可正常用于构建/测试（`npx tsc`/`vite build`/`vitest` 均可用）。

## 设计原则（与代码一致，已写入 DESIGN.md）
- 动效只走合成属性（transform/opacity/box-shadow），全部尊重 `prefers-reduced-motion`；先限额再动效。
- 不做关系图谱、不做 VTT 级自动化、不做规则引擎（仅把掷骰结果映射为等级标签）。
- 剧本系统是自己手写的 ink 风格语言 + 运行时（parser.ts / play/runtime.ts），非真 ink；@scene/@actor 卡引用是差异化核心。
