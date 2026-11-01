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

// -> array of ffmpeg arguments. card = PNG path, audio = MP3 path, out = MP4 path (always the LAST argument).
export function buildFfmpegArgs({ card, audio, out }) {
  const v = VIDEO_SPEC
  return [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', String(v.fps), '-loop', '1', '-i', card,
    '-i', audio,
    '-map', '0:v:0', '-map', '1:a:0',
    // even width/height (a no-op for the 1080x1350 card), BT.709 limited range, 4:2:0 for every phone decoder
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', v.preset, '-tune', 'stillimage', '-crf', String(v.crf), '-g', String(v.gop), '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', v.audioBitrate, '-ac', '1', '-ar', String(v.audioRate),
    '-shortest',
    '-movflags', '+faststart',
    '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact', '-flags:a', '+bitexact',
    out,
  ]
}
