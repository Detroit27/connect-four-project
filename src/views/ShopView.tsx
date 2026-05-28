import { useShopStore } from '../store/shopStore'
import { useAuthStore } from '../store/authStore'
import { useT } from '../i18n'
import { SKINS, getSkin } from '../lib/skins'
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

      {/* ── Left panel: preview of YOUR chip ── */}
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
              boxShadow: `inset 0 -6px 14px rgba(0,0,0,0.16), 0 10px 30px ${skin.p1Shadow}`,
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

      {/* ── Right panel: skin list ── */}
      <div className={styles.list}>
        {SKINS.map(s => {
          const owned    = owns(s.id)
          const equipped = currentSkin === s.id
          return (
            <div key={s.id} className={`${styles.item} ${equipped ? styles.equipped : ''}`}>
              {/* Single chip — YOUR colour only */}
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
      </div>
    </div>
  )
}
