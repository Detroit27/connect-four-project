import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CASES, RARITY_COLORS } from '../../lib/cases'
import { getSkin } from '../../lib/skins'
import { useT } from '../../i18n'
import type { Rarity } from '../../lib/cases'
import styles from './CaseOpenModal.module.css'

const ITEM_W       = 84   // px per reel slot
const WINNER_IDX   = 13   // 0-based index where winner lands
const TOTAL_ITEMS  = 20
const CONTAINER_W  = 440

// targetX that places winner at container center
const TARGET_X = -(WINNER_IDX * ITEM_W + ITEM_W / 2 - CONTAINER_W / 2)

type Phase = 'spinning' | 'reveal'

interface Props {
  caseId: string
  winnerSkinId: string
  winnerRarity: Rarity
  isDuplicate: boolean
  onClose: () => void
}

export function CaseOpenModal({ caseId, winnerSkinId, winnerRarity, isDuplicate, onClose }: Props) {
  const t = useT()
  const def = CASES.find(c => c.id === caseId)
  const [phase, setPhase] = useState<Phase>('spinning')

  // Stable reel items: random pool skins with winner locked at WINNER_IDX
  const reelItems = useMemo(() => {
    if (!def) return []
    const poolIds = def.items.map(i => i.skinId)
    return Array.from({ length: TOTAL_ITEMS }, (_, i) =>
      i === WINNER_IDX ? winnerSkinId : poolIds[Math.floor(Math.random() * poolIds.length)]
    )
  }, [def, winnerSkinId])

  // Switch to reveal after animation finishes
  useEffect(() => {
    const id = setTimeout(() => setPhase('reveal'), 3100)
    return () => clearTimeout(id)
  }, [])

  const winnerSkin = getSkin(winnerSkinId)
  const rarityColor = RARITY_COLORS[winnerRarity]

  if (!def) return null

  return (
    <div className={styles.overlay}>
      <motion.div
        className={styles.modal}
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
      >
        {/* Case title */}
        <h2 className={styles.title} style={{ color: def.color }}>
          {t.shop.cases[def.id as keyof typeof t.shop.cases] ?? def.nameKey}
        </h2>

        {/* ── Reel ── */}
        <div className={styles.reelContainer}>
          {/* center indicator */}
          <div className={styles.reelIndicator} />

          <motion.div
            className={styles.reel}
            initial={{ x: 0 }}
            animate={{ x: TARGET_X }}
            transition={{ duration: 2.9, ease: [0.08, 0.82, 0.16, 1] }}
          >
            {reelItems.map((skinId, i) => {
              const s = getSkin(skinId)
              const isWinner = i === WINNER_IDX && phase === 'reveal'
              return (
                <div key={i} className={`${styles.reelSlot} ${isWinner ? styles.winnerSlot : ''}`}>
                  <div
                    className={styles.reelChip}
                    style={{
                      background:  s.p1Color,
                      boxShadow:   isWinner
                        ? `0 0 24px ${rarityColor}, inset 0 -3px 8px rgba(0,0,0,0.18)`
                        : `inset 0 -3px 8px rgba(0,0,0,0.18)`,
                    }}
                  />
                </div>
              )
            })}
          </motion.div>
        </div>

        {/* ── Reveal ── */}
        <AnimatePresence>
          {phase === 'reveal' && (
            <motion.div
              className={styles.reveal}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              {/* Rarity badge */}
              <span className={styles.rarityBadge} style={{ background: rarityColor }}>
                {winnerRarity.toUpperCase()}
              </span>

              {/* Big chip */}
              <motion.div
                className={styles.revealChip}
                style={{
                  background:  winnerSkin.p1Color,
                  boxShadow:   `0 0 60px ${rarityColor}88, 0 16px 40px ${winnerSkin.p1Shadow}`,
                }}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
              />

              {/* Skin name */}
              <p className={styles.revealName}>{winnerSkin.nameKey}</p>

              {isDuplicate && (
                <p className={styles.duplicate}>{t.shop.duplicate}</p>
              )}

              <button className="btn-primary" style={{ marginTop: 8 }} onClick={onClose}>
                {t.shop.claim}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spinner while spinning */}
        {phase === 'spinning' && (
          <p className={styles.openingLabel}>{t.shop.opening}</p>
        )}
      </motion.div>
    </div>
  )
}
