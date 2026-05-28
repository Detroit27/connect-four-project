import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { dropChip, checkWin, isBoardFull } from '../../lib/gameLogic'
import { pushMove as dbPushMove, subscribeToRoom, saveMpMatch, forfeitRoom } from '../../lib/multiplayer'
import { supabase } from '../../lib/supabase'
import { playClick, playWin, playLoss } from '../../lib/sound'
import { useShopStore } from '../../store/shopStore'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { useT } from '../../i18n'
import { Board } from '../game/Board'
import { Confetti } from '../ui/Confetti'
import type { Board as BoardType, Player, WinInfo, MpMatch } from '../../types'
import styles from './MultiplayerGame.module.css'

interface Props {
  roomCode: string
  initialBoard: BoardType
  initialMoves: number[]
  myPlayer: Player
  opponentUsername: string
  onExit: () => void
}

const WIN_COINS  = 80
const LOSS_COINS = 15

export function MultiplayerGame({
  roomCode, initialBoard, initialMoves, myPlayer, opponentUsername, onExit,
}: Props) {
  const t = useT()
  const { addCurrency } = useShopStore()
  const { user, profile, updateCurrencyOnServer, loadProfile } = useAuthStore()
  const { setReplayMatch } = useGameStore()

  const [board, setBoard]                   = useState<BoardType>(initialBoard)
  const [moves, setMoves]                   = useState<number[]>(initialMoves)
  const [currentPlayer, setCurrentPlayer]   = useState<Player>(1)
  const [winInfo, setWinInfo]               = useState<WinInfo | null>(null)
  const [isDraw, setIsDraw]                 = useState(false)
  const [forfeitWinner, setForfeitWinner]   = useState<Player | null>(null)
  const [saved, setSaved]                   = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const ended    = !!(winInfo || isDraw || forfeitWinner)
  const isMyTurn = currentPlayer === myPlayer
  const myUsername = profile?.username ?? user?.email ?? 'You'

  // --- Realtime subscription ---
  useEffect(() => {
    channelRef.current = subscribeToRoom(roomCode, (room) => {
      const b  = room.board as BoardType
      const m  = room.moves as number[]
      const cp = room.current_player as Player
      setBoard(b); setMoves(m); setCurrentPlayer(cp)

      if (room.status === 'finished') {
        const win = checkWin(b)
        if (win) { setWinInfo(win); return }
        if (room.winner === 0) { setIsDraw(true); return }
        if (room.winner) setForfeitWinner(room.winner as Player)
      } else {
        const win = checkWin(b)
        if (win) setWinInfo(win)
        else if (isBoardFull(b)) setIsDraw(true)
      }
    })
    return () => { channelRef.current?.unsubscribe() }
  }, [roomCode])

  // --- Save result, award coins, update leaderboard ---
  useEffect(() => {
    if (!ended || saved || !user) return
    setSaved(true)

    let result: 'win' | 'loss' | 'draw'
    if (isDraw) result = 'draw'
    else if (winInfo)       result = winInfo.winner === myPlayer ? 'win' : 'loss'
    else if (forfeitWinner) result = forfeitWinner === myPlayer ? 'win' : 'loss'
    else return

    const coins = result === 'win' ? WIN_COINS : LOSS_COINS
    addCurrency(coins)
    updateCurrencyOnServer(coins)

    // Play sound
    if (result === 'win') playWin()
    else if (result === 'loss') playLoss()

    // Update mp_wins counter and refresh profile
    if (result === 'win') {
      ;(async () => {
        try {
          const { data } = await supabase
            .from('profiles').select('mp_wins').eq('id', user.id).single()
          if (data) {
            await supabase.from('profiles')
              .update({ mp_wins: (data.mp_wins ?? 0) + 1 }).eq('id', user.id)
            await loadProfile(user.id)
          }
        } catch (e) { console.error('[MP] mp_wins update failed:', e) }
      })()
    }

    saveMpMatch(user.id, null, roomCode, opponentUsername, result, moves)
      .catch(e => console.error('[MP] saveMpMatch failed:', e))
  }, [ended, saved]) // eslint-disable-line

  // --- Player move ---
  const handleColumnClick = async (col: number) => {
    if (!isMyTurn || ended) return
    const next = dropChip(board, col, currentPlayer)
    if (!next) return
    playClick()
    const newMoves    = [...moves, col]
    const nextPlayer: Player = currentPlayer === 1 ? 2 : 1
    const win  = checkWin(next)
    const draw = !win && isBoardFull(next)
    setBoard(next); setMoves(newMoves); setCurrentPlayer(nextPlayer)
    if (win)  setWinInfo(win)
    if (draw) setIsDraw(true)
    try {
      await dbPushMove(
        roomCode, next, newMoves, nextPlayer,
        win || draw ? 'finished' : undefined,
        win ? win.winner : draw ? 0 : undefined,
      )
    } catch (err) { console.error(err) }
  }

  // --- Forfeit ---
  const handleForfeit = async () => {
    if (!window.confirm(t.multiplayer.forfeitConfirm)) return
    const winner: Player = myPlayer === 1 ? 2 : 1
    setForfeitWinner(winner)
    try { await forfeitRoom(roomCode, myPlayer) } catch (err) { console.error(err) }
  }

  // --- Derived result ---
  const myResult: 'win' | 'loss' | 'draw' | null = !ended ? null
    : isDraw                          ? 'draw'
    : (winInfo?.winner === myPlayer || forfeitWinner === myPlayer) ? 'win'
    : 'loss'

  const openReplay = () => {
    const match: MpMatch = {
      id: roomCode, roomCode, opponentUsername,
      result: myResult ?? 'draw',
      moves, playedAt: new Date().toISOString(),
    }
    setReplayMatch(match)
  }

  // --- Thinking indicator: dots when it's opponent's turn ---
  const showThinking = !ended && !isMyTurn

  return (
    <div className={styles.container}>
      {/* Confetti on win */}
      {myResult === 'win' && <Confetti />}

      {/* ── Header ── */}
      <div className={styles.header}>
        <button className="btn-ghost" onClick={onExit}>{t.common.back}</button>

        {/* Player vs Player */}
        <div className={styles.versus}>
          <div className={`${styles.playerLabel} ${myPlayer === 1 ? styles.activePlayer : ''}`}>
            <span className={`${styles.dot} ${styles.p1}`} />
            <span className={styles.playerName}>{myUsername}</span>
          </div>
          <span className={styles.vsText}>vs</span>
          <div className={`${styles.playerLabel} ${myPlayer === 2 ? styles.activePlayer : ''}`}>
            <span className={`${styles.dot} ${styles.p2}`} />
            <span className={styles.playerName}>{opponentUsername}</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.code}>{roomCode}</span>
          {!ended && (
            <button className={styles.forfeitBtn} onClick={handleForfeit}>
              {t.multiplayer.forfeit}
            </button>
          )}
        </div>
      </div>

      {/* ── Turn / thinking indicator ── */}
      <div className={styles.turnBar}>
        {ended ? null : isMyTurn ? (
          <span className={styles.yourTurnLabel}>{t.multiplayer.yourTurn}</span>
        ) : (
          <span className={styles.thinkingLabel}>
            {opponentUsername} {t.multiplayer.opponentThinking}
            <span className={styles.dots}><span /><span /><span /></span>
          </span>
        )}
      </div>

      <Board
        onColumnClick={handleColumnClick}
        winInfo={winInfo}
        boardOverride={board}
        disableClick={!isMyTurn || ended}
      />

      {/* ── Game-over overlay ── */}
      <AnimatePresence>
        {ended && (
          <motion.div
            className={styles.resultOverlay}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <p className={`${styles.resultText} ${myResult === 'win' ? styles.win : myResult === 'loss' ? styles.loss : styles.draw}`}>
              {forfeitWinner
                ? (forfeitWinner === myPlayer ? t.multiplayer.opponentForfeit : t.multiplayer.youForfeit)
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
              <button className="btn-ghost" onClick={openReplay}>
                {t.multiplayer.viewReplay}
              </button>
              <button className="btn-primary" onClick={onExit}>
                {t.multiplayer.mainMenu}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
