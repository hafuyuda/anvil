import { useEffect, useLayoutEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Enter（不带 Shift）回调；不传则回车换行 */
  onEnter?: () => void;
  placeholder?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
}

export function AutoGrowTextarea({
  value,
  onChange,
  onEnter,
  placeholder,
  style,
  autoFocus,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // 原生 autoFocus 仅在挂载时生效；结构编辑器行组件会被复用，
  // 需要在 autoFocus 翻转时手动聚焦，保持 Enter 新建行后焦点落到新行。
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <textarea
      ref={ref}
      className="input"
      value={value}
      rows={1}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && onEnter) {
          e.preventDefault();
          onEnter();
        }
      }}
      style={{
        resize: "none",
        overflow: "hidden",
        lineHeight: 1.5,
        height: "auto",
        ...style,
      }}
    />
  );
}
