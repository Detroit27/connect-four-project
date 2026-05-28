import { useEffect, useRef } from 'react'
import type { Room } from '../types'
import { getRoomByCode, subscribeToRoom } from '../lib/multiplayer'

/**
 * Keeps a single room in sync with the server, robustly:
 *  1. Realtime push   — instant updates when Supabase Realtime delivers them.
 *  2. Polling          — fallback every `intervalMs`, in case Realtime is off.
 *  3. Focus/visibility — browsers throttle (or pause) setInterval in background
 *                        tabs, so we re-pull the moment the tab is focused again.
 *                        This is what makes two-window play reliable.
 *
 * The caller decides how to merge each snapshot (see mergeRoom in the view),
 * so this hook only fetches and forwards — it holds no state of its own.
 */
export function useRoomChannel(
  code: string | null,
  onRoom: (room: Room) => void,
  intervalMs = 1000,
) {
  const cb = useRef(onRoom)
  cb.current = onRoom

  useEffect(() => {
    if (!code) return
    let stopped = false

    const pull = async () => {
      try {
        const room = await getRoomByCode(code)
        if (room && !stopped) cb.current(room)
      } catch (e) {
        console.error('[MP] sync pull failed:', e)
      }
    }

    const channel = subscribeToRoom(code, room => { if (!stopped) cb.current(room) })
    pull()
    const timer = setInterval(pull, intervalMs)

    const onWake = () => { if (!document.hidden) pull() }
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)

    return () => {
      stopped = true
      channel.unsubscribe()
      clearInterval(timer)
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [code, intervalMs])
}
