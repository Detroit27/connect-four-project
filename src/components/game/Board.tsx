import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { useShopStore } from '../../store/shopStore'
import { getSkin } from '../../lib/skins'
import { getDropRow } from '../../lib/gameLogic'
import type { WinInfo } from '../../types'
import styles from './Board.module.css'

interface Props {
  onColumnClick: (col: number) => void
  winInfo: WinInfo | null
  /** Если передан — используется как board вместо store (для replay) */
  boardOverride?: import('../../types').Board
  disableClick?: boolean
}

const ROWS = 6
const COLS = 7

function isWinCell(row: number, col: number, w: WinInfo | null) {
  return w?.cells.some(([r, c]) => r === row && c === col) ?? false
}

export function Board({ onColumnClick, winInfo, boardOverride, disableClick }: Props) {
  const { board: storeBoard, isAIThinking } = useGameStore()
  const { currentSkin } = useShopStore()
  const board = boardOverride ?? storeBoard
  const skin = getSkin(currentSkin)
  const blocked = isAIThinking || !!disableClick

  return (
    <div className={styles.wrapper}>
      <div className={styles.board}>
        {Array.from({ length: COLS }, (_, col) => (
          <div
            key={col}
            className={`${styles.column} ${blocked ? styles.disabled : ''}`}
            onClick={() => !blocked && onColumnClick(col)}
          >
            {Array.from({ length: ROWS }, (_, row) => {
              const cell = board[row][col]
              const winning = isWinCell(row, col, winInfo)
              const isP1 = cell === 1

              return (
                <div key={row} className={styles.cell}>
                  <div className={styles.hole}>
                    <AnimatePresence>
                      {cell !== 0 && (
                        <motion.div
                          key={`${row}-${col}`}
                          className={`${styles.chip} ${isP1 ? styles.p1 : styles.p2} ${winning ? styles.winning : ''}`}
                          style={isP1 && skin.image ? {
                            backgroundImage: `url(${skin.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          } : undefined}
                          initial={boardOverride ? { y: 0, opacity: 1 } : { y: -((getDropRow(board, col) ?? row) + 1) * 64 - 64 }}
                          animate={{ y: 0 }}
                          transition={{ type: 'spring', stiffness: 280, damping: 22, mass: 0.8 }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
