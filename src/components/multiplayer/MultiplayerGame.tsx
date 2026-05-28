import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { dropChip, checkWin, isBoardFull, getWinningMove } from '../../lib/gameLogic'
import { applyMove, forfeitRoom, saveMpMatch } from '../../lib/multiplayer'
import { supabase } from '../../lib/supabase'
import { playClick, playWin, playLoss } from '../../lib/sound'
import { useShopStore } from '../../store/shopStore'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { useT } from '../../i18n'
import { Board } from '../game/Board'
import { Confetti } from '../ui/Confetti'
import type { Player, Room, MpMatch } from '../../types'
import styles from './MultiplayerGame.module.css'

interface Props {
  room: Room
  myId: string
  myUsername: string
  /** Raw setter (no merge guard) — used for optimistic update + rollback */
  setRoom: (room: Room) => void
  onExit: () => void
}

const WIN_COINS  = 80
const LOSS_COINS = 15

export function MultiplayerGame({ room, myId, myUsername, setRoom, onExit }: Props) {
  const t = useT()
  const { addCurrency } = useShopStore()
  const { user, updateCurrencyOnServer, loadProfile } = useAuthStore()
  const { setReplayMatch } = useGameStore()

  const [syncError, setSyncError] = useState(false)
  const settledRef = useRef(false)

  // --- Everything is derived from the single source of truth: `room` ---
  const myPlayer: Player        = room.host_id === myId ? 1 : 2
  const opponentUsername        = myPlayer === 1 ? (room.guest_username ?? '?') : room.host_username
  const winInfo                 = checkWin(room.board)
  const boardFull               = isBoardFull(room.board)
  const finished                = room.status === 'finished'
  const ended                   = !!winInfo || boardFull || finished
  const isMyTurn                = room.current_player === myPlayer && !ended

  const winnerPlayer: Player | null =
    winInfo ? winInfo.winner
    : (finished && (room.winner === 1 || room.winner === 2)) ? (room.winner as Player)
    : null
  const isDraw   = (boardFull && !winInfo) || (finished && room.winner === 0)
  const myResult: 'win' | 'loss' | 'draw' | null =
    !ended ? null : isDraw ? 'draw' : winnerPlayer === myPlayer ? 'win' : 'loss'
  // A finish with no 4-in-a-row and no full board = the opponent (or you) forfeited
  const wasForfeit = finished && !winInfo && !boardFull && !isDraw

  // Win-blink: the column where I could win on this turn
  const blinkCol = isMyTurn ? getWinningMove(room.board, myPlayer) : null

  // --- Make a move: optimistic update, then authoritative write with retry ---
  const handleColumn = async (col: number) => {
    if (!isMyTurn) return
    const next = dropChip(room.board, col, myPlayer)
    if (!next) return
    playClick()

    const newMoves   = [...room.moves, col]
    const nextPlayer: Player = myPlayer === 1 ? 2 : 1
    const win  = checkWin(next)
    const full = !win && isBoardFull(next)
    const prev = room

    // Optimistic
    setRoom({
      ...room,
      board: next,
      moves: newMoves,
      current_player: nextPlayer,
      status: (win || full) ? 'finished' : room.status,
      winner: win ? win.winner : full ? 0 : room.winner,
    })
    setSyncError(false)

    const write = () => applyMove(
      room.code, next, newMoves, nextPlayer,
      !!(win || full),
      win ? win.winner : full ? 0 : null,
    )

    try {
      let saved: Room
      try { saved = await write() }
      catch (e1) { console.warn('[MP] move write retry', e1); saved = await write() }
      setRoom(saved)
    } catch (e) {
      console.error('[MP] move write failed, rolling back:', e)
      setRoom(prev)           // un-apply the optimistic move so the player can retry
      setSyncError(true)
    }
  }

  const handleForfeit = async () => {
    if (ended || !window.confirm(t.multiplayer.forfeitConfirm)) return
    const winner: Player = myPlayer === 1 ? 2 : 1
    setRoom({ ...room, status: 'finished', winner })
    try { await forfeitRoom(room.code, myPlayer) } catch (e) { console.error('[MP] forfeit failed:', e) }
  }

  // --- Settle once when the game ends: coins, sound, leaderboard, history ---
  useEffect(() => {
    if (!ended || settledRef.current || !user) return
    settledRef.current = true

    const result = myResult ?? 'draw'
    const coins = result === 'win' ? WIN_COINS : LOSS_COINS
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
        } catch (e) { console.error('[MP] mp_wins update failed:', e) }
      })()
    }

    saveMpMatch(user.id, null, room.code, opponentUsername, result, room.moves)
      .catch(e => console.error('[MP] saveMpMatch failed:', e))
  }, [ended]) // eslint-disable-line react-hooks/exhaustive-deps

  const openReplay = () => {
    const match: MpMatch = {
      id: room.code, roomCode: room.code, opponentUsername,
      result: myResult ?? 'draw',
      moves: room.moves, playedAt: new Date().toISOString(),
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
          <div className={`${styles.playerLabel} ${room.current_player === myPlayer && !ended ? styles.activePlayer : ''}`}>
            <span className={`${styles.dot} ${styles.p1}`} />
            <span className={styles.playerName}>{myUsername}</span>
          </div>
          <span className={styles.vsText}>vs</span>
          <div className={`${styles.playerLabel} ${room.current_player !== myPlayer && !ended ? styles.activePlayer : ''}`}>
            <span className={`${styles.dot} ${styles.p2}`} />
            <span className={styles.playerName}>{opponentUsername}</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.code}>{room.code}</span>
          {!ended && (
            <button className={styles.forfeitBtn} onClick={handleForfeit}>{t.multiplayer.forfeit}</button>
          )}
        </div>
      </div>

      {/* Turn / status */}
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
        boardOverride={room.board}
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
                : myResult === 'win' ? t.multiplayer.youWin
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
