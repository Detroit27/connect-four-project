import { useEffect, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useShopStore } from '../../store/shopStore'
import { useAuthStore } from '../../store/authStore'
import { dropChip, checkWin, isBoardFull } from '../../lib/gameLogic'
import { getAIMove } from '../../lib/ai'
import { playClick } from '../../lib/sound'
import { useT } from '../../i18n'
import { Board } from './Board'
import type { Difficulty, SpMatch } from '../../types'
import styles from './GameView.module.css'

// Coins scale with difficulty — more challenge, more reward
const COINS: Record<Difficulty, { win: number; loss: number }> = {
  easy:      { win: 20,  loss: 5  },
  medium:    { win: 40,  loss: 8  },
  hard:      { win: 65,  loss: 12 },
  extrahard: { win: 100, loss: 15 },
}

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

  const coins = COINS[difficulty]

  const handleMove = useCallback((col: number, player: typeof currentPlayer) => {
    const next = dropChip(board, col, player)
    if (!next) return
    playClick()
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
    const earned = result === 'win' ? coins.win : coins.loss
    addCurrency(earned)
    updateCurrencyOnServer(earned)
    const match: SpMatch = {
      id: crypto.randomUUID(),
      difficulty,
      result,
      moves: useGameStore.getState().moves,
      movesCount: useGameStore.getState().moves.length,
      durationSeconds: Math.round((Date.now() - (gameStartedAt ?? Date.now())) / 1000),
      playedAt: new Date().toISOString(),
      coinsEarned: earned,
    }
    addSpMatch(match)
  }, [winInfo, isDraw]) // eslint-disable-line

  // AI turn
  useEffect(() => {
    if (currentPlayer !== 2 || winInfo || isDraw) return
    setIsAIThinking(true)
    const timer = setTimeout(() => {
      handleMove(getAIMove(board, difficulty), 2)
      setIsAIThinking(false)
    }, 480)
    return () => clearTimeout(timer)
  }, [currentPlayer, winInfo, isDraw, board, difficulty, handleMove, setIsAIThinking])

  const ended = !!(winInfo || isDraw)
  const earnedCoins = ended
    ? (isDraw ? coins.loss : winInfo!.winner === 1 ? coins.win : coins.loss)
    : null

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
          {earnedCoins !== null && (
            <p className={styles.coins}>+{earnedCoins} {t.game.earned}</p>
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
