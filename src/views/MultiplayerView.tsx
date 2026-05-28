import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { useT } from '../i18n'
import { createRoom, joinRoom, getActiveRoom, getMpHistory, cancelRoom } from '../lib/multiplayer'
import { useRoomChannel } from '../hooks/useRoomChannel'
import { MultiplayerGame } from '../components/multiplayer/MultiplayerGame'
import { Leaderboard } from '../components/multiplayer/Leaderboard'
import type { Room, MpMatch } from '../types'
import styles from './MultiplayerView.module.css'

// Status can only ever move forward; this stops a stale snapshot from
// reverting playing→waiting or finished→playing.
const STATUS_RANK: Record<Room['status'], number> = {
  waiting: 0, playing: 1, finished: 2, cancelled: 2,
}

export function MultiplayerView({ onAuthRequired }: { onAuthRequired: () => void }) {
  const t = useT()
  const { user, profile } = useAuthStore()
  const { setReplayMatch } = useGameStore()

  const [room, setRoom]       = useState<Room | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<MpMatch[]>([])
  const [checking, setChecking] = useState(true)

  // Merge a server snapshot into our room without ever going backwards.
  const mergeRoom = useCallback((incoming: Room) => {
    setRoom(prev => {
      if (!prev || prev.code !== incoming.code) return incoming
      if (incoming.status === 'finished' || incoming.status === 'cancelled') return incoming
      if (STATUS_RANK[incoming.status] < STATUS_RANK[prev.status]) return prev
      if (incoming.moves.length < prev.moves.length) return prev
      return incoming
    })
  }, [])

  // On mount: load history and resume any in-progress room
  useEffect(() => {
    if (!user) { setChecking(false); return }
    let alive = true
    Promise.all([
      getMpHistory(user.id).catch(() => []),
      getActiveRoom(user.id).catch(() => null),
    ]).then(([h, active]) => {
      if (!alive) return
      setHistory(h as MpMatch[])
      if (active) setRoom(active as Room)
      setChecking(false)
    })
    return () => { alive = false }
  }, [user])

  // Keep the current room synced (waiting OR playing) — one channel for everything
  useRoomChannel(room?.code ?? null, mergeRoom)

  // A cancelled room drops us back to the lobby
  useEffect(() => {
    if (room?.status === 'cancelled') setRoom(null)
  }, [room?.status])

  const refreshHistory = useCallback(() => {
    if (user) getMpHistory(user.id).then(d => setHistory(d as MpMatch[])).catch(() => {})
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
  const inWaiting  = room && room.status === 'waiting'
  const inGame     = room && (room.status === 'playing' || room.status === 'finished')

  // ── In an active/finished game: hand off to the game component ──
  if (inGame && room) {
    return (
      <MultiplayerGame
        room={room}
        myId={user.id}
        myUsername={myUsername}
        setRoom={setRoom}
        onExit={() => { setRoom(null); refreshHistory() }}
      />
    )
  }

  // ── Lobby actions ──
  const handleCreate = async () => {
    setLoading(true); setError('')
    try {
      const r = await createRoom(user.id, myUsername)
      setRoom(r)
    } catch (e: any) { console.error('[MP] create failed:', e); setError(e.message) }
    finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setLoading(true); setError('')
    try {
      const r = await joinRoom(joinCode.trim(), user.id, myUsername)
      setJoinCode('')
      setRoom(r)
    } catch (e: any) { console.error('[MP] join failed:', e); setError(e.message) }
    finally { setLoading(false) }
  }

  const handleCancel = () => {
    const code = room?.code
    setRoom(null)
    if (code) cancelRoom(code).catch(e => console.error('[MP] cancel failed:', e))
  }

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.multiplayer.title}</h2>

          {checking ? (
            <p className={styles.empty}>{t.common.loading}</p>
          ) : inWaiting && room ? (
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
