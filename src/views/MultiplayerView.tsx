import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { useT } from '../i18n'
import { createRoom, joinRoom, getMpHistory } from '../lib/multiplayer'
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
  const [joinCode, setJoinCode] = useState('')
  const [room, setRoom] = useState<Room | null>(null)
  const [myPlayer, setMyPlayer] = useState<Player>(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<MpMatch[]>([])

  useEffect(() => {
    if (user) getMpHistory(user.id).then(d => setHistory(d as MpMatch[])).catch(() => {})
  }, [user])

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
        initialMoves={room.moves}
        myPlayer={myPlayer}
        opponentUsername={myPlayer === 1 ? (room.guest_username ?? '?') : room.host_username}
        onExit={() => { setRoom(null); setMpScreen('lobby') }}
      />
    )
  }

  const handleCreate = async () => {
    setLoading(true); setError('')
    try {
      const r = await createRoom(user.id, profile?.username ?? user.email ?? 'Host')
      setRoom(r as unknown as Room)
      setMyPlayer(1)
      setMpScreen('waiting')
      // Poll for guest
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from('mp_rooms').select().eq('code', r.code).single() as any
        if (data?.guest_id) {
          setRoom(data as Room)
          setMpScreen('game')
          clearInterval(interval)
        }
      }, 2000)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setLoading(true); setError('')
    try {
      const r = await joinRoom(joinCode.trim(), user.id, profile?.username ?? user.email ?? 'Guest')
      setRoom(r as unknown as Room)
      setMyPlayer(2)
      setMpScreen('game')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.multiplayer.title}</h2>
          {mpScreen === 'waiting' && room ? (
            <div className={styles.waiting}>
              <p className={styles.shareLabel}>{t.multiplayer.shareCode}</p>
              <div className={styles.codeBox}>{room.code}</div>
              <p className={styles.waitingLabel}>{t.multiplayer.waitingForOpponent}</p>
            </div>
          ) : (
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
          )}
        </div>

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
                  <button className={styles.replayBtn} onClick={() => { setReplayMatch(m) }}>
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
