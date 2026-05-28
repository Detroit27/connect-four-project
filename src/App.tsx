import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Transition } from 'framer-motion'
import { useGameStore } from './store/gameStore'
import { useAuthStore } from './store/authStore'
import { useShopStore } from './store/shopStore'
import { getSkin, applySkinVars } from './lib/skins'
import { MainMenu } from './components/menu/MainMenu'
import { AuthModal } from './components/ui/AuthModal'
import { GameView } from './components/game/GameView'
import { MatchReplay } from './components/multiplayer/MatchReplay'
import { SingleplayerView } from './views/SingleplayerView'
import { MultiplayerView } from './views/MultiplayerView'
import { ShopView } from './views/ShopView'
import { ConfigView } from './views/ConfigView'
import { useT } from './i18n'
import styles from './App.module.css'

const tx: Transition = { duration: 0.16, ease: 'easeOut' }
const fade = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 } }

function SubScreen({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  const t = useT()
  return (
    <div className={styles.subRoot}>
      <header className={styles.subHeader}>
        <button className="btn-ghost" onClick={onBack}>{t.common.back}</button>
        <span className={styles.subTitle}>{title}</span>
        <div style={{ minWidth: 80 }} />
      </header>
      <div className={styles.subBody}>{children}</div>
    </div>
  )
}

export default function App() {
  const { screen, setScreen, theme } = useGameStore()
  const { init } = useAuthStore()
  const { currentSkin } = useShopStore()
  const t = useT()
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    applySkinVars(getSkin(currentSkin))
  }, [currentSkin])

  useEffect(() => { init() }, [init])

  if (screen === 'game') return <div className={styles.root}><GameView /></div>
  if (screen === 'replay') return <div className={styles.root}><MatchReplay /></div>

  if (screen === 'menu') {
    return (
      <div className={styles.root}>
        <MainMenu onAuthClick={() => setAuthOpen(true)} />
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <AnimatePresence mode="wait">
        {screen === 'singleplayer' && (
          <motion.div key="sp" {...fade} transition={tx} className={styles.fill}>
            <SubScreen title={t.menu.singleplayer} onBack={() => setScreen('menu')}>
              <SingleplayerView />
            </SubScreen>
          </motion.div>
        )}
        {screen === 'multiplayer' && (
          <motion.div key="mp" {...fade} transition={tx} className={styles.fill}>
            <SubScreen title={t.menu.multiplayer} onBack={() => setScreen('menu')}>
              <MultiplayerView onAuthRequired={() => setAuthOpen(true)} />
            </SubScreen>
          </motion.div>
        )}
        {screen === 'shop' && (
          <motion.div key="sh" {...fade} transition={tx} className={styles.fill}>
            <SubScreen title={t.menu.shop} onBack={() => setScreen('menu')}>
              <ShopView />
            </SubScreen>
          </motion.div>
        )}
        {screen === 'config' && (
          <motion.div key="cfg" {...fade} transition={tx} className={styles.fill}>
            <SubScreen title={t.menu.config} onBack={() => setScreen('menu')}>
              <ConfigView onAuthClick={() => setAuthOpen(true)} />
            </SubScreen>
          </motion.div>
        )}
      </AnimatePresence>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
