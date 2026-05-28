export type Player = 1 | 2
export type Cell = 0 | Player
export type Board = Cell[][]
export type Difficulty = 'easy' | 'medium' | 'hard' | 'extrahard'
export type GameResult = 'win' | 'loss' | 'draw'
export type Screen = 'menu' | 'singleplayer' | 'multiplayer' | 'shop' | 'config' | 'about' | 'game' | 'mp_game' | 'replay'
export type Theme = 'light' | 'dark'
export type Language = 'en' | 'ru'

export interface WinInfo {
  winner: Player
  cells: [number, number][]
}

export interface SpMatch {
  id: string
  difficulty: Difficulty
  result: GameResult
  moves: number[]
  movesCount: number
  durationSeconds: number
  playedAt: string
  coinsEarned: number
}

export interface MpMatch {
  id: string
  roomCode: string
  opponentUsername: string
  result: GameResult
  moves: number[]
  playedAt: string
}

export interface Profile {
  id: string
  username: string
  currency: number
  inventory: string[]
  current_skin: string
  mp_wins: number
}

export interface Room {
  id: string
  code: string
  host_id: string
  guest_id: string | null
  host_username: string
  guest_username: string | null
  board: Board
  moves: number[]
  current_player: Player
  status: 'waiting' | 'playing' | 'finished' | 'cancelled'
  winner: number | null
}
