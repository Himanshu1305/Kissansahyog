// Renders one demo screen (descriptor nodes → a light, app-like mock). No state of its own:
// DemoPlayer passes the engine state, the typing / flash / target ids, and onTap.
// The mock is always light (the app has one light theme) and is not a real form: nothing
// in here is an input, so typing on a phone keyboard never opens.

// Text value → string (see engine.js: key | {raw} | {hi,en} | array).
export function makeTxt(t, lang) {
  const txt = (v) => {
    if (v == null) return ''
    if (Array.isArray(v)) return v.map(txt).join('')
    if (typeof v === 'string') return t(v)
    if (v.raw !== undefined) return String(v.raw)
    return v[lang] ?? v.hi ?? ''
  }
  return txt
}

export default function MockScreen({ demo, state, txt, t, typing, flashId, targetId, onTap }) {
  const screen = demo.screens.find((s) => s.id === state.screen) || demo.screens[0]
  const show = (n) => !(n.id && state.hidden[n.id])

  // Shared attributes for anything a step can point at.
  const at = (id, cls, extra = {}) => {
    const isTarget = id && id === targetId
    const p = { className: `${cls}${id && id === flashId ? ' ksg-flash' : ''}${isTarget ? ' ksg-target' : ''}`, ...extra }
    if (id) p['data-node'] = id
    if (isTarget) {
      p['data-testid'] = 'demo-target'
      p.tabIndex = 0
      p.role = 'button'
      p.onKeyDown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap?.(id) } }
    }
    return p
  }
  const otpAttr = (n) => (n.otp ? { 'data-otp': '1' } : {})
  const sample = <span className="ksg-m-sample">{t('guide_sample')}</span>

  function fieldValue(n) {
    if (typing && typing.id === n.id) return <span className="ksg-m-val ksg-typing">{typing.text}</span>
    const v = state.values[n.id]
    if (v !== undefined) return <span className="ksg-m-val">{txt(v)}{n.sample && sample}</span>
    return <span className="ksg-m-ph">{txt(n.ph)}</span>
  }

  function node(n, key) {
    if (!show(n)) return null
    const o = otpAttr(n)
    switch (n.type) {
      case 'pill':
        return <p key={key} {...o} className="ksg-m-pill">{txt(n.text)}</p>
      case 'h':
        return (
          <p key={key} {...o} {...at(n.id, `ksg-m-h${n.big ? ' ksg-m-h-big' : ''}${n.small ? ' ksg-m-h-small' : ''}`)}>
            {txt(n.text)}
            {n.pills && n.pills.map((p, i) => <span key={i} className="ksg-m-tag">{txt(p)}</span>)}
          </p>
        )
      case 'p':
        return <p key={key} {...o} {...at(n.id, `ksg-m-p${n.tone === 'ok' ? ' ksg-m-ok' : ''}`)}>{txt(n.text)}</p>
      case 'field': {
        const filled = state.values[n.id] !== undefined || (typing && typing.id === n.id)
        return (
          <div key={key} {...o} className={`ksg-m-field${n.boxed ? ' ksg-m-boxed' : ''}`}>
            <span className="ksg-m-lbl">{txt(n.label)}{n.req && <span className="ksg-m-req"> *</span>}</span>
            <div className="ksg-m-inrow">
              <div {...at(n.id, `ksg-m-in${filled ? ' ksg-m-filled' : ''}${typing && typing.id === n.id ? ' ksg-m-typing' : ''}`)}>
                {fieldValue(n)}
                {n.select && <span className="ksg-m-caret" aria-hidden="true">▾</span>}
              </div>
              {n.button && <span className={`ksg-m-inbtn${n.buttonStyle === 'outline' ? ' ksg-m-inbtn-o' : ''}`}>{txt(n.button)}</span>}
            </div>
            {n.hint && <span className="ksg-m-hint">{txt(n.hint)}</span>}
          </div>
        )
      }
      case 'row':
        return <div key={key} className="ksg-m-row">{n.children.map((c, i) => node(c, i))}</div>
      case 'tiles':
      case 'chips':
        return (
          <div key={key} {...o} {...at(n.id, n.type === 'tiles' ? 'ksg-m-tilesw' : 'ksg-m-chipsw')}>
            {n.label && <span className="ksg-m-lbl">{txt(n.label)}</span>}
            <div className={n.type === 'tiles' ? 'ksg-m-tiles' : 'ksg-m-chips'}>
              {n.items.map((it) => {
                const on = !!state.sel[it.id]
                return (
                  <span key={it.id} {...at(it.id, `${n.type === 'tiles' ? 'ksg-m-tile' : `ksg-m-chip${n.big ? ' ksg-m-chip-big' : ''}`}${on ? ' ksg-m-sel' : ''}`)}>
                    {on && n.type === 'chips' && n.big && <span aria-hidden="true">✓ </span>}
                    {txt(it.text)}
                    {on && n.type === 'tiles' && <span aria-hidden="true"> ✓</span>}
                  </span>
                )
              })}
            </div>
          </div>
        )
      case 'check':
        return (
          <div key={key} {...o} {...at(n.id, `ksg-m-check${n.box ? ' ksg-m-check-box' : ''}${n.tone === 'warn' ? ' ksg-m-check-warn' : ''}`)}>
            <span className={`ksg-m-box${state.checked[n.id] ? ' ksg-m-box-on' : ''}`} aria-hidden="true" />
            <span>{txt(n.text)}</span>
          </div>
        )
      case 'checks':
        return (
          <div key={key} {...o} {...at(n.id, 'ksg-m-checks')}>
            <span className="ksg-m-legend">{txt(n.label)}</span>
            {n.children.map((c, i) => node(c, i))}
          </div>
        )
      case 'banner':
        return (
          <div key={key} {...o} {...at(n.id, 'ksg-m-banner')}>
            <b>⚠️ {n.copy.hi}</b>
            <span>{n.copy.en}</span>
          </div>
        )
      case 'button':
        return <div key={key} {...o} {...at(n.id, `ksg-m-btn ksg-m-btn-${n.variant || 'primary'}${n.small ? ' ksg-m-btn-sm' : ''}`)}>{txt(n.text)}</div>
      case 'buttons':
        return <div key={key} className="ksg-m-btns">{n.children.map((c, i) => node(c, i))}</div>
      case 'card':
        return (
          <div key={key} {...o} {...at(n.id, 'ksg-m-card')}>
            <div className="ksg-m-cardtop">
              {(n.pills || []).map((p, i) => <span key={i} className="ksg-m-tag">{txt(p)}</span>)}
              {sample}
            </div>
            <b className="ksg-m-cardtitle">{txt(n.title)}</b>
            <span className="ksg-m-cardline">{txt(n.line)}</span>
            <span className="ksg-m-cardline">{txt(n.place)}</span>
            {n.contact && (
              <span className="ksg-m-btns ksg-m-btns-sm">
                <span className="ksg-m-btn ksg-m-btn-primary ksg-m-btn-xs">📞 {t('contact_call')}</span>
                <span className="ksg-m-btn ksg-m-btn-wa ksg-m-btn-xs">{t('contact_whatsapp')}</span>
              </span>
            )}
          </div>
        )
      case 'kv':
        return (
          <div key={key} {...o} {...at(n.id, 'ksg-m-kv')}>
            {n.rows.map((r, i) => (
              <div key={i} className="ksg-m-kvrow"><span>{txt(r[0])}</span><b>{txt(r[1])}</b></div>
            ))}
          </div>
        )
      case 'list':
        return (
          <div key={key} {...o} className="ksg-m-list">
            {n.items.map((it) => (
              <span key={it.id} {...at(it.id, 'ksg-m-listitem')}><b>{txt(it.text)}</b><span>{txt(it.aside)}</span></span>
            ))}
          </div>
        )
      case 'chosen':
        return (
          <div key={key} {...o} {...at(n.id, `ksg-m-field${n.small ? ' ksg-m-chosen-sm' : ''}`)}>
            {n.label && <span className="ksg-m-lbl">{txt(n.label)}<span className="ksg-m-req"> *</span></span>}
            <div className="ksg-m-chosen"><span>{txt(n.text)}</span><u>{txt(n.action)}</u></div>
          </div>
        )
      case 'big':
        return <p key={key} {...o} {...at(n.id, 'ksg-m-big')}>{txt(n.text)}{n.sample && sample}</p>
      case 'done':
        return (
          <div key={key} className="ksg-m-done">
            <span className="ksg-m-tick" aria-hidden="true">
              <svg viewBox="0 0 48 48"><path d="M10 25l9 9 19-20" /></svg>
            </span>
            <b>{txt(n.title)}</b>
            <span>{txt(n.text)}</span>
          </div>
        )
      default:
        return null
    }
  }

  const body = screen.nodes.map((n, i) => node(n, i))
  return (
    <div
      className={`ksg-app${screen.sheet ? ' ksg-app-sheet' : ''}`}
      onClick={(e) => {
        const el = e.target.closest?.('[data-node]')
        if (el) onTap?.(el.getAttribute('data-node'))
      }}
    >
      <div className="ksg-m-top"><span aria-hidden="true">‹</span><b>{txt(screen.title)}</b></div>
      {screen.sheet ? <div className="ksg-m-sheet">{body}</div> : <div className="ksg-m-body">{body}</div>}
    </div>
  )
}
