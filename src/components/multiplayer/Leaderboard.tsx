import { useEffect, useState } from 'react'
import { getLeaderboard } from '../../lib/multiplayer'
import { useAuthStore } from '../../store/authStore'
import { useT } from '../../i18n'
import styles from './Leaderboard.module.css'

interface Entry { id: string; username: string; mp_wins: number }

export function Leaderboard() {
  const t = useT()
  const { user } = useAuthStore()
  const [rows, setRows] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaderboard(15).then(d => { setRows(d as Entry[]); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{t.multiplayer.leaderboard}</h3>
      {loading ? <p className={styles.empty}>{t.common.loading}</p> : rows.length === 0 ? (
        <p className={styles.empty}>{t.multiplayer.noHistory}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.multiplayer.rank}</th>
              <th>{t.multiplayer.player}</th>
              <th>{t.multiplayer.wins}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isMe = !!user && r.id === user.id
              return (
                <tr key={r.id} className={isMe ? styles.me : ''}>
                  <td>{i === 0 ? '🏆' : i + 1}</td>
                  <td>{r.username}{isMe ? ' (you)' : ''}</td>
                  <td>{r.mp_wins}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
