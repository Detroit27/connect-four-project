import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { useT } from '../i18n'
import { createRoom, joinRoom, getMpHistory, getActiveRoom, forfeitRoom, cancelRoom, subscribeToRoom } from '../lib/multiplayer'
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

  // Load history + check for active room on mount
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

  const waitingCode = mpScreen === 'waiting'
    ? (room?.code ?? activeRoom?.code ?? null)
    : null

  // Detect the opponent joining while the host is on the waiting screen.
  // Realtime is instant when Supabase delivers it; polling is the reliable fallback.
  useEffect(() => {
    if (!waitingCode || !user) return
    let stopped = false

    const enterGame = (data: any) => {
      if (stopped || !data?.guest_id || data.status !== 'playing') return
      console.log('[MP] opponent joined, starting match', waitingCode)
      setMyPlayer(data.host_id === user.id ? 1 : 2)
      setRoom(data as Room)
      setActiveRoom(null)
      setError('')
      setMpScreen('game')
    }

    const sync = async () => {
      try {
        const { data, error } = await supabase
          .from('mp_rooms').select().eq('code', waitingCode).maybeSingle()
        if (error) { console.error('[MP] waiting poll error:', error); return }
        enterGame(data)
      } catch (e) { console.error('[MP] waiting poll threw:', e) }
    }

    const channel = subscribeToRoom(waitingCode, (r) => enterGame(r))
    sync()
    const poll = setInterval(sync, 750)

    // Background tabs throttle setInterval, so re-check the moment we're focused again
    const onWake = () => { if (!document.hidden) sync() }
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)

    return () => {
      stopped = true
      channel.unsubscribe()
      clearInterval(poll)
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [waitingCode, user?.id])

  if (!user) {
    return (
      <div className={styles.authWall}>
        <p className={styles.authMsg}>{t.multiplayer.signInRequired}</p>
        <button className="btn-primary" onClick={onAuthRequired}>{t.common.signIn}</button>
      </div>
    )
  }

  if (mpScreen === 'game' && room) {
    return (
      <MultiplayerGame
        roomCode={room.code}
        initialBoard={room.board}
        initialMoves={room.moves ?? []}
        initialCurrentPlayer={room.current_player}
        myPlayer={myPlayer}
        opponentUsername={myPlayer === 1 ? (room.guest_username ?? '?') : room.host_username}
        onExit={() => {
          setRoom(null)
          setActiveRoom(null)
          setMpScreen('lobby')
          if (user) getMpHistory(user.id).then(d => setHistory(d as MpMatch[])).catch(() => {})
        }}
      />
    )
  }

  const handleCreate = async () => {
    setLoading(true); setError('')
    try {
      const r = await createRoom(user.id, profile?.username ?? user.email ?? 'Host')
      setRoom(r as unknown as Room)
      setActiveRoom(r as unknown as Room)
      setMyPlayer(1)
      setMpScreen('waiting')   // useEffect above takes over polling
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setLoading(true); setError('')
    try {
      const r = await joinRoom(joinCode.trim(), user.id, profile?.username ?? user.email ?? 'Guest')
      setRoom(r as unknown as Room)
      setActiveRoom(null)
      setMyPlayer(2)
      setMpScreen('game')
    } catch (e: any) { console.error('[MP] join failed:', e); setError(e.message) }
    finally { setLoading(false) }
  }

  const handleResume = () => {
    if (!activeRoom) return
    const player: Player = activeRoom.host_id === user.id ? 1 : 2
    setMyPlayer(player)
    setRoom(activeRoom)
    if (activeRoom.status === 'waiting') {
      setMpScreen('waiting')   // useEffect polling kicks in automatically
    } else {
      setActiveRoom(null)
      setMpScreen('game')
    }
  }

  const handleCancelWaiting = () => {
    // Works both on the live waiting screen (room set) AND from the lobby banner
    // after a reload (only activeRoom is set, room is null).
    const code = room?.code ?? activeRoom?.code
    if (!code) return
    // Update the UI immediately so Cancel always responds, then cancel the waiting room.
    setRoom(null); setActiveRoom(null); setMpScreen('lobby')
    cancelRoom(code).catch(e => console.error('[MP] cancel room failed:', e))
  }

  const handleForfeitActive = async () => {
    if (!activeRoom || !window.confirm(t.multiplayer.forfeitConfirm)) return
    const player: Player = activeRoom.host_id === user.id ? 1 : 2
    try {
      await forfeitRoom(activeRoom.code, player)
      setActiveRoom(null)
    } catch (e: any) { setError(e.message) }
  }

  const isActiveWaiting = activeRoom?.status === 'waiting'
  const activeOpponent = activeRoom
    ? (activeRoom.host_id === user.id
        ? (activeRoom.guest_username ?? null)
        : activeRoom.host_username)
    : null

  return (
    <div className={styles.container}>
      <div className={styles.main}>

        {/* Active / Waiting banner */}
        {!checkingActive && activeRoom && mpScreen === 'lobby' && (
          <div className={`${styles.activeBanner} ${isActiveWaiting ? styles.bannerWaiting : styles.bannerPlaying}`}>
            <div className={styles.activeBannerInfo}>
              <span className={styles.activeBannerTitle}>
                {isActiveWaiting
                  ? t.multiplayer.waitingMatch
                  : activeOpponent
                    ? `${t.multiplayer.activeMatch} vs ${activeOpponent}`
                    : t.multiplayer.activeMatch}
              </span>
              <span className={styles.activeBannerCode}>
                {t.multiplayer.activeCode}: <b>{activeRoom.code}</b>
              </span>
            </div>
            <div className={styles.activeBannerActions}>
              {!isActiveWaiting && (
                <button className="btn-primary" onClick={handleResume}>{t.multiplayer.resume}</button>
              )}
              <button className="btn-ghost" onClick={isActiveWaiting ? handleCancelWaiting : handleForfeitActive}>
                {isActiveWaiting ? t.multiplayer.cancelWait : t.multiplayer.forfeit}
              </button>
            </div>
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.multiplayer.title}</h2>

          {mpScreen === 'waiting' && room ? (
            <div className={styles.waiting}>
              <p className={styles.shareLabel}>{t.multiplayer.shareCode}</p>
              <div className={styles.codeBox}>{room.code}</div>
              <p className={styles.waitingLabel}>
                {t.multiplayer.waitingForOpponent}
                <span className={styles.waitDots}><span /><span /><span /></span>
              </p>
              <button className="btn-ghost" style={{ marginTop: 8 }} onClick={handleCancelWaiting}>
                {t.multiplayer.cancelWait}
              </button>
            </div>
          ) : checkingActive ? (
            <p className={styles.empty}>{t.common.loading}</p>
          ) : !activeRoom ? (
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
