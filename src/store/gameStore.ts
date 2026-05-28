import { create } from 'zustand'
import type { Board, Difficulty, Player, Screen, Theme, Language, WinInfo, SpMatch, MpMatch } from '../types'
import { createBoard } from '../lib/gameLogic'

interface GameState {
  screen: Screen
  theme: Theme
  language: Language
  difficulty: Difficulty

  // SP game
  board: Board
  currentPlayer: Player
  winInfo: WinInfo | null
  isDraw: boolean
  isAIThinking: boolean
  moves: number[]
  gameStartedAt: number | null

  // SP history (localStorage)
  spHistory: SpMatch[]

  // MP game — хранится в отдельном store, здесь только replay
  replayMatch: SpMatch | MpMatch | null

  setScreen: (s: Screen) => void
  setTheme: (t: Theme) => void
  setLanguage: (l: Language) => void
  setDifficulty: (d: Difficulty) => void

  startGame: () => void
  setBoard: (b: Board) => void
  setCurrentPlayer: (p: Player) => void
  setWinInfo: (w: WinInfo | null) => void
  setIsDraw: (v: boolean) => void
  setIsAIThinking: (v: boolean) => void
  pushMove: (col: number) => void
  resetGame: () => void
  exitGame: () => void

  addSpMatch: (m: SpMatch) => void
  setReplayMatch: (m: SpMatch | MpMatch | null) => void
}

const loadSpHistory = (): SpMatch[] => {
  try { return JSON.parse(localStorage.getItem('sp_history') ?? '[]') } catch { return [] }
}

const saveSpHistory = (h: SpMatch[]) => {
  localStorage.setItem('sp_history', JSON.stringify(h.slice(0, 50)))
}

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'menu',
  theme: (localStorage.getItem('theme') as Theme) ?? 'light',
  language: (localStorage.getItem('language') as Language) ?? 'en',
  difficulty: 'medium',

  board: createBoard(),
  currentPlayer: 1,
  winInfo: null,
  isDraw: false,
  isAIThinking: false,
  moves: [],
  gameStartedAt: null,
  spHistory: loadSpHistory(),
  replayMatch: null,

  setScreen: (screen) => set({ screen }),

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
    set({ theme })
  },

  setLanguage: (language) => {
    localStorage.setItem('language', language)
    set({ language })
  },

  setDifficulty: (difficulty) => set({ difficulty }),

  startGame: () => set({
    board: createBoard(), currentPlayer: 1,
    winInfo: null, isDraw: false,
    isAIThinking: false, moves: [],
    gameStartedAt: Date.now(),
    screen: 'game',
  }),

  setBoard: (board) => set({ board }),
  setCurrentPlayer: (currentPlayer) => set({ currentPlayer }),
  setWinInfo: (winInfo) => set({ winInfo }),
  setIsDraw: (isDraw) => set({ isDraw }),
  setIsAIThinking: (isAIThinking) => set({ isAIThinking }),
  pushMove: (col) => set(s => ({ moves: [...s.moves, col] })),

  resetGame: () => set({
    board: createBoard(), currentPlayer: 1,
    winInfo: null, isDraw: false,
    isAIThinking: false, moves: [],
    gameStartedAt: Date.now(),
  }),

  exitGame: () => set({
    board: createBoard(), currentPlayer: 1,
    winInfo: null, isDraw: false,
    isAIThinking: false, moves: [],
    gameStartedAt: null, screen: 'singleplayer',
  }),

  addSpMatch: (m) => {
    const next = [m, ...get().spHistory].slice(0, 50)
    saveSpHistory(next)
    set({ spHistory: next })
  },

  setReplayMatch: (replayMatch) => set({ replayMatch, screen: replayMatch ? 'replay' : get().screen }),
}))
