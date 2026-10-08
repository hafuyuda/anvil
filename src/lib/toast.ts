export type ToastKind = "info" | "success" | "error";

export interface ToastPayload {
  id: string;
  kind: ToastKind;
  message: string;
}

const listeners = new Set<(t: ToastPayload) => void>();

function emit(kind: ToastKind, message: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload: ToastPayload = { id, kind, message };
  for (const fn of listeners) fn(payload);
}

export const toast = {
  info: (message: string) => emit("info", message),
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
  subscribe: (fn: (t: ToastPayload) => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
