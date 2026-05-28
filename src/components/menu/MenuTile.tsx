import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import styles from './MenuTile.module.css'

interface Props {
  title: string
  subtitle: string
  onClick: () => void
}

export function MenuTile({ title, subtitle, onClick }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 300, damping: 28 })
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), { stiffness: 300, damping: 28 })
  const scale   = useSpring(1, { stiffness: 300, damping: 28 })

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onEnter = () => scale.set(1.03)
  const onLeave = () => { mx.set(0); my.set(0); scale.set(1) }

  return (
    <motion.button
      ref={ref}
      className={styles.tile}
      style={{ rotateX, rotateY, scale, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
    >
      <span className={styles.title}>{title}</span>
      <span className={styles.subtitle}>{subtitle}</span>
    </motion.button>
  )
}
