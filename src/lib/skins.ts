export interface Skin {
  id: string
  nameKey: string   // ключ в t.shop.skins
  price: number     // 0 = бесплатно
  p1Color: string   // ТВОИ фишки
  p1Shadow: string
  /**
   * Необязательно. Путь к текстуре чипа.
   * Клади файл в /public/skins/<имя>.png
   * Формат: PNG или JPG, квадрат, минимум 200×200px.
   * Пример: '/skins/marble.png'
   * Текстура накладывается поверх цвета с режимом смешивания overlay.
   */
  image?: string
}

/**
 * КАК ДОБАВИТЬ НОВЫЙ СКИН:
 * 1. Добавь объект в массив SKINS ниже
 * 2. В src/i18n/en.ts → shop.skins → добавь: yourId: 'Your Name'
 * 3. В src/i18n/ru.ts → shop.skins → добавь: yourId: 'Название'
 * 4. Если есть текстура — положи PNG в /public/skins/ и укажи image: '/skins/yourfile.png'
 */
export const SKINS: Skin[] = [
  {
    id: 'classic',
    nameKey: 'classic',
    price: 0,
    p1Color: '#C4644A',
    p1Shadow: 'rgba(196,100,74,0.28)',
  },
  {
    id: 'slate',
    nameKey: 'slate',
    price: 50,
    p1Color: '#4A6B8A',
    p1Shadow: 'rgba(74,107,138,0.28)',
  },
  {
    id: 'forest',
    nameKey: 'forest',
    price: 80,
    p1Color: '#2D6A4F',
    p1Shadow: 'rgba(45,106,79,0.28)',
  },
  {
    id: 'dusk',
    nameKey: 'dusk',
    price: 120,
    p1Color: '#7B4EA6',
    p1Shadow: 'rgba(123,78,166,0.28)',
  },
  {
    id: 'obsidian',
    nameKey: 'obsidian',
    price: 180,
    p1Color: '#1C1C1E',
    p1Shadow: 'rgba(28,28,30,0.40)',
  },
  {
    id: 'gold',
    nameKey: 'gold',
    price: 250,
    p1Color: '#C9A84C',
    p1Shadow: 'rgba(201,168,76,0.32)',
  },
]

export const DEFAULT_P2_COLOR  = '#4A7B6F'
export const DEFAULT_P2_SHADOW = 'rgba(74,123,111,0.25)'

export function getSkin(id: string): Skin {
  return SKINS.find(s => s.id === id) ?? SKINS[0]
}

/** Применяет скин — меняет ТОЛЬКО фишки игрока 1 (тебя) */
export function applySkinVars(skin: Skin) {
  const r = document.documentElement
  r.style.setProperty('--player1', skin.p1Color)
  r.style.setProperty('--player1-shadow', skin.p1Shadow)
  // p2 всегда дефолтный
  r.style.setProperty('--player2', DEFAULT_P2_COLOR)
  r.style.setProperty('--player2-shadow', DEFAULT_P2_SHADOW)
}
