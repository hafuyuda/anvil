import { getFoilStyle } from "./foil-styles/registry";

interface Props {
  variant?: string | null;
}

export function FoilOverlay({ variant }: Props) {
  const style = getFoilStyle(variant);

  return (
    <div className={`foil-overlay foil--${style.id}`} aria-hidden>
      <div className="foil-overlay__base" />
      <div className="foil-overlay__shine" />
      <div className="foil-overlay__edge" />
    </div>
  );
}
