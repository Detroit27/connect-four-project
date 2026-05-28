import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useAuthStore } from '../../store/authStore'
import { useShopStore } from '../../store/shopStore'
import { useT } from '../../i18n'
import { MenuTile } from './MenuTile'
import { getSkin, ALL_SKINS } from '../../lib/skins'
import { startBgMusic, stopBgMusic } from '../../lib/sound'
import type { Screen } from '../../types'
import styles from './MainMenu.module.css'

const TILES: { screen: Screen; titleKey: keyof ReturnType<typeof useT>['menu']; subtitleKey: string }[] = [
  { screen: 'singleplayer', titleKey: 'singleplayer', subtitleKey: 'singleplayer' },
  { screen: 'multiplayer',  titleKey: 'multiplayer',  subtitleKey: 'multiplayer'  },
  { screen: 'shop',         titleKey: 'shop',         subtitleKey: 'shop'         },
  { screen: 'config',       titleKey: 'config',       subtitleKey: 'config'       },
  { screen: 'about',        titleKey: 'about',        subtitleKey: 'about'        },
]

interface Props { onAuthClick: () => void }

export function MainMenu({ onAuthClick }: Props) {
  const { setScreen } = useGameStore()
  const { user, profile, updateUsername } = useAuthStore()
  const { currentSkin, equipSkin, owns } = useShopStore()
  const { updateSkinOnServer } = useAuthStore()
  const t = useT()

  const [pickerOpen, setPickerOpen]   = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState('')
  const [nameSaving, setNameSaving]   = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const skin = getSkin(currentSkin)
  const ownedSkins = ALL_SKINS.filter(s => owns(s.id))
  const displayName = profile?.username ?? user?.email?.split('@')[0] ?? 'Guest'

  useEffect(() => {
    startBgMusic()
    return () => stopBgMusic()
  }, [])

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingName) {
      setNameInput(displayName)
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [editingName, displayName])

  const handleEquip = (id: string) => {
    equipSkin(id)
    updateSkinOnServer(id, useShopStore.getState().inventory)
    setPickerOpen(false)
  }

  const handleAvatarClick = () => {
    if (!user) { onAuthClick(); return }
    setPickerOpen(v => !v)
  }

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput.trim() === displayName) { setEditingName(false); return }
    setNameSaving(true)
    try {
      await updateUsername(nameInput.trim())
    } catch { /* ignore */ }
    setNameSaving(false)
    setEditingName(false)
  }

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        {/* ── Profile ── */}
        <div className={styles.profile}>
          {/* Avatar chip */}
          <div className={styles.avatarWrap} ref={pickerRef}>
            <button
              className={styles.avatar}
              onClick={handleAvatarClick}
              title="Change skin"
              style={{
                background: skin.p1Color,
                backgroundImage: skin.image ? `url(${skin.image})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: `inset 0 -6px 14px rgba(0,0,0,0.22), 0 8px 28px ${skin.p1Shadow}${skin.glowColor ? `, 0 0 30px ${skin.glowColor}` : ''}`,
              }}
            >
              <span className={styles.avatarEditIcon}>✏️</span>
            </button>

            {/* Skin picker dropdown */}
            {pickerOpen && ownedSkins.length > 0 && (
              <div className={styles.skinPicker}>
                {ownedSkins.map(s => (
                  <button
                    key={s.id}
                    className={`${styles.pickerChip} ${s.id === currentSkin ? styles.pickerActive : ''}`}
                    onClick={() => handleEquip(s.id)}
                    title={t.shop.skins[s.id as keyof typeof t.shop.skins] ?? s.id}
                    style={{
                      background: s.p1Color,
                      backgroundImage: s.image ? `url(${s.image})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Username */}
          <div className={styles.nameArea}>
            {editingName ? (
              <div className={styles.nameEditRow}>
                <input
                  ref={nameInputRef}
                  className={styles.nameInput}
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  maxLength={20}
                  disabled={nameSaving}
                />
                <button className={styles.nameSaveBtn} onClick={handleSaveName} disabled={nameSaving}>✓</button>
                <button className={styles.nameCancelBtn} onClick={() => setEditingName(false)}>✕</button>
              </div>
            ) : (
              <button
                className={styles.nameDisplay}
                onClick={() => { if (user) setEditingName(true); else onAuthClick() }}
                title={user ? 'Edit username' : 'Sign in'}
              >
                <span className={styles.nameText}>{displayName}</span>
                <span className={styles.nameEditHint}>✏️</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Navigation tiles ── */}
        <nav className={styles.tiles}>
          {TILES.map(({ screen, titleKey, subtitleKey }) => (
            <MenuTile
              key={screen}
              title={t.menu[titleKey] as string}
              subtitle={t.menu.subtitles[subtitleKey as keyof typeof t.menu.subtitles]}
              onClick={() => setScreen(screen)}
            />
          ))}
        </nav>
      </div>
    </div>
  )
}
