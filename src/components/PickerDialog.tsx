import { Modal } from "./Modal";

interface Option {
  value: string;
  label: string;
}

interface Props {
  title: string;
  options: Option[];
  onPick: (value: string) => void;
  onClose: () => void;
}

export function PickerDialog({ title, options, onPick, onClose }: Props) {
  return (
    <Modal title={title} onClose={onClose}>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {options.length === 0 && (
          <li style={{ color: "var(--fg-muted)", fontSize: 12, padding: 8 }}>
            没有可选项
          </li>
        )}
        {options.map((o) => (
          <li
            key={o.value}
            onClick={() => {
              onPick(o.value);
              onClose();
            }}
            style={{
              padding: "6px 10px",
              cursor: "pointer",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              color: "var(--fg-primary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--bg-raised)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
            }}
          >
            {o.label}
          </li>
        ))}
      </ul>
    </Modal>
  );
}