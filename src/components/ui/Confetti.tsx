import { useMemo } from 'react'
import styles from './Confetti.module.css'

const COLORS = ['#E63946', '#4F56E3', '#F59E0B', '#10B981', '#9333EA', '#06B6D4', '#FF4500']
const COUNT = 64

interface Particle {
  x: number; delay: number; duration: number
  size: number; color: string; skew: number; drift: number
}

export function Confetti() {
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      x: (i / COUNT) * 100 + (Math.random() * (100 / COUNT) - 50 / COUNT),
      delay:    Math.random() * 0.9,
      duration: 1.4 + Math.random() * 1.4,
      size:     5 + Math.random() * 8,
      color:    COLORS[Math.floor(Math.random() * COLORS.length)],
      skew:     (Math.random() - 0.5) * 40,
      drift:    (Math.random() - 0.5) * 120,
    })),
  [])

  return (
    <div className={styles.root} aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          className={styles.piece}
          style={{
            left:              `${p.x}%`,
            width:             p.size,
            height:            p.size * 0.55,
            background:        p.color,
            animationDelay:    `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift':         `${p.drift}px`,
            '--skew':          `${p.skew}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
