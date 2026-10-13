import type { FoilStyleDef } from "../types";

const def: FoilStyleDef = {
  id: "rainbow",
  label: "全息彩虹",
  css: `
    .foil--rainbow .foil-overlay__base {
      background: linear-gradient(
        135deg,
        #ff5f6d,
        #ffc371,
        #47cf73,
        #3a7bd5,
        #a86ef3,
        #ff5f6d
      );
      background-size: 300% 300%;
      opacity: 0.55;
    }

    .foil--rainbow .foil-overlay__shine {
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.85),
        transparent
      );
      animation: foil-rainbow-shine 2.4s linear infinite;
      will-change: transform;
    }

    .foil--rainbow .foil-overlay__edge {
      box-shadow:
        0 0 6px rgba(255, 255, 255, 0.6),
        0 0 14px rgba(168, 110, 243, 0.45);
    }

    @keyframes foil-rainbow-shine {
      from {
        transform: translate3d(-120%, 0, 0);
      }
      to {
        transform: translate3d(120%, 0, 0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .foil--rainbow .foil-overlay__shine {
        animation: none;
      }
    }
  `,
};

export default def;
