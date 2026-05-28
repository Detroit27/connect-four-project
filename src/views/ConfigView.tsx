import { useGameStore } from '../store/gameStore'
import { useAuthStore } from '../store/authStore'
import { useT } from '../i18n'
import type { Language } from '../types'
import styles from './ConfigView.module.css'

const LANGS: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
]

interface Props { onAuthClick: () => void }

export function ConfigView({ onAuthClick }: Props) {
  const t = useT()
  const { theme, setTheme, language, setLanguage } = useGameStore()
  const { user, profile, signOut } = useAuthStore()

  return (
    <div className={styles.container}>

      {/* ── Appearance ── */}
      <div className={styles.section}>
        <h2 className={styles.title}>{t.config.appearance}</h2>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t.config.theme}</span>
          <div className={styles.toggle}>
            {(['light', 'dark'] as const).map(th => (
              <button key={th}
                className={`${styles.toggleBtn} ${theme === th ? styles.active : ''}`}
                onClick={() => setTheme(th)}>
                {th === 'light' ? t.config.light : t.config.dark}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t.config.language}</span>
          <div className={styles.toggle}>
            {LANGS.map(l => (
              <button key={l.id}
                className={`${styles.toggleBtn} ${language === l.id ? styles.active : ''}`}
                onClick={() => setLanguage(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Account ── */}
      <div className={styles.section}>
        <h2 className={styles.title}>{t.config.account}</h2>

        {user ? (
          <div className={styles.accountRow}>
            <div>
              <p className={styles.signedInLabel}>{t.config.signedInAs}</p>
              <p className={styles.usernameDisplay}>{profile?.username ?? user.email}</p>
            </div>
            <button className="btn-ghost" onClick={signOut}>{t.common.signOut}</button>
          </div>
        ) : (
          <>
            <p className={styles.empty}>{t.config.signInDesc}</p>
            <button className="btn-primary" style={{ marginTop: 8 }} onClick={onAuthClick}>
              {t.common.signIn}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
