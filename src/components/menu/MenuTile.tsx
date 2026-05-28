import { motion } from 'framer-motion'
import styles from './MenuTile.module.css'

interface Props {
  title: string
  subtitle: string
  onClick: () => void
}

export function MenuTile({ title, subtitle, onClick }: Props) {
  return (
    <motion.button
      className={styles.tile}
      whileHover={{ x: -6 }}
      whileTap={{ x: -3, opacity: 0.88 }}
      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
      onClick={onClick}
    >
      <span className={styles.title}>{title}</span>
      <span className={styles.subtitle}>{subtitle}</span>
    </motion.button>
  )
}
