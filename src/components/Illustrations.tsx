// Original flat illustrations used as the "photos" inside the Polaroids.
// Each scene is 200x160 (the Polaroid photo area). All decorative: aria-hidden.

type SceneProps = { className?: string };

const svgProps = (className?: string) => ({
  viewBox: "0 0 200 160",
  className,
  "aria-hidden": true as const,
  focusable: "false" as const,
  preserveAspectRatio: "xMidYMid slice" as const,
});

/** An open student fridge: milk, eggs, cheese, tomatoes, butter, leftover rice, spinach, onions. */
export function StudentFridge({ className }: SceneProps) {
  return (
    <svg {...svgProps(className)}>
      <rect width="200" height="160" fill="#e3f1e8" />
      <rect x="10" y="6" width="180" height="150" rx="8" fill="#fbfefc" stroke="#c9e3d3" strokeWidth="2" />
      <rect x="10" y="58" width="180" height="4" fill="#c9e3d3" />
      <rect x="10" y="110" width="180" height="4" fill="#c9e3d3" />
      {/* fridge light */}
      <ellipse cx="100" cy="10" rx="40" ry="4" fill="#fff6c9" />
      {/* milk */}
      <rect x="22" y="20" width="24" height="38" rx="5" fill="#fff" stroke="#d3e0d8" strokeWidth="1.5" />
      <rect x="27" y="13" width="14" height="8" rx="2" fill="#2f7d4f" />
      <rect x="22" y="33" width="24" height="11" fill="#a8d8b9" />
      {/* eggs */}
      <rect x="56" y="46" width="66" height="12" rx="3" fill="#e9d6ad" />
      {[67, 81, 95, 109].map((cx) => (
        <ellipse key={cx} cx={cx} cy="43" rx="6.5" ry="8" fill="#fff4dd" stroke="#e3cc9c" strokeWidth="1.2" />
      ))}
      {/* cheese */}
      <path d="M132 58 L178 58 L178 36 Z" fill="#ffd23f" />
      <circle cx="166" cy="51" r="3" fill="#f2b705" />
      <circle cx="157" cy="54" r="2" fill="#f2b705" />
      <circle cx="172" cy="44" r="2" fill="#f2b705" />
      {/* tomatoes */}
      <circle cx="30" cy="99" r="11" fill="#ef5b45" />
      <circle cx="51" cy="101" r="9" fill="#e4472f" />
      <path d="M26 88 l4 3 4-3 -2 4 z M48 92 l3 2 3-2 -1.5 3 z" fill="#3e9d5a" />
      {/* butter */}
      <rect x="66" y="96" width="38" height="12" rx="3" fill="#d4ecf7" />
      <rect x="72" y="85" width="26" height="12" rx="2" fill="#ffe27a" />
      {/* leftover rice box */}
      <path d="M112 108 L150 108 L154 80 L108 80 Z" fill="#fff" stroke="#d3e0d8" strokeWidth="1.5" />
      <path d="M108 80 L118 72 L144 72 L154 80" fill="none" stroke="#d3e0d8" strokeWidth="1.5" />
      <circle cx="131" cy="93" r="7" fill="#e4472f" opacity="0.85" />
      {/* spinach bag */}
      <rect x="160" y="68" width="24" height="40" rx="5" fill="#7cc68d" />
      <path d="M166 92 q6 -14 12 0 q-6 8 -12 0 z" fill="#3e9d5a" />
      {/* drawer */}
      <rect x="16" y="118" width="168" height="34" rx="7" fill="#dbeee2" stroke="#c0dccb" strokeWidth="1.5" />
      <circle cx="54" cy="134" r="10" fill="#e8b46a" />
      <path d="M54 124 q2 -5 4 -6" stroke="#8a6a3a" strokeWidth="1.5" fill="none" />
      <circle cx="74" cy="137" r="8" fill="#d99c4f" />
      <path d="M100 146 L120 124 L125 129 Z" fill="#f28c28" />
      <path d="M120 124 l4 -6 M122 126 l6 -4" stroke="#3e9d5a" strokeWidth="2" strokeLinecap="round" />
      <path d="M140 146 q8 -22 22 -14 q4 10 -8 16 z" fill="#9fd47f" />
    </svg>
  );
}

/** A crate of vegetables: broccoli, carrots, pepper, mushroom, lemon, garlic. */
export function VeggieCrate({ className }: SceneProps) {
  return (
    <svg {...svgProps(className)}>
      <rect width="200" height="160" fill="#fff4c2" />
      <circle cx="160" cy="34" r="22" fill="#ffe27a" />
      {/* broccoli */}
      <rect x="44" y="70" width="10" height="30" rx="3" fill="#8cc56f" />
      <circle cx="40" cy="64" r="13" fill="#3e9d5a" />
      <circle cx="57" cy="60" r="14" fill="#2f8a4c" />
      <circle cx="50" cy="48" r="12" fill="#45a862" />
      {/* carrots */}
      <path d="M74 104 L88 44 L96 46 Z" fill="#f28c28" />
      <path d="M88 44 l-4 -12 M91 45 l2 -13 M94 45 l7 -10" stroke="#3e9d5a" strokeWidth="3" strokeLinecap="round" />
      <path d="M90 104 L108 52 L115 55 Z" fill="#f6a03e" />
      <path d="M109 52 l0 -11 M112 54 l8 -9" stroke="#3e9d5a" strokeWidth="3" strokeLinecap="round" />
      {/* bell pepper */}
      <path d="M124 70 q-4 -14 12 -14 q16 0 12 14 q2 24 -12 26 q-14 -2 -12 -26 z" fill="#e4472f" />
      <path d="M136 56 q0 -8 6 -10" stroke="#2f7d4f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M130 66 q2 12 0 22" stroke="#f47a64" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* mushroom */}
      <path d="M150 88 q14 -26 30 0 z" fill="#c98e5b" />
      <rect x="160" y="88" width="10" height="12" rx="3" fill="#f3e3cc" />
      <circle cx="160" cy="80" r="2.5" fill="#f3e3cc" />
      <circle cx="170" cy="78" r="2" fill="#f3e3cc" />
      {/* crate */}
      <rect x="14" y="98" width="172" height="54" rx="4" fill="#d9a066" />
      <rect x="14" y="98" width="172" height="8" fill="#c4874d" />
      <rect x="14" y="124" width="172" height="5" fill="#c4874d" />
      <rect x="20" y="108" width="6" height="40" rx="2" fill="#b97a42" />
      <rect x="174" y="108" width="6" height="40" rx="2" fill="#b97a42" />
      {/* lemon + garlic in front */}
      <ellipse cx="66" cy="132" rx="17" ry="12" fill="#ffd23f" stroke="#f2b705" strokeWidth="1.5" />
      <ellipse cx="84" cy="131" rx="3" ry="2" fill="#f2b705" />
      <path d="M124 144 q-14 -2 -10 -16 q6 -10 14 -2 q8 -8 14 2 q4 14 -10 16 z" fill="#fbf6ee" stroke="#e5d9c6" strokeWidth="1.5" />
      <path d="M128 126 l0 -8" stroke="#a8c98c" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Breakfast shelf: eggs, bananas, bread, yogurt with blueberries, oats. */
export function BreakfastShelf({ className }: SceneProps) {
  return (
    <svg {...svgProps(className)}>
      <rect width="200" height="160" fill="#eef7e2" />
      <rect y="112" width="200" height="48" fill="#f7e7c6" />
      <rect y="112" width="200" height="5" fill="#e8d2a6" />
      {/* window light */}
      <rect x="128" y="12" width="56" height="44" rx="4" fill="#fffbe6" stroke="#dce9c8" strokeWidth="2" />
      <path d="M156 12 v44 M128 34 h56" stroke="#dce9c8" strokeWidth="2" />
      {/* oats jar */}
      <rect x="18" y="52" width="34" height="60" rx="8" fill="#fff" stroke="#d5e3c7" strokeWidth="1.5" />
      <rect x="20" y="70" width="30" height="40" rx="6" fill="#ead9b0" />
      <rect x="16" y="46" width="38" height="9" rx="3" fill="#2f7d4f" />
      {[26, 34, 42, 30, 38].map((x, i) => (
        <ellipse key={i} cx={x} cy={78 + (i % 3) * 9} rx="3" ry="1.5" fill="#d8c08c" />
      ))}
      {/* bread */}
      <path d="M62 112 v-24 q0 -16 24 -16 q24 0 24 16 v24 z" fill="#d99c4f" />
      <path d="M72 84 l8 -6 M84 82 l8 -6 M96 84 l6 -5" stroke="#f3cf93" strokeWidth="3" strokeLinecap="round" />
      {/* bananas */}
      <path d="M112 104 q20 14 46 -6 q-4 -4 -8 -2 q-18 12 -36 2 z" fill="#ffd23f" stroke="#e6b400" strokeWidth="1.5" />
      <path d="M114 96 q20 12 44 -8 q-4 -3 -7 -1 q-16 10 -34 1 z" fill="#ffe066" stroke="#e6b400" strokeWidth="1.5" />
      <path d="M156 90 l6 -4" stroke="#7a5a2a" strokeWidth="3" strokeLinecap="round" />
      {/* yogurt bowl with blueberries */}
      <path d="M118 128 h56 q-2 24 -28 24 q-26 0 -28 -24 z" fill="#ffffff" stroke="#d5e3c7" strokeWidth="1.5" />
      <ellipse cx="146" cy="128" rx="28" ry="6" fill="#fdf8ef" />
      {[[136, 127], [143, 125], [150, 128], [157, 126], [146, 130]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.2" fill="#4a5bc4" />
      ))}
      {/* eggs */}
      <ellipse cx="40" cy="134" rx="10" ry="12" fill="#fff4dd" stroke="#e3cc9c" strokeWidth="1.2" />
      <ellipse cx="62" cy="138" rx="9" ry="11" fill="#f5e2c0" stroke="#e3cc9c" strokeWidth="1.2" />
      <ellipse cx="86" cy="136" rx="9.5" ry="11.5" fill="#fff4dd" stroke="#e3cc9c" strokeWidth="1.2" />
    </svg>
  );
}

/** Taco night: tortillas, avocado, lime, tomato, chicken, cilantro, beans. */
export function TacoNight({ className }: SceneProps) {
  return (
    <svg {...svgProps(className)}>
      <rect width="200" height="160" fill="#fffbea" />
      {/* green gingham cloth */}
      <rect y="70" width="200" height="90" fill="#e4f2e8" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={`v${i}`} x={i * 20} y="70" width="10" height="90" fill="#2f7d4f" opacity="0.08" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={`h${i}`} x="0" y={70 + i * 20} width="200" height="10" fill="#2f7d4f" opacity="0.08" />
      ))}
      {/* tortillas */}
      <circle cx="58" cy="104" r="40" fill="#f6dc9a" />
      <circle cx="58" cy="104" r="40" fill="none" stroke="#e9c46a" strokeWidth="2" />
      {[[40, 92], [66, 86], [72, 112], [48, 118], [58, 102]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#d9a85a" opacity="0.6" />
      ))}
      {/* avocado half */}
      <ellipse cx="132" cy="58" rx="20" ry="26" fill="#2f7d4f" transform="rotate(-20 132 58)" />
      <ellipse cx="132" cy="58" rx="16" ry="22" fill="#c8e38a" transform="rotate(-20 132 58)" />
      <circle cx="134" cy="64" r="8" fill="#8a5a2b" />
      {/* lime wedges */}
      <path d="M160 106 a18 18 0 0 1 32 0 z" fill="#7cc68d" />
      <path d="M163 106 a15 15 0 0 1 26 0 z" fill="#d8f0b8" />
      <path d="M176 106 l-6 -10 M176 106 l0 -12 M176 106 l6 -10" stroke="#7cc68d" strokeWidth="1.5" />
      {/* tomatoes */}
      <circle cx="120" cy="120" r="12" fill="#ef5b45" />
      <circle cx="142" cy="132" r="10" fill="#e4472f" />
      <path d="M116 108 l4 3 4 -3 -2 4 z" fill="#3e9d5a" />
      {/* beans bowl */}
      <path d="M150 140 h40 q-2 16 -20 16 q-18 0 -20 -16 z" fill="#ffd23f" />
      {[[160, 140], [168, 138], [176, 141], [172, 143], [163, 143]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="3" ry="2" fill="#3b2a2a" />
      ))}
      {/* cilantro */}
      <path d="M24 34 q20 10 40 30" stroke="#3e9d5a" strokeWidth="2" fill="none" />
      {[[30, 34], [40, 40], [50, 48], [36, 28], [56, 56]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="#5bb46f" />
      ))}
      {/* chicken */}
      <path d="M88 30 q18 -10 30 4 q8 12 -6 20 q-14 6 -22 -4 l-10 6 q-6 2 -6 -4 q0 -4 6 -4 z" fill="#d98a4e" />
    </svg>
  );
}

/* Small "how it works" drawings, 80x80 */

export function SnapIcon() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <circle cx="40" cy="40" r="38" fill="#fff4c2" />
      <rect x="14" y="26" width="52" height="34" rx="7" fill="#2f7d4f" />
      <rect x="28" y="20" width="16" height="9" rx="3" fill="#2f7d4f" />
      <circle cx="40" cy="43" r="11" fill="#fff" />
      <circle cx="40" cy="43" r="7" fill="#ffd23f" />
      <circle cx="57" cy="33" r="2.5" fill="#ffd23f" />
    </svg>
  );
}

export function TweakIcon() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <circle cx="40" cy="40" r="38" fill="#e4f2e8" />
      <rect x="20" y="16" width="40" height="50" rx="5" fill="#fff" stroke="#2f7d4f" strokeWidth="2.5" />
      <rect x="31" y="12" width="18" height="8" rx="3" fill="#ffd23f" />
      <path d="M27 32 l4 4 7 -8" stroke="#2f7d4f" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="41" y="31" width="12" height="3" rx="1.5" fill="#bcd9c6" />
      <path d="M27 47 l4 4 7 -8" stroke="#2f7d4f" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="41" y="46" width="12" height="3" rx="1.5" fill="#bcd9c6" />
    </svg>
  );
}

export function CookIcon() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <circle cx="40" cy="40" r="38" fill="#fff4c2" />
      <path d="M30 22 q-4 -6 0 -10 M40 22 q-4 -6 0 -10 M50 22 q-4 -6 0 -10" stroke="#7cc68d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="38" cy="44" rx="24" ry="10" fill="#1e2b22" />
      <ellipse cx="38" cy="41" rx="20" ry="7" fill="#3a4a40" />
      <circle cx="30" cy="40" r="4" fill="#ffd23f" />
      <circle cx="42" cy="42" r="3.5" fill="#3e9d5a" />
      <circle cx="47" cy="38" r="3" fill="#ef5b45" />
      <rect x="60" y="40" width="16" height="5" rx="2.5" fill="#2f7d4f" />
    </svg>
  );
}
