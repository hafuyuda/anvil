export type ToastKind = "info" | "success" | "error";

export interface ToastPayload {
  id: string;
  kind: ToastKind;
  message: string;
}

type Listener = (t: ToastPayload) => void;

const listeners = new Set<Listener>();

let seq = 0;
function nextId(): string {
  seq += 1;
  return `t${seq}-${Date.now().toString(36)}`;
}

function emit(kind: ToastKind, message: string) {
  const payload: ToastPayload = { id: nextId(), kind, message };
  for (const fn of listeners) fn(payload);
}

export const toast = {
  info: (msg: string) => emit("info", msg),
  success: (msg: string) => emit("success", msg),
  error: (msg: string) => emit("error", msg),
  subscribe: (fn: Listener): (() => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
