import { useEffect, useState } from "react";

interface Props {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function SaveInput({
  value,
  onCommit,
  placeholder,
  style,
  className = "input",
}: Props) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  function commit() {
    if (local !== value) onCommit(local);
  }

  return (
    <input
      className={className}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder={placeholder}
      style={style}
    />
  );
}