import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { dropChip, checkWin, isBoardFull } from '../../lib/gameLogic'
import { pushMove as dbPushMove, subscribeToRoom, saveMpMatch, forfeitRoom } from '../../lib/multiplayer'
import { supabase } from '../../lib/supabase'
import { playClick } from '../../lib/sound'
import { useShopStore } from '../../store/shopStore'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { useT } from '../../i18n'
import { Board } from '../game/Board'
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

// MP rewards are higher than SP to incentivise online play
const WIN_COINS  = 80
const LOSS_COINS = 15

export function MultiplayerGame({
  roomCode, initialBoard, initialMoves, myPlayer, opponentUsername, onExit,
}: Props) {
  const t = useT()
  const { addCurrency } = useShopStore()
  const { user, updateCurrencyOnServer } = useAuthStore()
  const { setReplayMatch } = useGameStore()

  const [board, setBoard]               = useState<BoardType>(initialBoard)
  const [moves, setMoves]               = useState<number[]>(initialMoves)
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1)
  const [winInfo, setWinInfo]           = useState<WinInfo | null>(null)
  const [isDraw, setIsDraw]             = useState(false)
  const [forfeitWinner, setForfeitWinner] = useState<Player | null>(null)
  const [saved, setSaved]               = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const ended   = !!(winInfo || isDraw || forfeitWinner)
  const isMyTurn = currentPlayer === myPlayer

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

  // --- Save result & award coins ---
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

    if (result === 'win') {
      supabase.from('profiles').select('mp_wins').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) supabase.from('profiles')
            .update({ mp_wins: (data.mp_wins ?? 0) + 1 }).eq('id', user.id)
        })
    }
    saveMpMatch(user.id, '', roomCode, opponentUsername, result, moves).catch(() => {})
  }, [ended, saved]) // eslint-disable-line

  // --- Player move ---
  const handleColumnClick = async (col: number) => {
    if (!isMyTurn || ended) return
    const next = dropChip(board, col, currentPlayer)
    if (!next) return
    playClick()
    const newMoves  = [...moves, col]
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
    setForfeitWinner(winner)   // я проиграл
    try { await forfeitRoom(roomCode, myPlayer) } catch (err) { console.error(err) }
  }

  // --- Status text ---
  const statusText = () => {
    if (forfeitWinner) return forfeitWinner === myPlayer ? t.multiplayer.opponentForfeit : t.multiplayer.youForfeit
    if (winInfo) return winInfo.winner === myPlayer ? t.multiplayer.youWin : t.multiplayer.opponentWins
    if (isDraw)  return t.multiplayer.draw
    return isMyTurn ? t.multiplayer.yourTurn : t.multiplayer.opponentTurn
  }

  const openReplay = () => {
    const match: MpMatch = {
      id: roomCode, roomCode, opponentUsername,
      result: isDraw ? 'draw' : (winInfo?.winner === myPlayer || forfeitWinner === myPlayer) ? 'win' : 'loss',
      moves, playedAt: new Date().toISOString(),
    }
    setReplayMatch(match)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className="btn-ghost" onClick={onExit}>{t.common.back}</button>
        <div className={styles.status}>
          <span className={`${styles.dot} ${isMyTurn && !ended ? styles.p1 : styles.p2}`} />
          {statusText()}
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

      <Board
        onColumnClick={handleColumnClick}
        winInfo={winInfo}
        boardOverride={board}
        disableClick={!isMyTurn || ended}
      />

      {ended && (
        <div className={styles.actions}>
          <button className="btn-ghost" onClick={openReplay}>{t.multiplayer.viewReplay}</button>
          <button className="btn-primary" onClick={onExit}>{t.multiplayer.mainMenu}</button>
        </div>
      )}
    </div>
  )
}
