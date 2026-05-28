import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { useT } from '../i18n'
import {
  createRoom, joinRoom, getMpHistory, getActiveRoom,
  cancelRoom, forfeitRoom, normalizeRoom,
} from '../lib/multiplayer'
import { supabase } from '../lib/supabase'
import { MultiplayerGame } from '../components/multiplayer/MultiplayerGame'
import { Leaderboard } from '../components/multiplayer/Leaderboard'
import type { Room, MpMatch, Player } from '../types'
import styles from './MultiplayerView.module.css'

export function MultiplayerView({ onAuthRequired }: { onAuthRequired: () => void }) {
  const t = useT()
  const { user, profile } = useAuthStore()
  const { setReplayMatch } = useGameStore()

  // Which top-level screen we're on
  const [screen, setScreen]       = useState<'lobby' | 'game'>('lobby')
  // The user's current active/waiting room (null = no room)
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  // 1 = host, 2 = guest
  const [myPlayer, setMyPlayer]   = useState<Player>(1)

  const [joinCode, setJoinCode]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [history, setHistory]     = useState<MpMatch[]>([])
  const [checking, setChecking]   = useState(true)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  // Poll the waiting room every 1.5 s until a guest appears.
  // Once the guest joins, update the banner → host can click Resume.
  const startWaitingPoll = useCallback((code: string) => {
    stopPoll()
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('mp_rooms').select().eq('code', code).maybeSingle() as any
        if (data?.guest_id && data.status === 'playing') {
          setActiveRoom(normalizeRoom(data as Record<string, unknown>))
          stopPoll()
        }
      } catch { /* network hiccup — next tick retries */ }
    }, 1500)
  }, [])

  const refreshHistory = useCallback(() => {
    if (user) getMpHistory(user.id).then(d => setHistory(d as MpMatch[])).catch(() => {})
  }, [user])

  // On mount: restore any in-progress room + load match history
  useEffect(() => {
    if (!user) { setChecking(false); return }
    Promise.all([
      getMpHistory(user.id).catch(() => []),
      getActiveRoom(user.id).catch(() => null),
    ]).then(([h, active]) => {
      setHistory(h as MpMatch[])
      if (active) {
        const r = active as Room
        setActiveRoom(r)
        setMyPlayer(r.host_id === user.id ? 1 : 2)
        if (r.status === 'waiting') startWaitingPoll(r.code)
      }
      setChecking(false)
    })
    return stopPoll
  }, [user])

  // ── Auth gate ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className={styles.authWall}>
        <p className={styles.authMsg}>{t.multiplayer.signInRequired}</p>
        <button className="btn-primary" onClick={onAuthRequired}>{t.common.signIn}</button>
      </div>
    )
  }

  const myUsername = profile?.username ?? user.email ?? 'You'

  // ── In-game screen ─────────────────────────────────────────────────────
  if (screen === 'game' && activeRoom) {
    return (
      <MultiplayerGame
        roomCode={activeRoom.code}
        initialBoard={activeRoom.board}
        initialMoves={activeRoom.moves ?? []}
        myPlayer={myPlayer}
        myUsername={myUsername}
        opponentUsername={
          myPlayer === 1 ? (activeRoom.guest_username ?? '?') : activeRoom.host_username
        }
        // Back pressed mid-game: return to lobby but keep activeRoom so the
        // banner shows "Active match" with Resume / Forfeit
        onLeave={() => setScreen('lobby')}
        // Main menu pressed after game ended: clear everything
        onFinished={() => {
          stopPoll()
          setActiveRoom(null)
          setScreen('lobby')
          refreshHistory()
        }}
      />
    )
  }

  // ── Lobby actions ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true); setError('')
    try {
      // Guard: don't create a second room if one already exists
      const existing = await getActiveRoom(user.id)
      if (existing) {
        const r = existing as Room
        setActiveRoom(r)
        setMyPlayer(r.host_id === user.id ? 1 : 2)
        if (r.status === 'waiting') startWaitingPoll(r.code)
        return
      }
      const r = await createRoom(user.id, myUsername)
      setActiveRoom(r)
      setMyPlayer(1)
      startWaitingPoll(r.code)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setLoading(true); setError('')
    try {
      const r = await joinRoom(joinCode.trim(), user.id, myUsername)
      setActiveRoom(r)
      setMyPlayer(2)
      setJoinCode('')
      setScreen('game')           // guest goes straight into the game
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleCancel = () => {
    const code = activeRoom?.code
    stopPoll()
    setActiveRoom(null)
    if (code) cancelRoom(code).catch(() => {})
  }

  const handleForfeit = async () => {
    if (!activeRoom || !window.confirm(t.multiplayer.forfeitConfirm)) return
    const player: Player = activeRoom.host_id === user.id ? 1 : 2
    stopPoll()
    setActiveRoom(null)
    forfeitRoom(activeRoom.code, player).catch(() => {})
  }

  const handleResume = () => setScreen('game')

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.main}>

        {/* ── Status banner — always visible while there's an active/waiting room ── */}
        {!checking && activeRoom && (
          <div
            className={`${styles.activeBanner} ${
              activeRoom.status === 'waiting' ? styles.bannerWaiting : styles.bannerPlaying
            }`}
          >
            <div className={styles.activeBannerInfo}>
              <span className={styles.activeBannerTitle}>
                {activeRoom.status === 'waiting'
                  ? t.multiplayer.waitingMatch
                  : t.multiplayer.activeMatch}
              </span>
              <div className={styles.codeRow}>
                <span className={styles.activeBannerLabel}>{t.multiplayer.activeCode}</span>
                <span className={styles.bannerCodeBig}>{activeRoom.code}</span>
                <button
                  className={styles.copyBtn}
                  title="Copy room code"
                  onClick={() => navigator.clipboard.writeText(activeRoom.code)}
                >
                  ⎘
                </button>
                {activeRoom.status === 'waiting' && (
                  <span className={styles.waitDots}><span /><span /><span /></span>
                )}
              </div>
            </div>
            <div className={styles.activeBannerActions}>
              {activeRoom.status === 'waiting' ? (
                <button className="btn-ghost" onClick={handleCancel}>
                  {t.multiplayer.cancelWait}
                </button>
              ) : (
                <>
                  <button className="btn-primary" onClick={handleResume}>
                    {t.multiplayer.resume}
                  </button>
                  <button className="btn-ghost" onClick={handleForfeit}>
                    {t.multiplayer.forfeit}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Create / Join ── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.multiplayer.title}</h2>

          {checking ? (
            <p className={styles.empty}>{t.common.loading}</p>
          ) : (
            <div className={styles.lobbyActions}>
              <button
                className={`btn-primary ${styles.bigBtn}`}
                onClick={handleCreate}
                disabled={loading || !!activeRoom}
              >
                {t.multiplayer.createRoom}
              </button>
              <div className={styles.joinRow}>
                <input
                  className={styles.input}
                  placeholder={t.multiplayer.enterCode}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && joinCode.trim() && !loading) handleJoin()
                  }}
                  maxLength={6}
                  disabled={!!activeRoom}
                />
                <button
                  className={`btn-primary ${styles.bigBtn}`}
                  onClick={handleJoin}
                  disabled={loading || !joinCode.trim() || !!activeRoom}
                >
                  {t.multiplayer.join}
                </button>
              </div>
              {error && <p className={styles.error}>{error}</p>}
            </div>
          )}
        </div>

        {/* ── Match history ── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.multiplayer.matchHistory}</h2>
          {history.length === 0 ? (
            <p className={styles.empty}>{t.multiplayer.noHistory}</p>
          ) : (
            <div className={styles.history}>
              {history.map((m: MpMatch) => (
                <div key={m.id} className={styles.matchRow}>
                  <span className={`${styles.result} ${styles[m.result]}`}>
                    {m.result === 'win'
                      ? t.singleplayer.won
                      : m.result === 'loss'
                      ? t.singleplayer.lost
                      : t.singleplayer.draw}
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
