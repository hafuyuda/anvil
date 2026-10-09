import { useEffect, useState, useSyncExternalStore } from "react";
import { toast, type ToastPayload } from "../lib/toast";

const TOAST_DURATION = 3000;

interface ActiveToast extends ToastPayload {
  createdAt: number;
}

let cached: ActiveToast[] = [];
const hostListeners = new Set<() => void>();

function notify() {
  for (const fn of hostListeners) fn();
}

function addToast(t: ToastPayload) {
  cached = [...cached, { ...t, createdAt: Date.now() }];
  notify();
}

function removeToast(id: string) {
  cached = cached.filter((t) => t.id !== id);
  notify();
}

function subscribeHost(fn: () => void) {
  hostListeners.add(fn);
  return () => {
    hostListeners.delete(fn);
  };
}

function getSnapshot(): ActiveToast[] {
  return cached;
}

let bridged = false;
function bridge() {
  if (bridged) return;
  bridged = true;
  toast.subscribe((t) => addToast(t));
}

export function ToastHost() {
  bridge();
  const toasts = useSyncExternalStore(subscribeHost, getSnapshot, getSnapshot);

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 3000,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onClose,
}: {
  toast: ActiveToast;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const timer = setTimeout(onClose, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [onClose]);

  const borderColor =
    toast.kind === "error"
      ? "var(--danger)"
      : toast.kind === "success"
        ? "var(--success)"
        : "var(--border-default)";

  return (
    <div
      style={{
        pointerEvents: "auto",
        minWidth: 240,
        maxWidth: 360,
        padding: "10px 14px",
        background: "var(--bg-panel)",
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: "var(--radius-md)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        fontSize: 13,
        color: "var(--fg-primary)",
        lineHeight: 1.5,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(20px)",
        transition: "opacity 0.2s, transform 0.2s",
        wordBreak: "break-word",
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onClose}
        title="关闭"
        style={{
          border: "none",
          background: "transparent",
          color: "var(--fg-muted)",
          cursor: "pointer",
          fontSize: 14,
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
