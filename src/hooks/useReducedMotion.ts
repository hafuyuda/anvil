import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * 用户是否要求减少动效。
 *
 * 项目里此前只有闪卡箔样与 VN 立绘各自 `@media` 了一遍，其余动效
 * （LeftNav 宽度过渡、对话流 smooth scroll 等）都没管。
 * 拖拽反馈、翻牌、抽牌飞入、FLIP 布局过渡统一走这个 hook ——
 * 一处订阅，全站一致，也方便测试里 mock。
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.(QUERY).matches === true,
  );

  useEffect(() => {
    const mql = window.matchMedia?.(QUERY);
    if (!mql) return;
    const onChange = () => setReduced(mql.matches);
    // 有些浏览器只有 addListener（旧 API），两者都挂一份
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
