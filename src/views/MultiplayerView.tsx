import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { useT } from '../i18n'
import { createRoom, joinRoom, getMpHistory, getActiveRoom, forfeitRoom } from '../lib/multiplayer'
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

  const [mpScreen, setMpScreen]     = useState<MPScreen>('lobby')
  const [joinCode, setJoinCode]     = useState('')
  const [room, setRoom]             = useState<Room | null>(null)
  const [myPlayer, setMyPlayer]     = useState<Player>(1)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [history, setHistory]       = useState<MpMatch[]>([])
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [checkingActive, setCheckingActive] = useState(true)

  // Load history + check for active room
  useEffect(() => {
    if (!user) { setCheckingActive(false); return }
    Promise.all([
      getMpHistory(user.id).catch(() => []),
      getActiveRoom(user.id).catch(() => null),
    ]).then(([hist, active]) => {
      setHistory(hist as MpMatch[])
      setActiveRoom(active as Room | null)
      setCheckingActive(false)
    })
  }, [user])

  // --- Auth wall ---
  if (!user) {
    return (
      <div className={styles.authWall}>
        <p className={styles.authMsg}>{t.multiplayer.signInRequired}</p>
        <button className="btn-primary" onClick={onAuthRequired}>{t.common.signIn}</button>
      </div>
    )
  }

  // --- In game ---
  if (mpScreen === 'game' && room) {
    return (
      <MultiplayerGame
        roomCode={room.code}
        initialBoard={room.board}
        initialMoves={room.moves ?? []}
        myPlayer={myPlayer}
        opponentUsername={myPlayer === 1 ? (room.guest_username ?? '?') : room.host_username}
        onExit={() => {
          setRoom(null)
          setActiveRoom(null)
          setMpScreen('lobby')
          // Refresh history after game
          if (user) getMpHistory(user.id).then(d => setHistory(d as MpMatch[])).catch(() => {})
        }}
      />
    )
  }

  // --- Create room ---
  const handleCreate = async () => {
    setLoading(true); setError('')
    try {
      const r = await createRoom(user.id, profile?.username ?? user.email ?? 'Host')
      setRoom(r as unknown as Room)
      setActiveRoom(r as unknown as Room)
      setMyPlayer(1)
      setMpScreen('waiting')
      const interval = setInterval(async () => {
        try {
          const { data } = await supabase
            .from('mp_rooms').select().eq('code', r.code).maybeSingle() as any
          if (data?.guest_id) {
            setRoom(data as Room)
            setActiveRoom(null)
            setMpScreen('game')
            clearInterval(interval)
          }
        } catch { /* ignore */ }
      }, 2000)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  // --- Join room ---
  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setLoading(true); setError('')
    try {
      const r = await joinRoom(joinCode.trim(), user.id, profile?.username ?? user.email ?? 'Guest')
      setRoom(r as unknown as Room)
      setActiveRoom(null)
      setMyPlayer(2)
      setMpScreen('game')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  // --- Resume active room ---
  const handleResume = () => {
    if (!activeRoom) return
    const player: Player = activeRoom.host_id === user.id ? 1 : 2
    setMyPlayer(player)
    setRoom(activeRoom)
    if (activeRoom.status === 'waiting') {
      setMpScreen('waiting')
      // Re-start polling so the waiting screen auto-transitions when opponent joins
      const interval = setInterval(async () => {
        try {
          const { data } = await supabase
            .from('mp_rooms').select().eq('code', activeRoom.code).maybeSingle() as any
          if (data?.guest_id) {
            setRoom(data as Room)
            setActiveRoom(null)
            setMpScreen('game')
            clearInterval(interval)
          }
        } catch { /* ignore */ }
      }, 2000)
    } else {
      setActiveRoom(null)
      setMpScreen('game')
    }
  }

  // --- Forfeit active room from lobby ---
  const handleForfeitActive = async () => {
    if (!activeRoom || !window.confirm(t.multiplayer.forfeitConfirm)) return
    const player: Player = activeRoom.host_id === user.id ? 1 : 2
    try {
      await forfeitRoom(activeRoom.code, player)
      setActiveRoom(null)
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className={styles.container}>
      <div className={styles.main}>

        {/* Active match banner */}
        {!checkingActive && activeRoom && (
          <div className={styles.activeBanner}>
            <div className={styles.activeBannerInfo}>
              <span className={styles.activeBannerTitle}>{t.multiplayer.activeMatch}</span>
              <span className={styles.activeBannerCode}>{t.multiplayer.activeCode}: <b>{activeRoom.code}</b></span>
            </div>
            <div className={styles.activeBannerActions}>
              <button className="btn-primary" onClick={handleResume}>{t.multiplayer.resume}</button>
              <button className="btn-ghost" onClick={handleForfeitActive}>{t.multiplayer.forfeit}</button>
            </div>
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.multiplayer.title}</h2>

          {mpScreen === 'waiting' && room ? (
            <div className={styles.waiting}>
              <p className={styles.shareLabel}>{t.multiplayer.shareCode}</p>
              <div className={styles.codeBox}>{room.code}</div>
              <p className={styles.waitingLabel}>{t.multiplayer.waitingForOpponent}</p>
              <button className="btn-ghost" style={{ marginTop: 8 }} onClick={async () => {
                await forfeitRoom(room.code, 1).catch(() => {})
                setRoom(null); setActiveRoom(null); setMpScreen('lobby')
              }}>{t.multiplayer.forfeit}</button>
            </div>
          ) : checkingActive ? (
            <p className={styles.empty}>{t.common.loading}</p>
          ) : !activeRoom ? (
            <div className={styles.lobbyActions}>
              <button className="btn-primary" onClick={handleCreate} disabled={loading}>
                {t.multiplayer.createRoom}
              </button>
              <div className={styles.joinRow}>
                <input
                  className={styles.input}
                  placeholder={t.multiplayer.enterCode}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                <button className="btn-ghost" onClick={handleJoin} disabled={loading || !joinCode.trim()}>
                  {t.multiplayer.join}
                </button>
              </div>
              {error && <p className={styles.error}>{error}</p>}
            </div>
          ) : null}
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
