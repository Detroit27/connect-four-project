import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './BoardBackground.module.css'

const ROWS = 6
const COLS = 7
const INTERVAL_MS = 480
const CHIP_COLORS = ['#E63946', '#4F56E3', '#9333EA', '#06B6D4']

interface BgChip { id: number; color: string }

type Columns = BgChip[][]   // columns[col] = stack of chips bottom-up

function emptyColumns(): Columns {
  return Array.from({ length: COLS }, () => [])
}

export function BoardBackground() {
  const [columns, setColumns] = useState<Columns>(emptyColumns)
  const [clearing, setClearing] = useState(false)
  const nextId = useRef(0)
  const boardRef = useRef<HTMLDivElement>(null)

  // Fill phase: add one chip every INTERVAL_MS
  useEffect(() => {
    if (clearing) return
    const timer = setInterval(() => {
      setColumns(prev => {
        const avail = prev.reduce<number[]>((acc, col, i) => {
          if (col.length < ROWS) acc.push(i)
          return acc
        }, [])
        if (avail.length === 0) {
          setClearing(true)
          return prev
        }
        const colIdx = avail[Math.floor(Math.random() * avail.length)]
        const color  = CHIP_COLORS[Math.floor(Math.random() * CHIP_COLORS.length)]
        const chip: BgChip = { id: ++nextId.current, color }
        return prev.map((col, i) => i === colIdx ? [...col, chip] : col)
      })
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [clearing])

  // Clear phase: wait for exit animation, then reset
  useEffect(() => {
    if (!clearing) return
    const timer = setTimeout(() => {
      setColumns(emptyColumns())
      setClearing(false)
    }, 900)
    return () => clearTimeout(timer)
  }, [clearing])

  // Cell height for fall animation (updated on resize)
  const [cellH, setCellH] = useState(0)
  useEffect(() => {
    const update = () => {
      if (boardRef.current) setCellH(boardRef.current.offsetHeight / ROWS)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div className={styles.root} aria-hidden>
      <div className={styles.board} ref={boardRef}>
        {Array.from({ length: COLS }, (_, colIdx) => {
          const colChips = columns[colIdx]   // bottom-up stack
          const holes    = ROWS - colChips.length

          return (
            <div key={colIdx} className={styles.column}>
              {/* Empty holes at top */}
              {Array.from({ length: holes }, (_, i) => (
                <div key={`h-${i}`} className={styles.hole} />
              ))}
              {/* Chips: rendered top-down (newest = visually highest) */}
              <AnimatePresence>
                {[...colChips].reverse().map((chip, stackIdx) => {
                  // stackIdx 0 = topmost chip in column
                  // rowFromTop = holes + stackIdx
                  const rowFromTop = holes + stackIdx
                  const fallPx = cellH > 0 ? -(rowFromTop + 1) * cellH : -999
                  return (
                    <motion.div
                      key={chip.id}
                      className={styles.chip}
                      style={{ background: chip.color }}
                      initial={{ y: fallPx }}
                      animate={{ y: 0 }}
                      exit={{ y: cellH > 0 ? (ROWS - rowFromTop + 1) * cellH : 500, opacity: 0 }}
                      transition={
                        clearing
                          ? { duration: 0.45, ease: 'easeIn' }
                          : { type: 'spring', stiffness: 200, damping: 20, mass: 0.85 }
                      }
                    />
                  )
                })}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Dark overlay so content stays readable */}
      <div className={styles.overlay} />
    </div>
  )
}
