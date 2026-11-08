// The hero illustration, drawn like a newspaper engraving: a stack of books with two wedding
// rings resting on top, a leaning book, and a potted plant. Cream line work on the dark masthead.

const LEAVES: [number, number, number][] = [
  // x, y, angle
  [486, 214, -48],
  [470, 176, -62],
  [500, 252, -30],
  [548, 230, 30],
  [566, 196, 44],
  [584, 166, 52],
  [520, 168, -8],
  [524, 128, 6],
  [512, 286, -20],
  [536, 280, 24],
]

export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 640 440" fill="none" aria-hidden="true">
      <defs>
        <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeWidth="0.9" />
        </pattern>
        <pattern id="hatch-fine" width="3.5" height="3.5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <line x1="0" y1="0" x2="0" y2="3.5" stroke="currentColor" strokeWidth="0.6" />
        </pattern>
      </defs>

      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Table */}
        <path d="M18 402H622" />
        <path d="M40 410H600" strokeWidth="0.8" strokeDasharray="2 5" />

        {/* Book stack */}
        <rect x="96" y="350" width="290" height="52" rx="5" />
        <rect x="96" y="350" width="34" height="52" rx="5" fill="url(#hatch)" />
        <path d="M130 350v52M352 350v52M140 366h200M140 386h200" strokeWidth="0.9" />
        <path d="M364 356h18M364 364h18M364 372h18M364 380h18M364 388h18M364 396h18" strokeWidth="0.6" />

        <rect x="122" y="304" width="246" height="46" rx="5" />
        <rect x="334" y="304" width="34" height="46" rx="5" fill="url(#hatch)" />
        <path d="M334 304v46M150 304v46M162 320h160M162 334h120" strokeWidth="0.9" />
        <circle cx="244" cy="327" r="7" strokeWidth="0.9" />

        <rect x="146" y="276" width="204" height="28" rx="4" />
        <rect x="146" y="276" width="26" height="28" rx="4" fill="url(#hatch-fine)" />
        <path d="M172 276v28M186 290h140" strokeWidth="0.9" />

        {/* Rings, standing together on the top book */}
        <circle cx="226" cy="248" r="27" />
        <circle cx="226" cy="248" r="21" strokeWidth="0.8" />
        <circle cx="262" cy="250" r="25" />
        <circle cx="262" cy="250" r="19.5" strokeWidth="0.8" />
        <path d="M214 221l12-14 12 14-12 6z" fill="url(#hatch-fine)" />
        <path d="M214 221h24M226 207v20" strokeWidth="0.7" />
        <path d="M206 198l-6-8M226 192v-10M246 198l6-8" strokeWidth="1" />

        {/* A small heart rising from the rings */}
        <path d="M300 196c-6-8-20-4-16 8 3 7 16 16 16 16s13-9 16-16c4-12-10-16-16-8z" />
        <path d="M282 232c6-6 10-10 12-16" strokeWidth="0.8" strokeDasharray="1.5 4" />

        {/* Leaning book */}
        <g transform="rotate(-12 408 402)">
          <rect x="388" y="236" width="40" height="166" rx="4" />
          <rect x="388" y="236" width="40" height="166" rx="4" fill="url(#hatch)" opacity="0.5" />
          <path d="M392 262h32M392 376h32M398 290h20M398 300h20" strokeWidth="0.9" />
        </g>

        {/* Plant */}
        <path d="M466 332h116l-14 70h-88z" />
        <path d="M458 318h132v14H458z" />
        <path d="M480 352h88M476 372h96" strokeWidth="0.7" />
        <path d="M472 338l-6 64" strokeWidth="0.6" />
        <path d="M524 318c-6-40-22-86-58-140" />
        <path d="M524 318c4-44 26-92 64-150" />
        <path d="M524 318c0-60-2-130 0-196" />
        <path d="M524 318c-10-14-18-26-14-44M524 318c10-16 14-26 12-44" strokeWidth="1.2" />
        {LEAVES.map(([x, y, a], i) => (
          <g key={i} transform={`rotate(${a} ${x} ${y})`}>
            <path d={`M${x - 26} ${y}c10-12 42-12 52 0-10 12-42 12-52 0z`} fill={i % 3 === 0 ? 'url(#hatch-fine)' : undefined} />
            <path d={`M${x - 22} ${y}h44`} strokeWidth="0.7" />
          </g>
        ))}
      </g>
    </svg>
  )
}
