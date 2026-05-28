import { supabase } from './supabase'
import type { Board, Player, Room } from '../types'
import { createBoard } from './gameLogic'

/* ─────────────────────────── Normalisation ──────────────────────────────
   Supabase can return jsonb as objects or strings and numbers as strings
   depending on REST vs Realtime transport. Everything funnels here so the
   rest of the app always works with a clean typed Room.
   ──────────────────────────────────────────────────────────────────────── */
function asBoard(v: unknown): Board {
  if (Array.isArray(v)) return v as Board
  if (typeof v === 'string') { try { return JSON.parse(v) as Board } catch { /* ignore */ } }
  return createBoard()
}

function asMoves(v: unknown): number[] {
  if (Array.isArray(v)) return v as number[]
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { /* ignore */ }
  }
  return []
}

export function normalizeRoom(row: Record<string, unknown>): Room {
  return {
    id:             String(row.id ?? ''),
    code:           String(row.code ?? ''),
    host_id:        String(row.host_id ?? ''),
    guest_id:       (row.guest_id as string) ?? null,
    host_username:  String(row.host_username ?? 'Host'),
    guest_username: (row.guest_username as string) ?? null,
    board:          asBoard(row.board),
    moves:          asMoves(row.moves),
    current_player: Number(row.current_player) === 2 ? 2 : 1,
    status:         (row.status as Room['status']) ?? 'waiting',
    winner:         row.winner == null ? null : Number(row.winner),
  }
}

/* ────────────────────────────── Rooms ───────────────────────────────── */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createRoom(hostId: string, hostUsername: string): Promise<Room> {
  const code = generateCode()
  const { data, error } = await supabase
    .from('mp_rooms')
    .insert({
      code,
      host_id:      hostId,
      host_username: hostUsername,
      board:         createBoard(),
      moves:         [],
      current_player: 1,
      status:        'waiting',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return normalizeRoom(data)
}

export async function joinRoom(
  code: string,
  guestId: string,
  guestUsername: string,
): Promise<Room> {
  const upper = code.trim().toUpperCase()

  // Read first so we can give a clear error to the user
  const { data: existing, error: fetchErr } = await supabase
    .from('mp_rooms').select().eq('code', upper).maybeSingle()
  if (fetchErr) throw new Error(fetchErr.message)
  if (!existing)                     throw new Error('Room not found. Check the code and try again.')
  if (existing.status !== 'waiting') throw new Error('That room is no longer open.')
  if (existing.host_id === guestId)  throw new Error('You cannot join your own room.')

  // Atomic update — the extra .eq('status','waiting') prevents two guests
  // joining simultaneously: the second update finds 0 rows and throws.
  const { data, error } = await supabase
    .from('mp_rooms')
    .update({ guest_id: guestId, guest_username: guestUsername, status: 'playing' })
    .eq('code', upper)
    .eq('status', 'waiting')
    .select()
  if (error) throw new Error(error.message)
  if (!data || data.length === 0)
    throw new Error('Room was just taken by someone else. Try another code.')
  return normalizeRoom(data[0])
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('mp_rooms').select().eq('code', code.trim().toUpperCase()).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? normalizeRoom(data) : null
}

/** Returns the user's most recent room that is still waiting or playing. */
export async function getActiveRoom(userId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('mp_rooms')
    .select()
    .or(`host_id.eq.${userId},guest_id.eq.${userId}`)
    .in('status', ['waiting', 'playing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data ? normalizeRoom(data) : null
}

/**
 * Persist a move. Uses .select() so that an RLS-blocked write (which
 * returns 0 rows instead of an error) is caught and thrown.
 */
export async function applyMove(
  code: string,
  board: Board,
  moves: number[],
  nextPlayer: Player,
  finished: boolean,
  winner: number | null,
): Promise<void> {
  const update: Record<string, unknown> = { board, moves, current_player: nextPlayer }
  if (finished) { update.status = 'finished'; update.winner = winner }

  const { data, error } = await supabase
    .from('mp_rooms').update(update).eq('code', code).select()
  if (error) throw new Error(error.message)
  if (!data || data.length === 0)
    throw new Error('Move not saved — the server rejected the write.')
}

export async function forfeitRoom(code: string, forfeiter: Player): Promise<void> {
  const winner: Player = forfeiter === 1 ? 2 : 1
  const { error } = await supabase
    .from('mp_rooms').update({ status: 'finished', winner }).eq('code', code)
  if (error) throw new Error(error.message)
}

export async function cancelRoom(code: string): Promise<void> {
  const { error } = await supabase
    .from('mp_rooms')
    .update({ status: 'cancelled' })
    .eq('code', code)
    .eq('status', 'waiting')   // only cancel if still waiting, never a live game
  if (error) throw new Error(error.message)
}

/* ────────────────────────── Match history ───────────────────────────── */
export async function saveMpMatch(
  playerId: string,
  opponentId: string | null,
  roomCode: string,
  opponentUsername: string,
  result: 'win' | 'loss' | 'draw',
  moves: number[],
): Promise<void> {
  const { error } = await supabase.from('mp_matches').insert({
    player_id:         playerId,
    opponent_id:       opponentId ?? null,
    room_code:         roomCode,
    opponent_username: opponentUsername,
    result,
    moves,
  })
  if (error) throw new Error(error.message)
}

export async function getMpHistory(playerId: string) {
  const { data, error } = await supabase
    .from('mp_matches')
    .select('*')
    .eq('player_id', playerId)
    .order('played_at', { ascending: false })
    .limit(30)
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => ({
    id:               row.id as string,
    roomCode:         (row.room_code as string) ?? '',
    opponentUsername: (row.opponent_username as string) ?? '?',
    result:           row.result as 'win' | 'loss' | 'draw',
    moves:            (row.moves as number[]) ?? [],
    playedAt:         (row.played_at as string) ?? '',
  }))
}

export async function getLeaderboard(limit = 15) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, mp_wins')
    .order('mp_wins', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data ?? []
}
