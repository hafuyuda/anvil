export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 危险操作（红色按钮）。默认 true */
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  id: string;
  resolve: (ok: boolean) => void;
}

type Listener = (req: ConfirmRequest) => void;

const listeners = new Set<Listener>();

let seq = 0;
function nextId(): string {
  seq += 1;
  return `c${seq}-${Date.now().toString(36)}`;
}

/**
 * 异步确认框。返回 Promise<boolean>。
 * 宿主组件通过 subscribe 监听请求并渲染。
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const req: ConfirmRequest = { ...opts, id: nextId(), resolve };
    let handled = false;
    for (const fn of listeners) {
      if (!handled) {
        fn(req);
        handled = true;
      }
    }
    if (!handled) {
      // 没有宿主组件时退化为原生 confirm
      resolve(window.confirm(opts.message));
    }
  });
}

export function subscribeConfirm(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
