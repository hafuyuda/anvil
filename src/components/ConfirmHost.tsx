import { useEffect, useState } from "react";
import { subscribeConfirm, type ConfirmOptions } from "../lib/confirm";
import { Modal } from "./Modal";

interface Pending extends ConfirmOptions {
  id: string;
  resolve: (ok: boolean) => void;
}

export function ConfirmHost() {
  const [queue, setQueue] = useState<Pending[]>([]);

  useEffect(() => {
    return subscribeConfirm((req) => {
      setQueue((q) => [...q, req]);
    });
  }, []);

  const current = queue[0];
  if (!current) return null;

  function resolve(ok: boolean) {
    current.resolve(ok);
    setQueue((q) => q.slice(1));
  }

  return (
    <Modal
      title={current.title ?? "确认"}
      width={400}
      onClose={() => resolve(false)}
      footer={
        <>
          <button className="btn" onClick={() => resolve(false)}>
            {current.cancelLabel ?? "取消"}
          </button>
          <button
            className={`btn ${current.danger !== false ? "btn-danger" : "btn-primary"}`}
            onClick={() => resolve(true)}
            autoFocus
          >
            {current.confirmLabel ?? "确定"}
          </button>
        </>
      }
    >
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          color: "var(--fg-primary)",
        }}
      >
        {current.message}
      </div>
    </Modal>
  );
}
