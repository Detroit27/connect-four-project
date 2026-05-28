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
