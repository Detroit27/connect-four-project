import type { Board, Cell, Player, WinInfo } from '../types'

export const ROWS = 6
export const COLS = 7

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[])
}

export function dropChip(board: Board, col: number, player: Player): Board | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) {
      const next = board.map(r => [...r]) as Board
      next[row][col] = player
      return next
    }
  }
  return null
}

export function getDropRow(board: Board, col: number): number | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) return row
  }
  return null
}

export function checkWin(board: Board): WinInfo | null {
  const directions = [[0,1],[1,0],[1,1],[1,-1]]
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c]
      if (p === 0) continue
      for (const [dr, dc] of directions) {
        const cells: [number, number][] = [[r, c]]
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i, nc = c + dc * i
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== p) break
          cells.push([nr, nc])
        }
        if (cells.length === 4) return { winner: p as Player, cells }
      }
    }
  }
  return null
}

export function isBoardFull(board: Board): boolean {
  return board[0].every(cell => cell !== 0)
}

export function getValidCols(board: Board): number[] {
  return Array.from({ length: COLS }, (_, i) => i).filter(c => board[0][c] === 0)
}

/** Returns the column where `player` can win in one move, or null */
export function getWinningMove(board: Board, player: Player): number | null {
  for (let col = 0; col < COLS; col++) {
    const next = dropChip(board, col, player)
    if (next && checkWin(next)?.winner === player) return col
  }
  return null
}

/** Quick hint for player 1: win > block > center */
export function getHintMove(board: Board): number {
  const cols = getValidCols(board)
  for (const col of cols) {
    const n = dropChip(board, col, 1); if (n && checkWin(n)) return col
  }
  for (const col of cols) {
    const n = dropChip(board, col, 2); if (n && checkWin(n)) return col
  }
  // Prefer center columns
  const preferred = [3, 2, 4, 1, 5, 0, 6]
  return preferred.find(c => cols.includes(c)) ?? cols[0]
}

/** Восстанавливает доску из массива ходов до нужного индекса (включительно) */
export function reconstructBoard(moves: number[], upTo: number): Board {
  let board = createBoard()
  let player: Player = 1
  for (let i = 0; i <= upTo && i < moves.length; i++) {
    board = dropChip(board, moves[i], player) ?? board
    player = player === 1 ? 2 : 1
  }
  return board
}
