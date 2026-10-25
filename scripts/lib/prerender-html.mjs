// Batch 10E (B17): post-processing of the HTML that scripts/prerender.mjs serializes.
//
// Vite's preload helper resolves chunk URLs against the page origin, so while the prerender
// browser runs at http://localhost:4178 the live DOM holds
//   <link rel="modulepreload" href="http://localhost:4178/assets/x.js">  (and rel="stylesheet").
// rootRelativeAssetLinks() rewrites ONLY the href/src attribute values of <link> and <script>
// tags whose URL starts with a local origin (localhost / 127.0.0.1, any port) back to a
// root-relative "/assets/…" path, and then removes a <link> that exactly repeats an earlier
// <link> (same rel + same href). Body text, <a href>, <img src> and everything else is untouched.

const LOCAL_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?=\/)/i
const TAG = /<(link|script)\b[^>]*>/gi
const URL_ATTR = /(\s(?:href|src)=)(["'])([^"']*)\2/gi
const attr = (tag, name) => new RegExp(`\\s${name}=(["'])([^"']*)\\1`, 'i').exec(tag)?.[2] ?? ''

export function rootRelativeAssetLinks(html) {
  const seen = new Set()
  return html.replace(TAG, (tag, name) => {
    const out = tag.replace(URL_ATTR, (m, pre, q, url) => `${pre}${q}${url.replace(LOCAL_ORIGIN, '')}${q}`)
    if (name.toLowerCase() !== 'link') return out
    const rel = attr(out, 'rel').toLowerCase()
    const href = attr(out, 'href')
    if (!href || !/^(modulepreload|preload|stylesheet)$/.test(rel)) return out
    const key = `${rel} ${href}`
    if (seen.has(key)) return ''
    seen.add(key)
    return out
  })
}
