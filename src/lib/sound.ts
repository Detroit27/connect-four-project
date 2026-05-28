/**
 * Sound system
 * - playClick(): synthesised paper/chip-drop click via Web Audio API (no file needed)
 * - startBgMusic() / stopBgMusic(): plays /public/music.mp3 if it exists.
 *   If the file is missing or autoplay is blocked, it silently does nothing.
 *
 * HOW TO ADD BACKGROUND MUSIC:
 *   Place any .mp3 file at /public/music.mp3
 *   The app will automatically play it on the main menu.
 *   Without the file everything works fine — music is simply skipped.
 */

// ─── Shared AudioContext (reused across clicks) ───────────────────────────────
let _ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === 'closed') {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      _ctx = new AC()
    }
    if (_ctx.state === 'suspended') _ctx.resume().catch(() => {})
    return _ctx
  } catch {
    return null
  }
}

// ─── Chip-drop click (synthesised) ───────────────────────────────────────────
export function playClick(): void {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const sampleRate = ctx.sampleRate
    const duration   = 0.07 // 70 ms
    const length     = Math.floor(sampleRate * duration)
    const buffer     = ctx.createBuffer(1, length, sampleRate)
    const data       = buffer.getChannelData(0)

    // White-noise burst with exponential decay — short papery "thud"
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2.5)
      data[i] = (Math.random() * 2 - 1) * decay * 0.55
    }

    // Low-pass filter to make it softer / paper-like
    const filter = ctx.createBiquadFilter()
    filter.type            = 'lowpass'
    filter.frequency.value = 2200

    const gain = ctx.createGain()
    gain.gain.value = 0.85

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start(ctx.currentTime)
  } catch { /* ignore */ }
}

// ─── Background music ─────────────────────────────────────────────────────────
let _bgAudio: HTMLAudioElement | null = null

export function startBgMusic(): void {
  if (_bgAudio) return
  try {
    const audio    = new Audio('/music.mp3')
    audio.loop     = true
    audio.volume   = 0.22
    audio.preload  = 'none'
    _bgAudio = audio
    audio.play().catch(() => {
      // File not found, autoplay blocked, or any other error — silently skip
      _bgAudio = null
    })
  } catch { _bgAudio = null }
}

export function stopBgMusic(): void {
  if (!_bgAudio) return
  try {
    _bgAudio.pause()
    _bgAudio.currentTime = 0
  } catch { /* ignore */ }
  _bgAudio = null
}
