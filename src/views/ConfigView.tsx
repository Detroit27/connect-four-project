import { useState } from 'react'
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
  const { user, profile, signOut, updateUsername } = useAuthStore()

  const [usernameInput, setUsernameInput] = useState('')
  const [usernameMsg, setUsernameMsg]     = useState<{ text: string; ok: boolean } | null>(null)
  const [savingUsername, setSavingUsername] = useState(false)

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usernameInput.trim()) return
    setSavingUsername(true)
    setUsernameMsg(null)
    try {
      await updateUsername(usernameInput.trim())
      setUsernameMsg({ text: t.config.usernameSaved, ok: true })
      setUsernameInput('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.config.usernameTaken
      setUsernameMsg({ text: msg, ok: false })
    } finally {
      setSavingUsername(false)
    }
  }

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
          <>
            <div className={styles.accountRow}>
              <div>
                <p className={styles.signedInLabel}>{t.config.signedInAs}</p>
                <p className={styles.usernameDisplay}>{profile?.username ?? user.email}</p>
              </div>
              <button className="btn-ghost" onClick={signOut}>{t.common.signOut}</button>
            </div>

            {/* Username editor */}
            <form className={styles.usernameForm} onSubmit={handleUsernameChange}>
              <p className={styles.changeLabel}>{t.config.changeUsername}</p>
              <div className={styles.usernameRow}>
                <input
                  className={styles.usernameInput}
                  placeholder={t.config.usernamePlaceholder}
                  value={usernameInput}
                  onChange={e => { setUsernameInput(e.target.value); setUsernameMsg(null) }}
                  minLength={3}
                  maxLength={20}
                  disabled={savingUsername}
                />
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={savingUsername || usernameInput.trim().length < 3}
                  style={{ fontSize: 14, padding: '10px 20px', flexShrink: 0 }}
                >
                  {savingUsername ? '…' : t.config.save}
                </button>
              </div>
              {usernameMsg && (
                <p className={usernameMsg.ok ? styles.msgOk : styles.msgErr}>
                  {usernameMsg.text}
                </p>
              )}
            </form>
          </>
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
