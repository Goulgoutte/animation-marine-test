/**
 * Décor d'animation 2D peint à la main (SVG) : crépuscule, plans de collines en perspective
 * atmosphérique, village aux fenêtres éclairées, pins, nuages. Grain et bords « gouachés » par filtres SVG.
 * La composition garde l'essentiel (collines, village) dans la bande centrale pour rester lisible
 * quand l'image est recadrée en bandeau sur mobile.
 */

const FENETRES: [number, number][] = [
  [118, 705], [136, 705], [205, 722], [372, 696], [388, 696], [452, 712],
];

function Pin({ x, y, s = 1, c = "#1b1c55" }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={c}>
      <rect x="-2" y="-4" width="4" height="12" />
      <path d="M0 -62 L16 -30 H7 L21 -4 H-21 L-7 -30 H-16Z" />
    </g>
  );
}

function Rond({ x, y, s = 1, c = "#262763" }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={c}>
      <rect x="-2.5" y="-6" width="5" height="16" />
      <ellipse cx="0" cy="-26" rx="19" ry="23" />
      <ellipse cx="-11" cy="-16" rx="12" ry="14" />
      <ellipse cx="12" cy="-15" rx="11" ry="13" />
    </g>
  );
}

function Maison({ x, y, w = 46, h = 30, lumiere = true, toit = "#2a2b6e", mur = "#3a3a86" }: { x: number; y: number; w?: number; h?: number; lumiere?: boolean; toit?: string; mur?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width={w} height={h} fill={mur} />
      <path d={`M-5 1 L${w / 2} -${h * 0.62} L${w + 5} 1Z`} fill={toit} />
      <rect x={w * 0.68} y={-h * 0.7} width="6" height={h * 0.4} fill={toit} />
      {lumiere && <rect x={w * 0.2} y={h * 0.25} width={w * 0.2} height={h * 0.32} rx="1" fill="url(#lueur)" />}
      {lumiere && <rect x={w * 0.6} y={h * 0.25} width={w * 0.2} height={h * 0.32} rx="1" fill="url(#lueur)" />}
    </g>
  );
}

function Nuage({ x, y, s = 1, o = 0.55, c = "url(#nuage)" }: { x: number; y: number; s?: number; o?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} fill={c}>
      <ellipse cx="0" cy="0" rx="90" ry="14" />
      <ellipse cx="-24" cy="-10" rx="42" ry="15" />
      <ellipse cx="22" cy="-14" rx="34" ry="14" />
      <ellipse cx="60" cy="-4" rx="30" ry="9" />
    </g>
  );
}

export function DecorIllustration({ className = "", legende = true }: { className?: string; legende?: boolean }) {
  return (
    <figure className={`relative isolate m-0 overflow-hidden bg-[#1e1b4b] ${className}`}>
      <svg viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" className="absolute left-0 top-[-41vw] h-auto w-full lg:inset-0 lg:h-full" role="img" aria-label="Décor d’animation peint : un village aux fenêtres éclairées sous un ciel de crépuscule">
        <defs>
          <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b1850" />
            <stop offset=".28" stopColor="#3b34a0" />
            <stop offset=".46" stopColor="#7d5bc4" />
            <stop offset=".58" stopColor="#d46fa6" />
            <stop offset=".68" stopColor="#f4a07c" />
            <stop offset=".74" stopColor="#fbc58f" />
          </linearGradient>
          <radialGradient id="soleil" cx=".62" cy=".66" r=".42">
            <stop offset="0" stopColor="#ffe1a8" stopOpacity=".95" />
            <stop offset=".25" stopColor="#ffb98a" stopOpacity=".55" />
            <stop offset="1" stopColor="#ff8aa0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="nuage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd7c9" />
            <stop offset="1" stopColor="#c58be0" />
          </linearGradient>
          <linearGradient id="lueur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd98a" />
            <stop offset="1" stopColor="#ff9a3c" />
          </linearGradient>
          <linearGradient id="m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b48ad6" /><stop offset="1" stopColor="#e39ac0" /></linearGradient>
          <linearGradient id="m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a69cc" /><stop offset="1" stopColor="#c47fbd" /></linearGradient>
          <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6b58c0" /><stop offset="1" stopColor="#9a6fc0" /></linearGradient>
          <linearGradient id="c2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4b45a8" /><stop offset="1" stopColor="#6a55b0" /></linearGradient>
          <linearGradient id="c3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#35338a" /><stop offset="1" stopColor="#473f9a" /></linearGradient>
          <linearGradient id="c4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#25256e" /><stop offset="1" stopColor="#14154a" /></linearGradient>
          <linearGradient id="brume" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffc8c0" stopOpacity="0" />
            <stop offset=".6" stopColor="#f2a9c8" stopOpacity=".45" />
            <stop offset="1" stopColor="#ffc8c0" stopOpacity="0" />
          </linearGradient>
          <filter id="gouache" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency=".022 .03" numOctaves="3" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="7" />
          </filter>
          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .6  0 0 0 .9 -.28" />
          </filter>
          <filter id="flou"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>

        <rect width="800" height="1000" fill="url(#ciel)" />
        <rect width="800" height="1000" fill="url(#soleil)" />

        {/* étoiles */}
        <g fill="#fff" opacity=".8">
          {[[90, 90, 1.6], [210, 150, 1.1], [330, 60, 1.4], [470, 130, 1], [610, 80, 1.7], [720, 170, 1.2], [150, 250, 1], [560, 240, 1.1], [690, 300, 1], [40, 330, 1.2], [400, 220, .9]].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
        {/* lune fine */}
        <g opacity=".9">
          <circle cx="640" cy="200" r="30" fill="#fff3d9" />
          <circle cx="652" cy="192" r="28" fill="#4a3fae" />
        </g>

        {/* nuages (glissent doucement) */}
        <g className="nuage-glisse" style={{ animationDuration: "70s" }}><Nuage x={190} y={330} s={1.1} o={0.5} /></g>
        <g className="nuage-glisse" style={{ animationDuration: "90s", animationDelay: "-30s" }}><Nuage x={560} y={420} s={1.5} o={0.55} /></g>
        <g className="nuage-glisse" style={{ animationDuration: "110s", animationDelay: "-60s" }}><Nuage x={90} y={520} s={.9} o={0.4} /></g>
        <g className="nuage-glisse" style={{ animationDuration: "80s", animationDelay: "-15s" }}><Nuage x={700} y={560} s={.8} o={0.45} /></g>

        {/* plans, du plus lointain au plus proche */}
        <g filter="url(#gouache)">
          <path d="M-20 640 L60 560 L130 610 L230 520 L330 618 L420 560 L520 626 L640 530 L740 600 L820 560 V760 H-20Z" fill="url(#m1)" opacity=".85" />
          <path d="M-20 690 L90 600 L170 660 L290 585 L390 668 L500 600 L610 676 L720 612 L820 660 V800 H-20Z" fill="url(#m2)" opacity=".9" />
        </g>
        <rect x="0" y="640" width="800" height="90" fill="url(#brume)" />

        <g filter="url(#gouache)">
          <path d="M-20 712 C70 676 150 690 240 706 C330 722 400 664 500 668 C600 672 700 704 820 676 V860 H-20Z" fill="url(#c1)" />
        </g>
        <rect x="0" y="690" width="800" height="80" fill="url(#brume)" opacity=".8" />

        {/* village sur la colline moyenne */}
        <g filter="url(#gouache)">
          <path d="M-20 748 C60 720 130 724 220 742 C300 758 360 716 460 712 C560 708 660 752 820 722 V900 H-20Z" fill="url(#c2)" />
        </g>
        <g>
          <Maison x={104} y={700} w={44} h={28} toit="#34307c" mur="#4a4596" />
          <Maison x={190} y={718} w={36} h={24} toit="#34307c" mur="#4a4596" />
          <Maison x={360} y={690} w={50} h={32} toit="#34307c" mur="#4a4596" />
          <Maison x={440} y={708} w={34} h={22} toit="#34307c" mur="#4a4596" lumiere={false} />
          <Maison x={560} y={706} w={30} h={20} toit="#34307c" mur="#4a4596" />
          {FENETRES.map(([x, y]) => <circle key={`${x}-${y}`} cx={x + 8} cy={y + 10} r="14" fill="#ffb454" opacity=".18" filter="url(#flou)" />)}
          <Pin x={70} y={736} s={.7} c="#2c2a78" /><Pin x={92} y={742} s={.55} c="#2c2a78" />
          <Pin x={300} y={738} s={.8} c="#2c2a78" /><Pin x={325} y={734} s={.6} c="#2c2a78" />
          <Pin x={520} y={726} s={.7} c="#2c2a78" /><Pin x={640} y={738} s={.75} c="#2c2a78" /><Pin x={668} y={742} s={.55} c="#2c2a78" />
        </g>
        <rect x="0" y="740" width="800" height="70" fill="url(#brume)" opacity=".7" />

        <g filter="url(#gouache)">
          <path d="M-20 810 C80 770 180 780 280 800 C400 824 480 772 600 776 C700 780 760 800 820 790 V1000 H-20Z" fill="url(#c3)" />
        </g>
        {/* arbres du plan 3 */}
        <Rond x={40} y={800} s={1.2} c="#2a2a78" /><Rond x={92} y={806} s={.9} c="#2a2a78" />
        <Pin x={560} y={790} s={1.5} c="#26266f" /><Pin x={612} y={796} s={1.15} c="#26266f" /><Pin x={740} y={796} s={1.4} c="#26266f" />

        {/* premier plan : maison éclairée, chemin, grands pins */}
        <g filter="url(#gouache)">
          <path d="M-20 900 C100 850 200 868 320 890 C440 912 560 860 680 872 C740 878 790 890 820 884 V1000 H-20Z" fill="url(#c4)" />
        </g>
        <path d="M330 1000 C340 950 380 922 470 902 C440 930 420 960 440 1000Z" fill="#f0a77a" opacity=".16" />
        <g transform="translate(150 842)">
          <Maison x={0} y={0} w={92} h={52} toit="#16164a" mur="#1f2060" />
          <circle cx="24" cy="26" r="26" fill="#ffb454" opacity=".22" filter="url(#flou)" />
        </g>
        <Pin x={60} y={900} s={2.4} c="#12123c" /><Pin x={112} y={912} s={1.8} c="#12123c" />
        <Rond x={690} y={904} s={2.2} c="#12123c" /><Pin x={752} y={914} s={2.6} c="#12123c" />
        <Pin x={30} y={960} s={3.6} c="#0d0d30" />

        {/* grain de papier */}
        <rect width="800" height="1000" filter="url(#grain)" opacity=".55" style={{ mixBlendMode: "overlay" }} />
      </svg>
      {/* voile bas pour la lisibilité de la légende */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#1b1850]/75 to-transparent lg:inset-x-0 lg:bottom-0 lg:top-auto lg:h-1/3 lg:bg-gradient-to-t lg:from-[#0d0d30]/70" />
      {legende && (
        <figcaption className="absolute left-5 right-5 top-4 flex items-end lg:bottom-7 lg:top-auto justify-between gap-3 text-white lg:left-8 lg:right-8">
          <span>
            <span className="block text-[11px] font-semibold uppercase tracking-[.16em] text-white/65">Séquence 04 · crépuscule</span>
            <span className="mt-0.5 block text-[15px] font-semibold tracking-tight lg:text-lg">Décor couleur — plan 12</span>
          </span>
          <span className="hidden text-right text-[13px] italic text-white/70 lg:block">« Le décor, c’est ce qui fait<br />croire au monde du film. »</span>
        </figcaption>
      )}
    </figure>
  );
}
