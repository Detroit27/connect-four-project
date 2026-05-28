import { supabase } from './supabase'
import type { Board, Player } from '../types'
import { createBoard } from './gameLogic'

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createRoom(hostId: string, hostUsername: string) {
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
  return data
}

export async function joinRoom(code: string, guestId: string, guestUsername: string) {
  // maybeSingle() не падает если строк 0 — просто возвращает null
  const { data: room, error: fetchErr } = await supabase
    .from('mp_rooms')
    .select()
    .eq('code', code.toUpperCase())
    .maybeSingle()

  if (fetchErr) throw new Error(fetchErr.message)
  if (!room) throw new Error('Room not found. Check the code and try again.')
  if (room.status !== 'waiting') throw new Error('Room is already full or finished.')
  if (room.host_id === guestId) throw new Error('You cannot join your own room.')

  const { data, error } = await supabase
    .from('mp_rooms')
    .update({ guest_id: guestId, guest_username: guestUsername, status: 'playing' })
    .eq('code', code.toUpperCase())
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getRoomByCode(code: string) {
  const { data, error } = await supabase
    .from('mp_rooms')
    .select()
    .eq('code', code.toUpperCase())
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function pushMove(
  code: string,
  board: Board,
  moves: number[],
  nextPlayer: Player,
  status?: string,
  winner?: number | null,
) {
  const update: Record<string, unknown> = { board, moves, current_player: nextPlayer }
  if (status) update.status = status
  if (winner !== undefined) update.winner = winner
  const { error } = await supabase.from('mp_rooms').update(update).eq('code', code)
  if (error) throw new Error(error.message)
}

export async function saveMpMatch(
  playerId: string,
  opponentId: string | null,   // null is fine — column allows it
  roomCode: string,
  opponentUsername: string,
  result: string,
  moves: number[],
) {
  const { error } = await supabase.from('mp_matches').insert({
    player_id: playerId,
    opponent_id: opponentId || null,  // guard: never pass empty string to a UUID column
    room_code: roomCode,
    opponent_username: opponentUsername,
    result,
    moves,
  })
  if (error) throw new Error(error.message)
}

export function subscribeToRoom(
  code: string,
  onUpdate: (room: Record<string, unknown>) => void,
) {
  const channelId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return supabase
    .channel(`room-${code}-${channelId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'mp_rooms', filter: `code=eq.${code}` },
      payload => onUpdate(payload.new as Record<string, unknown>),
    )
    .subscribe()
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

export async function forfeitRoom(code: string, forfeiterPlayer: 1 | 2) {
  const winner = forfeiterPlayer === 1 ? 2 : 1
  const { error } = await supabase
    .from('mp_rooms')
    .update({ status: 'finished', winner })
    .eq('code', code)
  if (error) throw new Error(error.message)
  return winner as 1 | 2
}

export async function cancelRoom(code: string) {
  const { error } = await supabase
    .from('mp_rooms')
    .update({ status: 'cancelled', winner: null })
    .eq('code', code)
    .eq('status', 'waiting')
  if (error) throw new Error(error.message)
}

export async function getActiveRoom(userId: string) {
  const { data, error } = await supabase
    .from('mp_rooms')
    .select()
    .or(`host_id.eq.${userId},guest_id.eq.${userId}`)
    .in('status', ['waiting', 'playing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}

export async function getMpHistory(playerId: string) {
  const { data, error } = await supabase
    .from('mp_matches')
    .select('*')
    .eq('player_id', playerId)
    .order('played_at', { ascending: false })
    .limit(30)
  if (error) throw new Error(error.message)
  // Map snake_case DB columns → camelCase MpMatch fields
  return (data ?? []).map(row => ({
    id:               row.id as string,
    roomCode:         row.room_code as string ?? '',
    opponentUsername: (row.opponent_username as string) ?? '?',
    result:           row.result as 'win' | 'loss' | 'draw',
    moves:            (row.moves as number[]) ?? [],
    playedAt:         row.played_at as string ?? '',
  }))
}
