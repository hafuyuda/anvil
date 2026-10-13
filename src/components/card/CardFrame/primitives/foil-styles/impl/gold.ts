import type { FoilStyleDef } from "../types";

const def: FoilStyleDef = {
  id: "gold",
  label: "金箔",
  css: `
    .foil--gold .foil-overlay__base {
      background: var(--card-foil-base);
      opacity: 0.18;
    }

    .foil--gold .foil-overlay__shine {
      background: linear-gradient(
        115deg,
        transparent 45%,
        var(--card-foil-shine) 50%,
        transparent 55%
      );
      animation: foil-gold-shine var(--card-foil-duration, 5s) linear
        infinite;
      opacity: 0.6;
      will-change: transform;
    }

    .foil--gold .foil-overlay__edge {
      border: 1px solid var(--card-foil-edge);
      opacity: 0.55;
    }

    @keyframes foil-gold-shine {
      0% {
        transform: translate3d(70%, 70%, 0);
      }
      100% {
        transform: translate3d(-70%, -70%, 0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .foil--gold .foil-overlay__shine {
        animation: none;
      }
    }
  `,
};

export default def;
