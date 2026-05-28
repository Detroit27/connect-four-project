import { useGameStore } from '../store/gameStore'
import { useT } from '../i18n'
import type { Difficulty, SpMatch } from '../types'
import styles from './SingleplayerView.module.css'

const DIFFS: { id: Difficulty; labelKey: 'easy'|'medium'|'hard'|'extraHard'; descKey: 'easyDesc'|'mediumDesc'|'hardDesc'|'extraHardDesc' }[] = [
  { id: 'easy',      labelKey: 'easy',      descKey: 'easyDesc'      },
  { id: 'medium',    labelKey: 'medium',    descKey: 'mediumDesc'    },
  { id: 'hard',      labelKey: 'hard',      descKey: 'hardDesc'      },
  { id: 'extrahard', labelKey: 'extraHard', descKey: 'extraHardDesc' },
]

function resultLabel(m: SpMatch, t: ReturnType<typeof useT>) {
  if (m.result === 'win')  return t.singleplayer.won
  if (m.result === 'loss') return t.singleplayer.lost
  return t.singleplayer.draw
}

export function SingleplayerView() {
  const t = useT()
  const { difficulty, setDifficulty, startGame, spHistory, setReplayMatch } = useGameStore()

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.singleplayer.difficulty}</h2>
        <div className={styles.grid}>
          {DIFFS.map(d => (
            <button key={d.id}
              className={`${styles.card} ${difficulty === d.id ? styles.selected : ''}`}
              onClick={() => setDifficulty(d.id)}>
              <span className={styles.label}>{t.singleplayer[d.labelKey]}</span>
              <span className={styles.desc}>{t.singleplayer[d.descKey]}</span>
            </button>
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={startGame}>{t.singleplayer.startGame}</button>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.singleplayer.matchHistory}</h2>
        {spHistory.length === 0 ? (
          <p className={styles.empty}>{t.singleplayer.noHistory}</p>
        ) : (
          <div className={styles.history}>
            {spHistory.map(m => (
              <div key={m.id} className={styles.matchRow}>
                <span className={`${styles.result} ${styles[m.result]}`}>{resultLabel(m, t)}</span>
                <span className={styles.meta}>{m.difficulty} · {m.movesCount} {t.singleplayer.moves}</span>
                <span className={styles.coins}>+{m.coinsEarned}</span>
                <button className={styles.replayBtn} onClick={() => setReplayMatch(m)}>
                  {t.multiplayer.viewReplay}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
