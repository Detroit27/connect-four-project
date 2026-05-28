import { useEffect, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useShopStore } from '../../store/shopStore'
import { useAuthStore } from '../../store/authStore'
import { dropChip, checkWin, isBoardFull } from '../../lib/gameLogic'
import { getAIMove } from '../../lib/ai'
import { useT } from '../../i18n'
import { Board } from './Board'
import type { SpMatch } from '../../types'
import styles from './GameView.module.css'

const WIN_COINS = 50
const LOSS_COINS = 10

export function GameView() {
  const t = useT()
  const {
    board, currentPlayer, winInfo, isDraw, isAIThinking, difficulty,
    gameStartedAt,
    setBoard, setCurrentPlayer, setWinInfo, setIsDraw,
    setIsAIThinking, pushMove, resetGame, exitGame, addSpMatch,
  } = useGameStore()
  const { addCurrency } = useShopStore()
  const { updateCurrencyOnServer } = useAuthStore()

  const handleMove = useCallback((col: number, player: typeof currentPlayer) => {
    const next = dropChip(board, col, player)
    if (!next) return
    setBoard(next)
    pushMove(col)
    const win = checkWin(next)
    if (win) { setWinInfo(win); return }
    if (isBoardFull(next)) { setIsDraw(true); return }
    setCurrentPlayer(player === 1 ? 2 : 1)
  }, [board, pushMove, setBoard, setCurrentPlayer, setIsDraw, setWinInfo])

  // Award coins and save match when game ends
  useEffect(() => {
    if (!winInfo && !isDraw) return
    const result = isDraw ? 'draw' : winInfo!.winner === 1 ? 'win' : 'loss'
    const coins = result === 'win' ? WIN_COINS : LOSS_COINS
    addCurrency(coins)
    updateCurrencyOnServer(coins)
    const match: SpMatch = {
      id: crypto.randomUUID(),
      difficulty,
      result,
      moves: useGameStore.getState().moves,
      movesCount: useGameStore.getState().moves.length,
      durationSeconds: Math.round((Date.now() - (gameStartedAt ?? Date.now())) / 1000),
      playedAt: new Date().toISOString(),
      coinsEarned: coins,
    }
    addSpMatch(match)
  }, [winInfo, isDraw]) // eslint-disable-line

  // AI turn
  useEffect(() => {
    if (currentPlayer !== 2 || winInfo || isDraw) return
    setIsAIThinking(true)
    const t = setTimeout(() => {
      handleMove(getAIMove(board, difficulty), 2)
      setIsAIThinking(false)
    }, 480)
    return () => clearTimeout(t)
  }, [currentPlayer, winInfo, isDraw, board, difficulty, handleMove, setIsAIThinking])

  const ended = !!(winInfo || isDraw)
  const coins = ended ? (isDraw ? LOSS_COINS : winInfo!.winner === 1 ? WIN_COINS : LOSS_COINS) : null

  const statusText = () => {
    if (winInfo) return winInfo.winner === 1 ? t.game.youWin : t.game.aiWins
    if (isDraw) return t.game.draw
    if (isAIThinking) return t.game.aiThinking
    return currentPlayer === 1 ? t.game.yourTurn : t.game.aiTurn
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className="btn-ghost" onClick={exitGame}>{t.common.back}</button>
        <div className={styles.status}>
          <span className={`${styles.dot} ${currentPlayer === 1 || winInfo?.winner === 1 ? styles.p1 : styles.p2}`} />
          {statusText()}
        </div>
        <button className="btn-ghost" onClick={resetGame}>{t.game.restart}</button>
      </div>

      <Board onColumnClick={(col) => {
        if (currentPlayer === 1 && !winInfo && !isDraw) handleMove(col, 1)
      }} winInfo={winInfo} />

      {ended && (
        <div className={styles.result}>
          {coins !== null && (
            <p className={styles.coins}>+{coins} {t.game.earned}</p>
          )}
          <div className={styles.actions}>
            <button className="btn-primary" onClick={resetGame}>{t.game.playAgain}</button>
            <button className="btn-ghost" onClick={exitGame}>{t.game.mainMenu}</button>
          </div>
        </div>
      )}
    </div>
  )
}
