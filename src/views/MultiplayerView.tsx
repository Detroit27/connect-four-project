import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { useT } from '../i18n'
import { createRoom, joinRoom, getMpHistory, getActiveRoom, cancelRoom } from '../lib/multiplayer'
import { supabase } from '../lib/supabase'
import { MultiplayerGame } from '../components/multiplayer/MultiplayerGame'
import { Leaderboard } from '../components/multiplayer/Leaderboard'
import type { Room, MpMatch, Player } from '../types'
import styles from './MultiplayerView.module.css'

type MPScreen = 'lobby' | 'waiting' | 'game'

export function MultiplayerView({ onAuthRequired }: { onAuthRequired: () => void }) {
  const t = useT()
  const { user, profile } = useAuthStore()
  const { setReplayMatch } = useGameStore()

  const [mpScreen, setMpScreen] = useState<MPScreen>('lobby')
  const [room, setRoom]         = useState<Room | null>(null)
  const [myPlayer, setMyPlayer] = useState<Player>(1)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [history, setHistory]   = useState<MpMatch[]>([])
  const [checking, setChecking] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  // Poll waiting room until guest joins
  const startWaitingPoll = (code: string) => {
    stopPoll()
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('mp_rooms').select().eq('code', code).maybeSingle() as any
        if (data?.guest_id) {
          setRoom(data as Room)
          setMpScreen('game')
          stopPoll()
        }
      } catch { /* ignore */ }
    }, 1500)
  }

  const refreshHistory = () => {
    if (user) getMpHistory(user.id).then(d => setHistory(d as MpMatch[])).catch(() => {})
  }

  // On mount: load history and resume any in-progress room
  useEffect(() => {
    if (!user) { setChecking(false); return }
    Promise.all([
      getMpHistory(user.id).catch(() => []),
      getActiveRoom(user.id).catch(() => null),
    ]).then(([h, active]) => {
      setHistory(h as MpMatch[])
      if (active) {
        const r = active as Room
        setRoom(r)
        const player: Player = r.host_id === user.id ? 1 : 2
        setMyPlayer(player)
        if (r.status === 'waiting') {
          setMpScreen('waiting')
          startWaitingPoll(r.code)
        } else {
          setMpScreen('game')
        }
      }
      setChecking(false)
    })
    return stopPoll
  }, [user])

  // ── Auth gate ──
  if (!user) {
    return (
      <div className={styles.authWall}>
        <p className={styles.authMsg}>{t.multiplayer.signInRequired}</p>
        <button className="btn-primary" onClick={onAuthRequired}>{t.common.signIn}</button>
      </div>
    )
  }

  const myUsername = profile?.username ?? user.email ?? 'You'

  // ── In game ──
  if (mpScreen === 'game' && room) {
    return (
      <MultiplayerGame
        roomCode={room.code}
        initialBoard={room.board}
        initialMoves={room.moves ?? []}
        myPlayer={myPlayer}
        myUsername={myUsername}
        opponentUsername={myPlayer === 1 ? (room.guest_username ?? '?') : room.host_username}
        onExit={() => {
          stopPoll()
          setRoom(null)
          setMpScreen('lobby')
          refreshHistory()
        }}
      />
    )
  }

  // ── Lobby actions ──
  const handleCreate = async () => {
    setLoading(true); setError('')
    try {
      const r = await createRoom(user.id, myUsername)
      setRoom(r)
      setMyPlayer(1)
      setMpScreen('waiting')
      startWaitingPoll(r.code)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setLoading(true); setError('')
    try {
      const r = await joinRoom(joinCode.trim(), user.id, myUsername)
      setRoom(r)
      setMyPlayer(2)
      setJoinCode('')
      setMpScreen('game')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleCancel = () => {
    const code = room?.code
    stopPoll()
    setRoom(null)
    setMpScreen('lobby')
    if (code) cancelRoom(code).catch(() => {})
  }

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.multiplayer.title}</h2>

          {checking ? (
            <p className={styles.empty}>{t.common.loading}</p>
          ) : mpScreen === 'waiting' && room ? (
            // ── Waiting for opponent ──
            <div className={styles.waiting}>
              <p className={styles.shareLabel}>{t.multiplayer.shareCode}</p>
              <div className={styles.codeBox}>{room.code}</div>
              <p className={styles.waitingLabel}>
                {t.multiplayer.waitingForOpponent}
                <span className={styles.waitDots}><span /><span /><span /></span>
              </p>
              <button className="btn-ghost" style={{ marginTop: 8 }} onClick={handleCancel}>
                {t.multiplayer.cancelWait}
              </button>
            </div>
          ) : (
            // ── Lobby: create or join ──
            <div className={styles.lobbyActions}>
              <button className={`btn-primary ${styles.bigBtn}`} onClick={handleCreate} disabled={loading}>
                {t.multiplayer.createRoom}
              </button>
              <div className={styles.joinRow}>
                <input
                  className={styles.input}
                  placeholder={t.multiplayer.enterCode}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter' && joinCode.trim() && !loading) handleJoin() }}
                  maxLength={6}
                />
                <button className={`btn-primary ${styles.bigBtn}`} onClick={handleJoin} disabled={loading || !joinCode.trim()}>
                  {t.multiplayer.join}
                </button>
              </div>
              {error && <p className={styles.error}>{error}</p>}
            </div>
          )}
        </div>

        {/* Match history */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.multiplayer.matchHistory}</h2>
          {history.length === 0 ? (
            <p className={styles.empty}>{t.multiplayer.noHistory}</p>
          ) : (
            <div className={styles.history}>
              {history.map((m: MpMatch) => (
                <div key={m.id} className={styles.matchRow}>
                  <span className={`${styles.result} ${styles[m.result]}`}>
                    {m.result === 'win' ? t.singleplayer.won : m.result === 'loss' ? t.singleplayer.lost : t.singleplayer.draw}
                  </span>
                  <span className={styles.meta}>vs {m.opponentUsername}</span>
                  <button className={styles.replayBtn} onClick={() => setReplayMatch(m)}>
                    {t.multiplayer.viewReplay}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className={styles.sidebar}>
        <Leaderboard />
      </aside>
    </div>
  )
}
