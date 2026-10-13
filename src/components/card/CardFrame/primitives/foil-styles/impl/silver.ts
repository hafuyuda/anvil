import type { FoilStyleDef } from "../types";

const def: FoilStyleDef = {
  id: "silver",
  label: "银箔",
  css: `
    .foil--silver .foil-overlay__base {
      background: var(--card-foil-silver-base);
      opacity: 0.18;
    }

    .foil--silver .foil-overlay__shine {
      background: linear-gradient(
        115deg,
        transparent 45%,
        var(--card-foil-silver-shine) 50%,
        transparent 55%
      );
      animation: foil-silver-shine var(--card-foil-duration, 5s) linear
        infinite;
      opacity: 0.6;
      will-change: transform;
    }

    .foil--silver .foil-overlay__edge {
      border: 1px solid var(--card-foil-silver-edge);
      opacity: 0.55;
    }

    @keyframes foil-silver-shine {
      0% {
        transform: translate3d(70%, 70%, 0);
      }
      100% {
        transform: translate3d(-70%, -70%, 0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .foil--silver .foil-overlay__shine {
        animation: none;
      }
    }
  `,
};

export default def;
