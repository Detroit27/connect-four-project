import type { Board, Difficulty } from '../types'
import { dropChip, checkWin, isBoardFull, getValidCols, ROWS, COLS } from './gameLogic'

function scoreWindow(window: number[], player: number): number {
  const opp = player === 1 ? 2 : 1
  const p = window.filter(c => c === player).length
  const e = window.filter(c => c === 0).length
  const o = window.filter(c => c === opp).length
  if (p === 4) return 100
  if (p === 3 && e === 1) return 5
  if (p === 2 && e === 2) return 2
  if (o === 3 && e === 1) return -4
  return 0
}

function scoreBoard(board: Board, player: number): number {
  let score = 0
  const center = board.map(r => r[Math.floor(COLS / 2)]).filter(c => c === player).length
  score += center * 3
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow(board[r].slice(c, c + 4), player)
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      score += scoreWindow([0,1,2,3].map(i => board[r+i][c]), player)
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++) {
      score += scoreWindow([0,1,2,3].map(i => board[r+i][c+i]), player)
      score += scoreWindow([0,1,2,3].map(i => board[r+3-i][c+i]), player)
    }
  return score
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): [number | null, number] {
  const win = checkWin(board)
  if (win) return [null, win.winner === 2 ? 100000 + depth : -(100000 + depth)]
  if (isBoardFull(board) || depth === 0) return [null, scoreBoard(board, 2)]
  const cols = getValidCols(board)
  let bestCol = cols[Math.floor(cols.length / 2)]
  if (maximizing) {
    let value = -Infinity
    for (const col of cols) {
      const [, score] = minimax(dropChip(board, col, 2)!, depth - 1, alpha, beta, false)
      if (score > value) { value = score; bestCol = col }
      alpha = Math.max(alpha, value)
      if (alpha >= beta) break
    }
    return [bestCol, value]
  } else {
    let value = Infinity
    for (const col of cols) {
      const [, score] = minimax(dropChip(board, col, 1)!, depth - 1, alpha, beta, true)
      if (score < value) { value = score; bestCol = col }
      beta = Math.min(beta, value)
      if (alpha >= beta) break
    }
    return [bestCol, value]
  }
}

export function getAIMove(board: Board, difficulty: Difficulty): number {
  const cols = getValidCols(board)

  if (difficulty === 'easy') {
    return cols[Math.floor(Math.random() * cols.length)]
  }

  // Immediate win/block check for medium+
  for (const col of cols) {
    const t = dropChip(board, col, 2)
    if (t && checkWin(t)) return col
  }
  for (const col of cols) {
    const t = dropChip(board, col, 1)
    if (t && checkWin(t)) return col
  }

  if (difficulty === 'medium') {
    // depth 2 — knows immediate threats but not much more
    const [col] = minimax(board, 2, -Infinity, Infinity, true)
    return col ?? cols[Math.floor(cols.length / 2)]
  }

  if (difficulty === 'hard') {
    // depth 4
    const [col] = minimax(board, 4, -Infinity, Infinity, true)
    return col ?? cols[Math.floor(cols.length / 2)]
  }

  // extrahard — depth 8
  const [col] = minimax(board, 8, -Infinity, Infinity, true)
  return col ?? cols[Math.floor(cols.length / 2)]
}
