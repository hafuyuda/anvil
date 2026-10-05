interface TypeRef {
  id: string;
  name: string;
}

interface Props {
  label: string;
  allTypes: TypeRef[];
  value: string[];
  onChange: (v: string[]) => void;
}

export function TypeMultiSelect({ label, allTypes, value, onChange }: Props) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {allTypes.map((t) => (
          <label
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
            }}
          >
            <input
              type="checkbox"
              checked={value.includes(t.id)}
              onChange={(e) => {
                if (e.target.checked) onChange([...value, t.id]);
                else onChange(value.filter((x) => x !== t.id));
              }}
            />
            {t.name}
          </label>
        ))}
      </div>
    </div>
  );
}
