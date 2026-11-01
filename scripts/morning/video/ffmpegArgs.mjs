// Batch 17E - the ffmpeg recipe for "the card with the voice as its sound". Pure function, no timestamps, nothing random:
// the same card and voice always give the same bytes (checked in docs/review/batch17e/evidence).
// Every setting and why: docs/review/batch17e/DECISIONS.md.
export const VIDEO_SPEC = Object.freeze({
  fps: 2,               // a still picture: 2 frames a second is plenty and keeps the file small
  crf: 30,              // quality/size trade-off for flat graphics (x264 scale 0-51, lower = better)
  preset: 'medium',
  gop: 60,              // a keyframe every 30 s at 2 fps (frame 0 is always a keyframe)
  audioBitrate: '64k',  // mono speech
  audioRate: 44100,
})

// The measured (decoded) length of the voice, rounded UP to the next 0.05 s (so by at most 0.05 s) -> seconds for `-t`; null if unusable.
export function videoSeconds(decoded) {
  const x = Number(decoded)
  if (!Number.isFinite(x) || x <= 0) return null
  return Math.round(Math.ceil(x * 20 - 1e-9) / 20 * 100) / 100
}

// -> array of ffmpeg arguments. card = PNG path, audio = MP3 path, out = MP4 path (always the LAST argument).
// seconds (from videoSeconds) = the explicit length of the video: `-t` is an output option, so the video can never outrun the voice.
// With -t the `-shortest` flag is LEFT OUT: it is what failed (17E fix, run #14: a 64.5 s video for a 34.7 s voice on ffmpeg 8.0.1), and
// combined with -t it even cut the audio short on ffmpeg 6.0 (26 s of 34.7 s). The voice ends by itself, at or just before -t.
// Without seconds (old callers) the recipe is the old one, with -shortest.
// strict = the second attempt: the looped card is ALSO limited at its input (-t before -i card).
export function buildFfmpegArgs({ card, audio, out, seconds = null, strict = false }) {
  const v = VIDEO_SPEC
  const sec = Number.isFinite(seconds) && seconds > 0 ? String(seconds) : null
  return [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', String(v.fps), ...(sec && strict ? ['-t', sec] : []), '-loop', '1', '-i', card,
    '-i', audio,
    '-map', '0:v:0', '-map', '1:a:0',
    // even width/height (a no-op for the 1080x1350 card), BT.709 limited range, 4:2:0 for every phone decoder
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', v.preset, '-tune', 'stillimage', '-crf', String(v.crf), '-g', String(v.gop), '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', v.audioBitrate, '-ac', '1', '-ar', String(v.audioRate),
    ...(sec ? ['-t', sec] : ['-shortest']),
    '-movflags', '+faststart',
    '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact', '-flags:a', '+bitexact',
    out,
  ]
}
