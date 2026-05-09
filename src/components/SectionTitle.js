'use client'

const PINK = '#f4b8cc'
const BLUE = '#a8d8f0'

export default function SectionTitle({ text }) {
  const chars = [...text]
  return (
    <span style={{
      fontFamily: 'var(--font-cormorant), Georgia, serif',
      fontSize: 'clamp(56px, 10vw, 100px)',
      fontWeight: 300,
      letterSpacing: '0.15em',
      display: 'inline-block',
      lineHeight: 1.1,
    }}>
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            animationName: i % 2 === 0 ? 'letterSparklePink' : 'letterSparkleBlue',
            animationDuration: '5s',
            animationDelay: `${i * 0.13}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  )
}
