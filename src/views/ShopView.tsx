import { useShopStore } from '../store/shopStore'
import { useAuthStore } from '../store/authStore'
import { useT } from '../i18n'
import { SKINS, getSkin, DEFAULT_P2_COLOR, DEFAULT_P2_SHADOW } from '../lib/skins'
import styles from './ShopView.module.css'

export function ShopView() {
  const t = useT()
  const { currency, currentSkin, buySkin, equipSkin, owns } = useShopStore()
  const { updateSkinOnServer } = useAuthStore()
  const skin = getSkin(currentSkin)

  const handleEquip = (id: string) => {
    equipSkin(id)
    updateSkinOnServer(id, useShopStore.getState().inventory)
  }

  const handleBuy = (id: string) => {
    if (buySkin(id)) handleEquip(id)
  }

  return (
    <div className={styles.container}>
      {/* Left panel */}
      <aside className={styles.preview}>
        <h3 className={styles.previewTitle}>{t.shop.yourSkin}</h3>
        <div className={styles.chipPreview}>
          {/* Твоя фишка */}
          <div className={styles.chipSlot}>
            <div className={styles.chipP1}
              style={{
                background: skin.p1Color,
                backgroundImage: skin.image ? `url(${skin.image})` : undefined,
                backgroundSize: 'cover',
                boxShadow: `inset 0 -4px 8px rgba(0,0,0,0.14), 0 6px 18px ${skin.p1Shadow}`,
              }} />
            <span className={styles.chipLabel}>You</span>
          </div>
          {/* Противник — всегда дефолт */}
          <div className={styles.chipSlot}>
            <div className={styles.chipP2}
              style={{
                background: DEFAULT_P2_COLOR,
                boxShadow: `inset 0 -4px 8px rgba(0,0,0,0.14), 0 6px 18px ${DEFAULT_P2_SHADOW}`,
              }} />
            <span className={styles.chipLabel}>Opp.</span>
          </div>
        </div>
        <p className={styles.skinName}>{t.shop.skins[skin.id as keyof typeof t.shop.skins] ?? skin.id}</p>
        <div className={styles.balance}>
          <span className={styles.balanceLabel}>{t.shop.balance}</span>
          <span className={styles.balanceValue}>{currency} {t.shop.coins}</span>
        </div>
      </aside>

      {/* Right panel */}
      <div className={styles.list}>
        {SKINS.map(s => {
          const owned = owns(s.id)
          const equipped = currentSkin === s.id
          return (
            <div key={s.id} className={`${styles.item} ${equipped ? styles.equipped : ''}`}>
              <div className={styles.itemChips}>
                <div className={styles.smallChip} style={{
                  background: s.p1Color,
                  backgroundImage: s.image ? `url(${s.image})` : undefined,
                  backgroundSize: 'cover',
                }} />
                <div className={styles.smallChip} style={{ background: DEFAULT_P2_COLOR, opacity: 0.5 }} />
              </div>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{t.shop.skins[s.id as keyof typeof t.shop.skins] ?? s.id}</span>
                {s.price > 0 && !owned && (
                  <span className={styles.price}>{s.price} {t.shop.coins}</span>
                )}
              </div>
              <div className={styles.itemAction}>
                {equipped ? (
                  <span className={styles.equippedBadge}>{t.shop.equipped}</span>
                ) : owned ? (
                  <button className="btn-ghost" onClick={() => handleEquip(s.id)}>{t.shop.owned}</button>
                ) : (
                  <button className="btn-primary" onClick={() => handleBuy(s.id)}
                    disabled={currency < s.price}
                    style={{ fontSize: 13, padding: '8px 18px' }}>
                    {t.shop.buy}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
