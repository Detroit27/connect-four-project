import { useState } from 'react'
import { useShopStore } from '../store/shopStore'
import { useAuthStore } from '../store/authStore'
import { useT } from '../i18n'
import { SKINS, CASE_SKINS, getSkin } from '../lib/skins'
import { CASES, RARITY_COLORS } from '../lib/cases'
import { playCaseOpen } from '../lib/sound'
import { CaseOpenModal } from '../components/shop/CaseOpenModal'
import type { Rarity } from '../lib/cases'
import type { Skin } from '../lib/skins'
import styles from './ShopView.module.css'

interface PendingOpen {
  caseId: string
  winnerSkinId: string
  winnerRarity: Rarity
  isDuplicate: boolean
}

// All directly-purchasable skins, basic colours first then characters
const BUYABLE: Skin[] = [...SKINS, ...CASE_SKINS]

export function ShopView() {
  const t = useT()
  const { currency, buySkin, openCase, owns } = useShopStore()
  const { updateSkinOnServer, updateCurrencyOnServer } = useAuthStore()

  const [pendingOpen, setPendingOpen] = useState<PendingOpen | null>(null)

  const handleBuy = (id: string) => {
    if (buySkin(id)) {
      // Persist both the new balance and the new inventory
      updateCurrencyOnServer()
      updateSkinOnServer(useShopStore.getState().currentSkin, useShopStore.getState().inventory)
    }
  }

  const handleOpenCase = (caseId: string) => {
    const result = openCase(caseId)
    if (!result) return
    playCaseOpen()
    setPendingOpen({
      caseId,
      winnerSkinId: result.skinId,
      winnerRarity: result.rarity,
      isDuplicate: result.isDuplicate,
    })
  }

  const handleClaim = () => {
    // Case opening already adjusted the balance + inventory — persist both
    updateCurrencyOnServer()
    updateSkinOnServer(useShopStore.getState().currentSkin, useShopStore.getState().inventory)
    setPendingOpen(null)
  }

  return (
    <div className={styles.container}>

      {/* Case opening modal */}
      {pendingOpen && (
        <CaseOpenModal
          caseId={pendingOpen.caseId}
          winnerSkinId={pendingOpen.winnerSkinId}
          winnerRarity={pendingOpen.winnerRarity}
          isDuplicate={pendingOpen.isDuplicate}
          onClose={handleClaim}
        />
      )}

      {/* ── Balance header ── */}
      <div className={styles.balanceBar}>
        <span className={styles.balanceLabel}>{t.shop.balance}</span>
        <span className={styles.balanceValue}>{currency} {t.shop.coins}</span>
      </div>

      {/* ── Cases ── */}
      <h3 className={styles.sectionLabel}>{t.shop.casesTitle}</h3>
      <div className={styles.casesRow}>
        {CASES.map(c => (
          <div key={c.id} className={styles.caseCard} style={{ '--case-color': c.color } as React.CSSProperties}>
            <div className={styles.caseIcon}>
              {c.items.slice(0, 3).map((item, idx) => {
                const s = getSkin(item.skinId)
                return (
                  <div
                    key={idx}
                    className={styles.caseChip}
                    style={{
                      background: s.p1Color,
                      backgroundImage: s.image ? `url(${s.image})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: `inset 0 -2px 5px rgba(0,0,0,0.18)`,
                      zIndex: 3 - idx,
                      marginLeft: idx > 0 ? -14 : 0,
                      width: 46 - idx * 4,
                      height: 46 - idx * 4,
                    }}
                  />
                )
              })}
            </div>

            <div className={styles.caseInfo}>
              <span className={styles.caseName}>
                {t.shop.cases[c.id as keyof typeof t.shop.cases] ?? c.nameKey}
              </span>
              <div className={styles.caseRarities}>
                {c.items.map((item, idx) => (
                  <span
                    key={idx}
                    className={styles.rarityDot}
                    style={{ background: RARITY_COLORS[item.rarity] }}
                    title={item.rarity}
                  />
                ))}
              </div>
              <span className={styles.casePrice}>{c.price} {t.shop.coins}</span>
            </div>

            <button
              className={`btn-primary ${styles.caseBtn}`}
              onClick={() => handleOpenCase(c.id)}
              disabled={currency < c.price}
            >
              {t.shop.openCase}
            </button>
          </div>
        ))}
      </div>

      {/* ── Skins (acquire only) ── */}
      <h3 className={styles.sectionLabel}>{t.shop.title}</h3>
      <div className={styles.skinGrid}>
        {BUYABLE.map(s => {
          const owned = owns(s.id)
          const free  = s.price === 0
          return (
            <div key={s.id} className={`${styles.skinCard} ${owned ? styles.ownedCard : ''}`}>
              <div
                className={styles.skinChip}
                style={{
                  background: s.p1Color,
                  backgroundImage: s.image ? `url(${s.image})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: `inset 0 -4px 10px rgba(0,0,0,0.18), 0 6px 18px ${s.p1Shadow}${s.glowColor ? `, 0 0 18px ${s.glowColor}` : ''}`,
                }}
              />
              <span className={styles.skinName}>
                {t.shop.skins[s.id as keyof typeof t.shop.skins] ?? s.id}
              </span>

              {owned ? (
                <span className={styles.ownedBadge}>✓ {t.shop.ownedLabel}</span>
              ) : free ? (
                <span className={styles.freeBadge}>Free</span>
              ) : (
                <button
                  className={`btn-primary ${styles.buyBtn}`}
                  onClick={() => handleBuy(s.id)}
                  disabled={currency < s.price}
                >
                  {s.price} {t.shop.coins}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
