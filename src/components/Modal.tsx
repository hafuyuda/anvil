import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  title?: string;
  width?: number;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({
  title,
  width = 460,
  onClose,
  children,
  footer,
}: Props) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          background: "var(--bg-panel)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md), 0 0 0 1px rgba(255,255,255,0.04)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
          overflow: "hidden",
        }}
      >
        {title && (
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid var(--border-subtle)",
              fontSize: 13,
              fontFamily: "var(--font-title)",
              fontWeight: 600,
              letterSpacing: 0.5,
              color: "var(--fg-primary)",
              background: "var(--bg-surface)",
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflow: "auto",
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              background: "var(--bg-surface)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
