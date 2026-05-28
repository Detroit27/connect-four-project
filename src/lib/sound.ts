/**
 * Sound system — all synthesis via Web Audio API (no audio files required).
 * Background music is the only exception: plays /public/music.mp3 if present.
 */

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
  } catch { return null }
}

// ─── Chip-drop paper click ─────────────────────────────────────────────────
export function playClick(): void {
  const ctx = getCtx(); if (!ctx) return
  try {
    const len  = Math.floor(ctx.sampleRate * 0.07)
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5) * 0.55
    }
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2200
    const gain   = ctx.createGain(); gain.gain.value = 0.85
    const src    = ctx.createBufferSource(); src.buffer = buf
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
    src.start(ctx.currentTime)
  } catch { /* ignore */ }
}

// ─── Win — ascending arpeggio ─────────────────────────────────────────────
export function playWin(): void {
  const ctx = getCtx(); if (!ctx) return
  try {
    const notes = [261.63, 329.63, 392.00, 523.25]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.connect(g); g.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.11
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.32, t + 0.04)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
      osc.start(t); osc.stop(t + 0.6)
    })
  } catch { /* ignore */ }
}

// ─── Loss — descending sigh ───────────────────────────────────────────────
export function playLoss(): void {
  const ctx = getCtx(); if (!ctx) return
  try {
    const notes = [392.00, 349.23, 293.66, 246.94]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.connect(g); g.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.14
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.22, t + 0.05)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
      osc.start(t); osc.stop(t + 0.65)
    })
  } catch { /* ignore */ }
}

// ─── Case open — rising flourish ──────────────────────────────────────────
export function playCaseOpen(): void {
  const ctx = getCtx(); if (!ctx) return
  try {
    const freqs = [261.63, 311.13, 369.99, 440.00, 523.25]
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.connect(g); g.connect(ctx.destination)
      osc.type = i < 4 ? 'triangle' : 'sine'; osc.frequency.value = f
      const t = ctx.currentTime + i * 0.09
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.26, t + 0.04)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
      osc.start(t); osc.stop(t + 0.55)
    })
  } catch { /* ignore */ }
}

// ─── Background music ─────────────────────────────────────────────────────
let _bgAudio: HTMLAudioElement | null = null

export function startBgMusic(): void {
  if (_bgAudio) return
  try {
    const audio = new Audio('/music.mp3')
    audio.loop = true; audio.volume = 0.22; audio.preload = 'none'
    _bgAudio = audio
    audio.play().catch(() => { _bgAudio = null })
  } catch { _bgAudio = null }
}

export function stopBgMusic(): void {
  if (!_bgAudio) return
  try { _bgAudio.pause(); _bgAudio.currentTime = 0 } catch { /* ignore */ }
  _bgAudio = null
}
