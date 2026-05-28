import { supabase } from './supabase'
import type { Board, Player, Room } from '../types'
import { createBoard } from './gameLogic'

/* ────────────────────────────────────────────────────────────────────────
   Normalisation — Supabase can hand back jsonb as objects OR strings, and
   numeric columns as numbers OR strings depending on transport (REST vs
   realtime). Everything funnels through normalizeRoom so the rest of the app
   always works with a clean, typed Room.
   ──────────────────────────────────────────────────────────────────────── */
function asBoard(v: unknown): Board {
  if (Array.isArray(v)) return v as Board
  if (typeof v === 'string') { try { return JSON.parse(v) as Board } catch { /* ignore */ } }
  return createBoard()
}

function asMoves(v: unknown): number[] {
  if (Array.isArray(v)) return v as number[]
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { /* ignore */ } }
  return []
}

export function normalizeRoom(row: Record<string, unknown>): Room {
  return {
    id:             String(row.id ?? ''),
    code:           String(row.code ?? ''),
    host_id:        (row.host_id as string) ?? '',
    guest_id:       (row.guest_id as string) ?? null,
    host_username:  (row.host_username as string) ?? 'Host',
    guest_username: (row.guest_username as string) ?? null,
    board:          asBoard(row.board),
    moves:          asMoves(row.moves),
    current_player: Number(row.current_player) === 2 ? 2 : 1,
    status:         ((row.status as Room['status']) ?? 'waiting'),
    winner:         row.winner == null ? null : Number(row.winner),
  }
}

/* ──────────────────────────────── Rooms ──────────────────────────────── */
export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createRoom(hostId: string, hostUsername: string): Promise<Room> {
  const code = generateCode()
  const { data, error } = await supabase
    .from('mp_rooms')
    .insert({
      code,
      host_id: hostId,
      host_username: hostUsername,
      board: createBoard(),
      moves: [],
      current_player: 1,
      status: 'waiting',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return normalizeRoom(data)
}

export async function joinRoom(code: string, guestId: string, guestUsername: string): Promise<Room> {
  const upper = code.trim().toUpperCase()
  const { data: room, error: fetchErr } = await supabase
    .from('mp_rooms').select().eq('code', upper).maybeSingle()
  if (fetchErr) throw new Error(fetchErr.message)
  if (!room) throw new Error('Room not found. Check the code and try again.')
  if (room.status !== 'waiting') throw new Error('That room is already full or finished.')
  if (room.host_id === guestId) throw new Error('You cannot join your own room.')

  // .eq('status','waiting') guards against two people joining the same room
  const { data, error } = await supabase
    .from('mp_rooms')
    .update({ guest_id: guestId, guest_username: guestUsername, status: 'playing' })
    .eq('code', upper)
    .eq('status', 'waiting')
    .select()
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Could not join — the room was just taken or closed.')
  return normalizeRoom(data[0])
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('mp_rooms').select().eq('code', code.trim().toUpperCase()).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? normalizeRoom(data) : null
}

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
 * Persist a move. Uses .select() so an RLS-blocked write (which returns success
 * with ZERO rows) is detected and thrown instead of silently "succeeding".
 * Returns the authoritative row the server stored.
 */
export async function applyMove(
  code: string,
  board: Board,
  moves: number[],
  nextPlayer: Player,
  finished: boolean,
  winner: number | null,
): Promise<Room> {
  const update: Record<string, unknown> = { board, moves, current_player: nextPlayer }
  if (finished) { update.status = 'finished'; update.winner = winner }

  const { data, error } = await supabase
    .from('mp_rooms').update(update).eq('code', code).select()
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('Move not saved: 0 rows updated (the RLS UPDATE policy on mp_rooms is blocking this write).')
  }
  return normalizeRoom(data[0])
}

export async function forfeitRoom(code: string, forfeiter: Player): Promise<Player> {
  const winner: Player = forfeiter === 1 ? 2 : 1
  const { error } = await supabase
    .from('mp_rooms').update({ status: 'finished', winner }).eq('code', code)
  if (error) throw new Error(error.message)
  return winner
}

export async function cancelRoom(code: string): Promise<void> {
  // Only a still-waiting room can be cancelled; never recorded as a forfeit/loss
  const { error } = await supabase
    .from('mp_rooms').update({ status: 'cancelled' }).eq('code', code).eq('status', 'waiting')
  if (error) throw new Error(error.message)
}

export function subscribeToRoom(code: string, onUpdate: (room: Room) => void) {
  const channelId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return supabase
    .channel(`room-${code}-${channelId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'mp_rooms', filter: `code=eq.${code}` },
      payload => onUpdate(normalizeRoom(payload.new as Record<string, unknown>)),
    )
    .subscribe()
}

/* ──────────────────────────── Matches / stats ──────────────────────────── */
export async function saveMpMatch(
  playerId: string,
  opponentId: string | null,
  roomCode: string,
  opponentUsername: string,
  result: string,
  moves: number[],
) {
  const { error } = await supabase.from('mp_matches').insert({
    player_id: playerId,
    opponent_id: opponentId || null,
    room_code: roomCode,
    opponent_username: opponentUsername,
    result,
    moves,
  })
  if (error) throw new Error(error.message)
}

export async function getLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, mp_wins')
    .order('mp_wins', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data ?? []
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
