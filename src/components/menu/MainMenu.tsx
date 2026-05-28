import { useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useAuthStore } from '../../store/authStore'
import { useT } from '../../i18n'
import { MenuTile } from './MenuTile'
import { FallingChips } from './FallingChips'
import { startBgMusic, stopBgMusic } from '../../lib/sound'
import type { Screen } from '../../types'
import styles from './MainMenu.module.css'

const TILES: { screen: Screen; titleKey: keyof ReturnType<typeof useT>['menu']; subtitleKey: string }[] = [
  { screen: 'singleplayer', titleKey: 'singleplayer', subtitleKey: 'singleplayer' },
  { screen: 'multiplayer',  titleKey: 'multiplayer',  subtitleKey: 'multiplayer'  },
  { screen: 'shop',         titleKey: 'shop',         subtitleKey: 'shop'         },
  { screen: 'config',       titleKey: 'config',       subtitleKey: 'config'       },
]

interface Props {
  onAuthClick: () => void
}

export function MainMenu({ onAuthClick }: Props) {
  const { setScreen } = useGameStore()
  const { user, profile, signOut } = useAuthStore()
  const t = useT()

  useEffect(() => {
    startBgMusic()
    return () => stopBgMusic()
  }, [])

  return (
    <div className={styles.root}>
      {/* Animated falling-chips background */}
      <FallingChips />

      <header className={styles.header}>
        <span className={styles.logo}>Four</span>
        <div className={styles.authArea}>
          {user ? (
            <div className={styles.userRow}>
              <span className={styles.username}>{profile?.username ?? user.email}</span>
              <button className="btn-ghost" onClick={signOut}>{t.common.signOut}</button>
            </div>
          ) : (
            <button className="btn-ghost" onClick={onAuthClick}>{t.common.signIn}</button>
          )}
        </div>
      </header>

      <main className={styles.grid}>
        {TILES.map(({ screen, titleKey, subtitleKey }) => (
          <MenuTile
            key={screen}
            title={t.menu[titleKey] as string}
            subtitle={t.menu.subtitles[subtitleKey as keyof typeof t.menu.subtitles]}
            onClick={() => setScreen(screen)}
          />
        ))}
      </main>
    </div>
  )
}
