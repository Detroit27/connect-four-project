import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useT } from '../../i18n'
import styles from './AuthModal.module.css'

interface Props { onClose: () => void }

export function AuthModal({ onClose }: Props) {
  const t = useT()
  const { signIn, signUp, authError, setError } = useAuthStore()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signin') await signIn(email, password)
      else await signUp(email, password, username)
      onClose()
    } catch { /* error shown via authError */ }
    finally { setLoading(false) }
  }

  const switchMode = () => { setError(null); setMode(m => m === 'signin' ? 'signup' : 'signin') }

  return (
    <AnimatePresence>
      <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div className={styles.modal} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}>
          <h2 className={styles.title}>{mode === 'signin' ? t.auth.signInTitle : t.auth.signUpTitle}</h2>
          <form className={styles.form} onSubmit={submit}>
            {mode === 'signup' && (
              <div className={styles.field}>
                <label>{t.auth.username}</label>
                <input value={username} onChange={e => setUsername(e.target.value)} required minLength={3} maxLength={20} />
              </div>
            )}
            <div className={styles.field}>
              <label>{t.auth.email}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>{t.auth.password}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            {authError && <p className={styles.error}>{authError}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? (mode === 'signin' ? t.auth.signingIn : t.auth.signingUp)
                       : (mode === 'signin' ? t.auth.signInTitle : t.auth.signUpTitle)}
            </button>
          </form>
          <p className={styles.switch}>
            {mode === 'signin' ? t.auth.noAccount : t.auth.hasAccount}{' '}
            <button className={styles.switchBtn} type="button" onClick={switchMode}>
              {mode === 'signin' ? t.auth.signUpTitle : t.auth.signInTitle}
            </button>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
