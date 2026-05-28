import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { dropChip, checkWin, isBoardFull, getWinningMove } from '../../lib/gameLogic'
import { applyMove, forfeitRoom, saveMpMatch, getRoomByCode, normalizeRoom } from '../../lib/multiplayer'
import { supabase } from '../../lib/supabase'
import { playClick, playWin, playLoss } from '../../lib/sound'
import { useShopStore } from '../../store/shopStore'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { useT } from '../../i18n'
import { Board } from '../game/Board'
import { Confetti } from '../ui/Confetti'
import type { Player, Board as BoardType, WinInfo, MpMatch } from '../../types'
import styles from './MultiplayerGame.module.css'

interface Props {
  roomCode: string
  initialBoard: BoardType
  initialMoves: number[]
  myPlayer: Player
  myUsername: string
  opponentUsername: string
  onExit: () => void
}

const WIN_COINS  = 80
const LOSS_COINS = 15

export function MultiplayerGame({
  roomCode, initialBoard, initialMoves, myPlayer, myUsername, opponentUsername, onExit,
}: Props) {
  const t = useT()
  const { addCurrency } = useShopStore()
  const { user, updateCurrencyOnServer, loadProfile } = useAuthStore()
  const { setReplayMatch } = useGameStore()

  const [board, setBoard]                   = useState<BoardType>(initialBoard)
  const [moves, setMoves]                   = useState<number[]>(initialMoves)
  const [currentPlayer, setCurrentPlayer]   = useState<Player>(1)
  const [winInfo, setWinInfo]               = useState<WinInfo | null>(null)
  const [isDraw, setIsDraw]                 = useState(false)
  const [forfeitWinner, setForfeitWinner]   = useState<Player | null>(null)
  const [syncError, setSyncError]           = useState(false)

  const settledRef  = useRef(false)
  const movesRef    = useRef(moves)
  movesRef.current  = moves

  const ended    = !!(winInfo || isDraw || forfeitWinner)
  const isMyTurn = currentPlayer === myPlayer && !ended
  const blinkCol = isMyTurn ? getWinningMove(board, myPlayer) : null

  const myResult: 'win' | 'loss' | 'draw' | null =
    !ended       ? null
    : isDraw     ? 'draw'
    : winInfo    ? (winInfo.winner === myPlayer ? 'win' : 'loss')
    : forfeitWinner ? (forfeitWinner === myPlayer ? 'win' : 'loss')
    : null

  const wasForfeit = !!forfeitWinner

  // Apply a snapshot from server — only move state FORWARD, never backward
  const applySnapshot = (row: ReturnType<typeof normalizeRoom>) => {
    if (row.moves.length > movesRef.current.length) {
      setBoard(row.board)
      setMoves(row.moves)
      setCurrentPlayer(row.current_player)
      const win = checkWin(row.board)
      if (win)                    { setWinInfo(win); return }
      if (isBoardFull(row.board)) { setIsDraw(true); return }
    }
    if (row.status === 'finished') {
      const win = checkWin(row.board)
      if (win) {
        if (row.moves.length >= movesRef.current.length) {
          setBoard(row.board); setMoves(row.moves); setCurrentPlayer(row.current_player)
        }
        setWinInfo(win)
      } else if (row.winner === 0) {
        setIsDraw(true)
      } else if (row.winner === 1 || row.winner === 2) {
        setForfeitWinner(row.winner as Player)
      }
    }
  }

  // Realtime subscription + 1.5s polling fallback
  useEffect(() => {
    let stopped = false

    const channel = supabase
      .channel(`room-${roomCode}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mp_rooms', filter: `code=eq.${roomCode}` },
        payload => {
          if (!stopped) applySnapshot(normalizeRoom(payload.new as Record<string, unknown>))
        },
      )
      .subscribe()

    const timer = setInterval(async () => {
      if (stopped) return
      try {
        const room = await getRoomByCode(roomCode)
        if (room && !stopped) applySnapshot(room)
      } catch { /* network hiccup — next tick will retry */ }
    }, 1500)

    return () => {
      stopped = true
      channel.unsubscribe()
      clearInterval(timer)
    }
  }, [roomCode])

  // Settle once when game ends: coins, sound, leaderboard, history
  useEffect(() => {
    if (!ended || settledRef.current || !user) return
    settledRef.current = true

    const result = myResult ?? 'draw'
    const coins  = result === 'win' ? WIN_COINS : LOSS_COINS
    addCurrency(coins)
    updateCurrencyOnServer()

    if (result === 'win') playWin()
    else if (result === 'loss') playLoss()

    if (result === 'win') {
      ;(async () => {
        try {
          const { data } = await supabase.from('profiles').select('mp_wins').eq('id', user.id).single()
          if (data) {
            await supabase.from('profiles').update({ mp_wins: (data.mp_wins ?? 0) + 1 }).eq('id', user.id)
            await loadProfile(user.id)
          }
        } catch { /* non-critical */ }
      })()
    }

    saveMpMatch(user.id, null, roomCode, opponentUsername, result, moves)
      .catch(() => {})
  }, [ended]) // eslint-disable-line react-hooks/exhaustive-deps

  // Make a move: update local state immediately, then persist
  const handleColumn = async (col: number) => {
    if (!isMyTurn) return
    const next = dropChip(board, col, myPlayer)
    if (!next) return
    playClick()

    const newMoves              = [...moves, col]
    const nextPlayer: Player    = myPlayer === 1 ? 2 : 1
    const win                   = checkWin(next)
    const full                  = !win && isBoardFull(next)

    // Capture pre-move state for rollback
    const prevBoard = board
    const prevMoves = moves

    // Optimistic local update
    setBoard(next)
    setMoves(newMoves)
    setCurrentPlayer(nextPlayer)
    if (win)  setWinInfo(win)
    if (full) setIsDraw(true)
    setSyncError(false)

    try {
      await applyMove(roomCode, next, newMoves, nextPlayer, !!(win || full), win ? win.winner : full ? 0 : null)
    } catch (e) {
      console.error('[MP] move failed, rolling back:', e)
      setSyncError(true)
      setBoard(prevBoard)
      setMoves(prevMoves)
      setCurrentPlayer(myPlayer)
      if (win)  setWinInfo(null)
      if (full) setIsDraw(false)
    }
  }

  const handleForfeit = async () => {
    if (ended || !window.confirm(t.multiplayer.forfeitConfirm)) return
    const winner: Player = myPlayer === 1 ? 2 : 1
    setForfeitWinner(winner)
    try { await forfeitRoom(roomCode, myPlayer) } catch { /* best-effort */ }
  }

  const openReplay = () => {
    const match: MpMatch = {
      id: roomCode, roomCode, opponentUsername,
      result: myResult ?? 'draw',
      moves, playedAt: new Date().toISOString(),
    }
    setReplayMatch(match)
  }

  return (
    <div className={styles.container}>
      {myResult === 'win' && <Confetti />}

      {/* Header */}
      <div className={styles.header}>
        <button className="btn-ghost" onClick={onExit}>{t.common.back}</button>

        <div className={styles.versus}>
          <div className={`${styles.playerLabel} ${currentPlayer === myPlayer && !ended ? styles.activePlayer : ''}`}>
            <span className={`${styles.dot} ${styles.p1}`} />
            <span className={styles.playerName}>{myUsername}</span>
          </div>
          <span className={styles.vsText}>vs</span>
          <div className={`${styles.playerLabel} ${currentPlayer !== myPlayer && !ended ? styles.activePlayer : ''}`}>
            <span className={`${styles.dot} ${styles.p2}`} />
            <span className={styles.playerName}>{opponentUsername}</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.code}>{roomCode}</span>
          {!ended && (
            <button className={styles.forfeitBtn} onClick={handleForfeit}>{t.multiplayer.forfeit}</button>
          )}
        </div>
      </div>

      {/* Turn indicator */}
      <div className={styles.turnBar}>
        {ended ? null : syncError ? (
          <span className={styles.thinkingLabel} style={{ color: '#dc2626' }}>
            {t.common.error} — {t.multiplayer.yourTurn}
          </span>
        ) : isMyTurn ? (
          <span className={styles.yourTurnLabel}>{t.multiplayer.yourTurn}</span>
        ) : (
          <span className={styles.thinkingLabel}>
            {opponentUsername} {t.multiplayer.opponentThinking}
            <span className={styles.dots}><span /><span /><span /></span>
          </span>
        )}
      </div>

      <Board
        onColumnClick={handleColumn}
        winInfo={winInfo}
        boardOverride={board}
        disableClick={!isMyTurn}
        blinkCol={blinkCol}
      />

      {/* Result overlay */}
      <AnimatePresence>
        {ended && (
          <motion.div
            className={styles.resultOverlay}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <p className={`${styles.resultText} ${myResult === 'win' ? styles.win : myResult === 'loss' ? styles.loss : styles.draw}`}>
              {wasForfeit
                ? (myResult === 'win' ? t.multiplayer.opponentForfeit : t.multiplayer.youForfeit)
                : myResult === 'win'  ? t.multiplayer.youWin
                : myResult === 'loss' ? t.multiplayer.opponentWins
                : t.multiplayer.draw}
            </p>

            {myResult !== 'draw' && (
              <p className={styles.coinsEarned}>
                +{myResult === 'win' ? WIN_COINS : LOSS_COINS} {t.game.earned}
              </p>
            )}

            <div className={styles.actions}>
              <button className="btn-ghost" onClick={openReplay}>{t.multiplayer.viewReplay}</button>
              <button className="btn-primary" onClick={onExit}>{t.multiplayer.mainMenu}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
