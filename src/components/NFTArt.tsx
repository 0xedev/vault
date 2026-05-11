export default function NFTArt({ seed = 0, label, size = "100%" }: { seed?: number; label?: string; size?: string }) {
  const palettes = [
    ["#013A90", "#ACC2DC", "#063D91"],
    ["#023A8F", "#7F9DC5", "#184A95"],
    ["#063D91", "#EAF2F7", "#013A90"],
    ["#184A95", "#ACC2DC", "#023A8F"],
    ["#013A90", "#7F9DC5", "#063D91"],
    ["#033A8E", "#E6C97C", "#013A8E"],
    ["#023A8F", "#ACC2DC", "#184A95"],
    ["#013A8E", "#7F9DC5", "#063D91"],
  ];
  const p = palettes[seed % palettes.length];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const n = (_k: number) => ((Math.sin(seed * 12.9 + _k * 78.2) * 43758.5) % 1 + 1) % 1;
  const variant = seed % 5;

  return (
    <div className="nft" style={{ width: size, height: size, background: p[0] }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`g${seed}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={p[1]}/>
            <stop offset="1" stopColor={p[2]}/>
          </linearGradient>
          <pattern id={`s${seed}`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform={`rotate(${n(1)*90})`}>
            <rect width="3" height="3" fill={p[0]}/>
            <line x1="0" y1="0" x2="0" y2="3" stroke={p[1]} strokeWidth="0.4" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#s${seed})`}/>
        {variant === 0 && (
          <>
            <circle cx="50" cy="50" r={28 + n(2) * 10} fill={`url(#g${seed})`} opacity="0.85"/>
            <circle cx="50" cy="50" r={14 + n(3) * 6} fill={p[0]}/>
            <circle cx="50" cy="50" r={6} fill={p[1]}/>
          </>
        )}
        {variant === 1 && (
          <>
            <polygon points="50,15 85,75 15,75" fill={`url(#g${seed})`} opacity="0.9"/>
            <polygon points="50,30 72,68 28,68" fill={p[0]}/>
          </>
        )}
        {variant === 2 && (
          <>
            <rect x="20" y="20" width="60" height="60" fill={`url(#g${seed})`} opacity="0.85" transform={`rotate(${n(2)*45} 50 50)`}/>
            <rect x="35" y="35" width="30" height="30" fill={p[0]} transform={`rotate(${n(3)*45} 50 50)`}/>
          </>
        )}
        {variant === 3 && (
          <>
            <path d={`M0 ${50 + n(2)*20} Q 25 ${20 + n(3)*20} 50 50 T 100 ${40 + n(4)*30}`} stroke={p[1]} strokeWidth="3" fill="none"/>
            <path d={`M0 ${70 + n(5)*10} Q 25 ${40 + n(6)*20} 50 70 T 100 ${60 + n(7)*20}`} stroke={p[2]} strokeWidth="3" fill="none"/>
            <circle cx="50" cy="50" r="18" fill={`url(#g${seed})`} opacity="0.75"/>
          </>
        )}
        {variant === 4 && (
          <>
            <rect x="10" y="40" width="80" height="20" fill={`url(#g${seed})`}/>
            <rect x="40" y="10" width="20" height="80" fill={`url(#g${seed})`} opacity="0.7"/>
            <circle cx="50" cy="50" r="8" fill={p[0]}/>
          </>
        )}
      </svg>
      {label && <span className="label">{label}</span>}
    </div>
  );
}
