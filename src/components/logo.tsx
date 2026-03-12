export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  // Waveform bars forming phone handset silhouette with signal rings
  // Based on design-9: tall earpiece cluster, short neck dip, tall mouthpiece cluster
  const s = size / 500; // scale factor from 500x500 viewBox

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF2200" />
          <stop offset="100%" stopColor="#CC1A00" />
        </linearGradient>
        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Signal rings */}
      <circle cx="250" cy="250" r="235" fill="none" stroke="#FF2200" strokeWidth="1" opacity="0.07" />
      <circle cx="250" cy="250" r="195" fill="none" stroke="#FF2200" strokeWidth="1" opacity="0.10" />
      <circle cx="250" cy="250" r="155" fill="none" stroke="#FF2200" strokeWidth="1.2" opacity="0.13" />
      <circle cx="250" cy="250" r="115" fill="none" stroke="#FF2200" strokeWidth="1.5" opacity="0.16" />

      {/* Signal arc segments — top-right */}
      <path d="M 250 250 m 0 -235 a 235 235 0 0 1 166.2 68.8" fill="none" stroke="#FF2200" strokeWidth="1.5" opacity="0.12" strokeLinecap="round" />
      <path d="M 250 250 m 0 -195 a 195 195 0 0 1 137.9 57.1" fill="none" stroke="#FF2200" strokeWidth="1.5" opacity="0.16" strokeLinecap="round" />
      <path d="M 250 250 m 0 -155 a 155 155 0 0 1 109.6 45.4" fill="none" stroke="#FF2200" strokeWidth="2" opacity="0.20" strokeLinecap="round" />

      {/* Signal arc segments — bottom-left */}
      <path d="M 250 250 m 0 235 a 235 235 0 0 1 -166.2 -68.8" fill="none" stroke="#FF2200" strokeWidth="1.5" opacity="0.12" strokeLinecap="round" />
      <path d="M 250 250 m 0 195 a 195 195 0 0 1 -137.9 -57.1" fill="none" stroke="#FF2200" strokeWidth="1.5" opacity="0.16" strokeLinecap="round" />
      <path d="M 250 250 m 0 155 a 155 155 0 0 1 -109.6 -45.4" fill="none" stroke="#FF2200" strokeWidth="2" opacity="0.20" strokeLinecap="round" />

      {/* Radial glow */}
      <radialGradient id="radGlow" cx="50%" cy="48%" r="50%">
        <stop offset="0%" stopColor="#FF2200" stopOpacity="0.12" />
        <stop offset="40%" stopColor="#FF2200" stopOpacity="0.04" />
        <stop offset="70%" stopColor="#FF2200" stopOpacity="0" />
      </radialGradient>
      <rect width="500" height="500" fill="url(#radGlow)" />

      {/* Waveform bars — phone handset silhouette */}
      <g filter="url(#logoGlow)" transform="translate(120, 150)">
        {/* Left earpiece cluster (tall) */}
        <rect x="10" y="42" width="4" height="116" rx="2" fill="url(#barGrad)" opacity="0.5" />
        <rect x="18" y="28" width="4" height="144" rx="2" fill="url(#barGrad)" opacity="0.6" />
        <rect x="26" y="18" width="5" height="164" rx="2" fill="url(#barGrad)" opacity="0.75" />
        <rect x="35" y="12" width="5" height="176" rx="2" fill="url(#barGrad)" opacity="0.85" />
        <rect x="44" y="8" width="5" height="184" rx="2" fill="url(#barGrad)" opacity="0.95" />
        <rect x="53" y="14" width="5" height="172" rx="2" fill="url(#barGrad)" opacity="0.9" />
        <rect x="62" y="22" width="5" height="156" rx="2" fill="url(#barGrad)" opacity="0.8" />

        {/* Neck dip (short bars) */}
        <rect x="71" y="58" width="4" height="84" rx="2" fill="url(#barGrad)" opacity="0.55" />
        <rect x="79" y="68" width="4" height="64" rx="2" fill="url(#barGrad)" opacity="0.45" />
        <rect x="87" y="74" width="4" height="52" rx="2" fill="url(#barGrad)" opacity="0.38" />
        <rect x="95" y="78" width="4" height="44" rx="2" fill="url(#barGrad)" opacity="0.32" />
        <rect x="103" y="80" width="4" height="40" rx="2" fill="url(#barGrad)" opacity="0.3" />
        <rect x="111" y="82" width="4" height="36" rx="2" fill="url(#barGrad)" opacity="0.28" />
        <rect x="119" y="80" width="4" height="40" rx="2" fill="url(#barGrad)" opacity="0.3" />
        <rect x="127" y="78" width="4" height="44" rx="2" fill="url(#barGrad)" opacity="0.32" />
        <rect x="135" y="75" width="4" height="50" rx="2" fill="url(#barGrad)" opacity="0.35" />
        <rect x="143" y="72" width="4" height="56" rx="2" fill="url(#barGrad)" opacity="0.4" />
        <rect x="151" y="66" width="4" height="68" rx="2" fill="url(#barGrad)" opacity="0.48" />

        {/* Right mouthpiece cluster (tall) */}
        <rect x="159" y="56" width="4" height="88" rx="2" fill="url(#barGrad)" opacity="0.55" />
        <rect x="167" y="42" width="5" height="116" rx="2" fill="url(#barGrad)" opacity="0.65" />
        <rect x="176" y="30" width="5" height="140" rx="2" fill="url(#barGrad)" opacity="0.75" />
        <rect x="185" y="20" width="5" height="160" rx="2" fill="url(#barGrad)" opacity="0.85" />
        <rect x="194" y="10" width="5" height="180" rx="2" fill="url(#barGrad)" opacity="0.95" />
        <rect x="203" y="6" width="5" height="188" rx="2" fill="url(#barGrad)" opacity="1" />
        <rect x="212" y="10" width="5" height="180" rx="2" fill="url(#barGrad)" opacity="0.95" />
        <rect x="221" y="18" width="5" height="164" rx="2" fill="url(#barGrad)" opacity="0.85" />
        <rect x="230" y="30" width="5" height="140" rx="2" fill="url(#barGrad)" opacity="0.7" />
        <rect x="239" y="44" width="4" height="112" rx="2" fill="url(#barGrad)" opacity="0.55" />
        <rect x="247" y="56" width="4" height="88" rx="2" fill="url(#barGrad)" opacity="0.4" />
      </g>
    </svg>
  );
}
