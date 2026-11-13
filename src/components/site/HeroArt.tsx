// The hero scene, built from four icons: a wedding arch, the books inside it, a plant beside it,
// and a lit bulb above. Each icon is used as a mask and tinted from the palette, so the artwork
// stays in the site's colours.

const PIECES = ['arch', 'books', 'plant', 'bulb'] as const

export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <span className="hero-art-glow" />
      {PIECES.map((name) => (
        <span key={name} className={`hero-art-piece hero-art-${name}`} />
      ))}
      <span className="hero-art-ground" />
    </div>
  )
}
