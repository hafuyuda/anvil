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
              borderRadius: 4,
              fontSize: 13,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#f0f0f0";
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
