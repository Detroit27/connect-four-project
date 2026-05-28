import styles from './FallingChips.module.css'

// Deterministic pseudo-random generator so values are stable across renders
function seededRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

const r = seededRng(0xdeadbeef)
const CHIP_COUNT = 26

interface ChipConfig {
  x: number; size: number; delay: number
  duration: number; isRed: boolean; rotate: number
}

const CHIPS: ChipConfig[] = Array.from({ length: CHIP_COUNT }, () => ({
  x:        r() * 98 + 1,
  size:     18 + r() * 18,
  delay:    r() * 10,
  duration: 5 + r() * 7,
  isRed:    r() > 0.5,
  rotate:   r() * 360,
}))

export function FallingChips() {
  return (
    <div className={styles.root} aria-hidden>
      {CHIPS.map((c, i) => (
        <div
          key={i}
          className={`${styles.chip} ${c.isRed ? styles.red : styles.blue}`}
          style={{
            left:              `${c.x}%`,
            width:             c.size,
            height:            c.size,
            animationDelay:    `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            '--rotate-start':  `${c.rotate}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
