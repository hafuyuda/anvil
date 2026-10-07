import { useEffect, useRef, useState } from "react";
import { useAppSettings } from "../../../hooks/useAppSettings";

interface Options {
  /** 每字延迟（毫秒），默认 35 */
  speed?: number;
  /** 是否启用打字机，默认 true */
  enabled?: boolean;
}

/**
 * 打字机 hook。
 * - 输入文本变化时重新开始
 * - 返回已显示的字符和是否完成
 * - skip() 立即显示完整文本
 */
export function useTypewriter(text: string, options?: Options) {
  const appSettings = useAppSettings();
  const speed = options?.speed ?? appSettings.typewriterSpeed;
  const enabled = options?.enabled ?? appSettings.typewriterEnabled;

  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const timerRef = useRef<number | null>(null);
  const indexRef = useRef(0);

  // text 变化时重置
  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    indexRef.current = 0;

    if (!enabled || !text) {
      setDisplayed(text ?? "");
      setDone(true);
      return;
    }

    setDisplayed("");
    setDone(false);

    const step = () => {
      if (indexRef.current >= text.length) {
        setDone(true);
        timerRef.current = null;
        return;
      }
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      timerRef.current = window.setTimeout(step, speed);
    };

    timerRef.current = window.setTimeout(step, speed);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, speed, enabled]);

  function skip() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    indexRef.current = text.length;
    setDisplayed(text);
    setDone(true);
  }

  return { displayed, done, skip };
}
