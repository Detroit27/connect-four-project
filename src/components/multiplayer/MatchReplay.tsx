import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { reconstructBoard, checkWin } from '../../lib/gameLogic'
import { useT } from '../../i18n'
import { Board } from '../game/Board'
import styles from './MatchReplay.module.css'

export function MatchReplay() {
  const t = useT()
  const { replayMatch, setReplayMatch, setScreen } = useGameStore()
  const [step, setStep] = useState(replayMatch ? replayMatch.moves.length - 1 : 0)

  if (!replayMatch) return null

  const total = replayMatch.moves.length
  const board = reconstructBoard(replayMatch.moves, step)
  const winInfo = step === total - 1 ? checkWin(board) : null

  const close = () => {
    setReplayMatch(null)
    setScreen('singleplayer')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className="btn-ghost" onClick={close}>{t.common.back}</button>
        <span className={styles.title}>{t.replay.title}</span>
        <span className={styles.counter}>{t.replay.move} {step + 1} {t.replay.of} {total}</span>
      </div>

      <Board onColumnClick={() => {}} winInfo={winInfo} boardOverride={board} disableClick />

      <div className={styles.controls}>
        <button className="btn-ghost" onClick={() => setStep(0)} disabled={step === 0}>«</button>
        <button className="btn-ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>‹</button>
        <input
          type="range" min={0} max={total - 1} value={step}
          onChange={e => setStep(Number(e.target.value))}
          className={styles.slider}
        />
        <button className="btn-ghost" onClick={() => setStep(s => Math.min(total - 1, s + 1))} disabled={step === total - 1}>›</button>
        <button className="btn-ghost" onClick={() => setStep(total - 1)} disabled={step === total - 1}>»</button>
      </div>
    </div>
  )
}
