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
          const colChips = columns[colIdx]            // bottom-up stack
          const filledFrom = ROWS - colChips.length   // rows >= this index are filled

          return (
            <div key={colIdx} className={styles.column}>
              {/* Fixed grid of cells — holes ALWAYS rendered, chips overlay them */}
              {Array.from({ length: ROWS }, (_, row) => {
                // row 0 = top. A chip occupies this row when row >= filledFrom.
                const hasChip = row >= filledFrom
                const chip    = hasChip ? colChips[ROWS - 1 - row] : null
                // Fall distance: start above the board top, spring into the slot
                const fallPx  = cellH > 0 ? -(row + 1) * cellH - cellH : -999

                return (
                  <div key={row} className={styles.cell}>
                    <div className={styles.hole} />
                    <AnimatePresence>
                      {chip && (
                        <motion.div
                          key={chip.id}
                          className={styles.chip}
                          style={{ background: chip.color }}
                          initial={{ y: fallPx }}
                          animate={{ y: 0 }}
                          exit={{ y: cellH > 0 ? (ROWS - row + 1) * cellH : 500, opacity: 0 }}
                          transition={
                            clearing
                              ? { duration: 0.45, ease: 'easeIn' }
                              : { type: 'spring', stiffness: 200, damping: 20, mass: 0.85 }
                          }
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Dark overlay so content stays readable */}
      <div className={styles.overlay} />
    </div>
  )
}
