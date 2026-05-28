import { useState } from 'react'
import { useShopStore } from '../store/shopStore'
import { useAuthStore } from '../store/authStore'
import { useT } from '../i18n'
import { SKINS, CASE_SKINS, getSkin } from '../lib/skins'
import { CASES, RARITY_COLORS } from '../lib/cases'
import { playCaseOpen } from '../lib/sound'
import { CaseOpenModal } from '../components/shop/CaseOpenModal'
import type { Rarity } from '../lib/cases'
import styles from './ShopView.module.css'

interface PendingOpen {
  caseId: string
  winnerSkinId: string
  winnerRarity: Rarity
  isDuplicate: boolean
}

export function ShopView() {
  const t = useT()
  const { currency, currentSkin, buySkin, openCase, equipSkin, owns } = useShopStore()
  const { updateSkinOnServer } = useAuthStore()
  const skin = getSkin(currentSkin)

  const [pendingOpen, setPendingOpen] = useState<PendingOpen | null>(null)

  const handleEquip = (id: string) => {
    equipSkin(id)
    updateSkinOnServer(id, useShopStore.getState().inventory)
  }

  const handleBuy = (id: string) => {
    if (buySkin(id)) handleEquip(id)
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

  const handleClaim = (skinId: string) => {
    handleEquip(skinId)
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
          onClose={() => handleClaim(pendingOpen.winnerSkinId)}
        />
      )}

      {/* ── Left panel: preview + balance ── */}
      <aside className={styles.preview}>
        <h3 className={styles.previewTitle}>{t.shop.yourSkin}</h3>

        <div className={styles.chipPreview}>
          <div
            className={styles.chipBig}
            style={{
              background: skin.p1Color,
              backgroundImage: skin.image ? `url(${skin.image})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: `inset 0 -6px 14px rgba(0,0,0,0.16), 0 10px 30px ${skin.p1Shadow}${skin.glowColor ? `, 0 0 30px ${skin.glowColor}` : ''}`,
            }}
          />
        </div>

        <p className={styles.skinName}>
          {t.shop.skins[skin.id as keyof typeof t.shop.skins] ?? skin.id}
        </p>

        <div className={styles.balance}>
          <span className={styles.balanceLabel}>{t.shop.balance}</span>
          <span className={styles.balanceValue}>{currency} {t.shop.coins}</span>
        </div>
      </aside>

      {/* ── Right panel: cases + skins ── */}
      <div className={styles.list}>

        {/* Cases section */}
        <h3 className={styles.sectionLabel}>{t.shop.casesTitle}</h3>
        <div className={styles.casesRow}>
          {CASES.map(c => (
            <div key={c.id} className={styles.caseCard} style={{ '--case-color': c.color } as React.CSSProperties}>
              {/* Case icon – a styled chip cluster */}
              <div className={styles.caseIcon}>
                {c.items.slice(0, 3).map((item, idx) => {
                  const s = getSkin(item.skinId)
                  return (
                    <div
                      key={idx}
                      className={styles.caseChip}
                      style={{
                        background: s.p1Color,
                        boxShadow: `inset 0 -2px 5px rgba(0,0,0,0.18)`,
                        zIndex: 3 - idx,
                        marginLeft: idx > 0 ? -10 : 0,
                        width: 30 - idx * 3,
                        height: 30 - idx * 3,
                      }}
                    />
                  )
                })}
              </div>

              <div className={styles.caseInfo}>
                <span className={styles.caseName}>
                  {t.shop.cases[c.id as keyof typeof t.shop.cases] ?? c.nameKey}
                </span>
                {/* Rarity breakdown */}
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
                className="btn-primary"
                onClick={() => handleOpenCase(c.id)}
                disabled={currency < c.price}
                style={{ fontSize: 12, padding: '8px 16px', flexShrink: 0 }}
              >
                {t.shop.openCase}
              </button>
            </div>
          ))}
        </div>

        {/* Purchasable skins */}
        <h3 className={styles.sectionLabel}>{t.shop.title}</h3>

        {SKINS.map(s => {
          const owned    = owns(s.id)
          const equipped = currentSkin === s.id
          return (
            <div key={s.id} className={`${styles.item} ${equipped ? styles.equipped : ''}`}>
              <div
                className={styles.smallChip}
                style={{
                  background: s.p1Color,
                  backgroundImage: s.image ? `url(${s.image})` : undefined,
                  backgroundSize: 'cover',
                  boxShadow: `inset 0 -2px 5px rgba(0,0,0,0.14), 0 3px 10px ${s.p1Shadow}`,
                }}
              />
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>
                  {t.shop.skins[s.id as keyof typeof t.shop.skins] ?? s.id}
                </span>
                {s.price > 0 && !owned && (
                  <span className={styles.price}>{s.price} {t.shop.coins}</span>
                )}
                {s.price === 0 && !equipped && (
                  <span className={styles.price}>Free</span>
                )}
              </div>
              <div className={styles.itemAction}>
                {equipped ? (
                  <span className={styles.equippedBadge}>{t.shop.equipped}</span>
                ) : owned ? (
                  <button className="btn-ghost" onClick={() => handleEquip(s.id)}>{t.shop.owned}</button>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => handleBuy(s.id)}
                    disabled={currency < s.price}
                    style={{ fontSize: 13, padding: '8px 20px' }}
                  >
                    {t.shop.buy}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Case-exclusive skins (only show if owned) */}
        {CASE_SKINS.some(s => owns(s.id)) && (
          <>
            <h3 className={styles.sectionLabel} style={{ marginTop: 8 }}>Case Skins</h3>
            {CASE_SKINS.filter(s => owns(s.id)).map(s => {
              const equipped = currentSkin === s.id
              return (
                <div key={s.id} className={`${styles.item} ${equipped ? styles.equipped : ''}`}>
                  <div
                    className={styles.smallChip}
                    style={{
                      background: s.p1Color,
                      boxShadow: `inset 0 -2px 5px rgba(0,0,0,0.14), 0 3px 10px ${s.p1Shadow}${s.glowColor ? `, 0 0 12px ${s.glowColor}` : ''}`,
                    }}
                  />
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>
                      {t.shop.skins[s.id as keyof typeof t.shop.skins] ?? s.id}
                    </span>
                    <span className={styles.caseOnlyBadge}>{t.shop.caseOnly}</span>
                  </div>
                  <div className={styles.itemAction}>
                    {equipped ? (
                      <span className={styles.equippedBadge}>{t.shop.equipped}</span>
                    ) : (
                      <button className="btn-ghost" onClick={() => handleEquip(s.id)}>{t.shop.owned}</button>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
