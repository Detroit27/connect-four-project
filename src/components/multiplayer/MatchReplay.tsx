import { useState, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { reconstructBoard, checkWin } from '../../lib/gameLogic'
import { useT } from '../../i18n'
import { Board } from '../game/Board'
import type { SpMatch } from '../../types'
import styles from './MatchReplay.module.css'

export function MatchReplay() {
  const t = useT()
  const { replayMatch, setReplayMatch, setScreen } = useGameStore()
  const moves = replayMatch?.moves ?? []
  const total = moves.length
  const [step, setStep] = useState(total > 0 ? total - 1 : 0)

  // Reset step whenever the match changes (e.g. opening a new replay)
  useEffect(() => {
    setStep(total > 0 ? total - 1 : 0)
  }, [replayMatch, total])

  if (!replayMatch) return null

  const safeStep = Math.min(step, Math.max(0, total - 1))
  const board = total > 0 ? reconstructBoard(moves, safeStep) : null
  const winInfo = (safeStep === total - 1 && board) ? checkWin(board) : null

  const close = () => {
    // Detect SP match by presence of 'difficulty' field
    const isSpMatch = typeof (replayMatch as SpMatch).difficulty === 'string'
    setReplayMatch(null)
    setScreen(isSpMatch ? 'singleplayer' : 'multiplayer')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className="btn-ghost" onClick={close}>{t.common.back}</button>
        <span className={styles.title}>{t.replay.title}</span>
        <span className={styles.counter}>
          {total > 0 ? `${t.replay.move} ${safeStep + 1} ${t.replay.of} ${total}` : '—'}
        </span>
      </div>

      {total === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No moves recorded.</p>
      ) : board ? (
        <Board onColumnClick={() => {}} winInfo={winInfo} boardOverride={board} disableClick />
      ) : null}

      {total > 0 && (
        <div className={styles.controls}>
          <button className="btn-ghost" onClick={() => setStep(0)} disabled={safeStep === 0}>«</button>
          <button className="btn-ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={safeStep === 0}>‹</button>
          <input
            type="range" min={0} max={total - 1} value={safeStep}
            onChange={e => setStep(Number(e.target.value))}
            className={styles.slider}
          />
          <button className="btn-ghost" onClick={() => setStep(s => Math.min(total - 1, s + 1))} disabled={safeStep === total - 1}>›</button>
          <button className="btn-ghost" onClick={() => setStep(total - 1)} disabled={safeStep === total - 1}>»</button>
        </div>
      )}
    </div>
  )
}
