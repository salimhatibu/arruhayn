// Faint Arabic letters behind the home page heading, echoing the logo's background.
const LETTERS = 'أبتثجحخدذرزسشصضطظعغفقكلمنهوي'

export function HeroLetters() {
  // Fixed positions so the server and browser render the same thing.
  const items = Array.from({ length: 34 }, (_, i) => {
    const x = (i * 137) % 1200
    const y = 30 + ((i * 89) % 340)
    const size = 22 + ((i * 53) % 80)
    const fill = i % 3 === 0 ? 'var(--lilac-deep)' : 'var(--mint-deep)'
    return { x, y, size, fill, ch: LETTERS[(i * 7) % LETTERS.length] }
  })
  return (
    <svg className="hero-letters" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {items.map((it, i) => (
        <text key={i} x={it.x} y={it.y} fontSize={it.size} fill={it.fill} opacity={0.55}>
          {it.ch}
        </text>
      ))}
    </svg>
  )
}
