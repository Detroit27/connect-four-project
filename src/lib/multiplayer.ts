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
  if (error) throw error
  return data
}

export async function joinRoom(code: string, guestId: string, guestUsername: string) {
  const { data: room, error: fetchErr } = await supabase
    .from('mp_rooms')
    .select()
    .eq('code', code.toUpperCase())
    .single()
  if (fetchErr || !room) throw new Error('Room not found')
  if (room.status !== 'waiting') throw new Error('Room is not available')
  if (room.host_id === guestId) throw new Error('Cannot join your own room')

  const { data, error } = await supabase
    .from('mp_rooms')
    .update({ guest_id: guestId, guest_username: guestUsername, status: 'playing' })
    .eq('code', code.toUpperCase())
    .select()
    .single()
  if (error) throw error
  return data
}

export async function pushMove(code: string, board: Board, moves: number[], nextPlayer: Player, status?: string, winner?: number | null) {
  const update: Record<string, unknown> = { board, moves, current_player: nextPlayer }
  if (status) update.status = status
  if (winner !== undefined) update.winner = winner

  const { error } = await supabase
    .from('mp_rooms')
    .update(update)
    .eq('code', code)
  if (error) throw error
}

export async function saveMpMatch(playerId: string, opponentId: string, roomCode: string, opponentUsername: string, result: string, moves: number[]) {
  const { error } = await supabase
    .from('mp_matches')
    .insert({ player_id: playerId, opponent_id: opponentId, room_code: roomCode, opponent_username: opponentUsername, result, moves })
  if (error) throw error
}

export function subscribeToRoom(code: string, onUpdate: (room: Record<string, unknown>) => void) {
  return supabase
    .channel(`room-${code}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mp_rooms', filter: `code=eq.${code}` },
      payload => onUpdate(payload.new as Record<string, unknown>))
    .subscribe()
}

export async function getLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, mp_wins')
    .order('mp_wins', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getMpHistory(playerId: string) {
  const { data, error } = await supabase
    .from('mp_matches')
    .select('*')
    .eq('player_id', playerId)
    .order('played_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data ?? []
}
