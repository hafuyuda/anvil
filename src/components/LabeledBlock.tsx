import { SectionLabel } from "./SectionLabel";

interface Props {
  label: string;
  children: React.ReactNode;
  variant?: "section" | "block" | "field";
}

export function LabeledBlock({ label, children, variant }: Props) {
  return (
    <div>
      <SectionLabel variant={variant}>{label}</SectionLabel>
      {children}
    </div>
  );
}
