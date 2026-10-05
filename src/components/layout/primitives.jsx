// V2 central layout primitives (Phase 2). All spacing/measure comes from
// src/styles/tokens.css — defined once, consumed everywhere.

// Full-bleed section: spans the viewport width; its inner wrapper pads + centres
// to --wide-max. Use `tone` for a background band.
export function Section({ children, tone, className = '', innerClassName = '', as: Tag = 'section', ...rest }) {
  const bg = tone ? { background: tone } : undefined
  return (
    <Tag className={`ks-section ${className}`} style={bg} {...rest}>
      <div className={`ks-section-inner ${innerClassName}`}>{children}</div>
    </Tag>
  )
}

// Readable column (~70ch) for long text and forms.
export function ContentColumn({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`ks-content ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

// Responsive grid. `cols` is the desktop column count (2–4). Mobile is 2 cols by
// default (1 for land / long cards via `mobileCols=1`).
export function Grid({ children, cols = 3, mobileCols = 2, gap = 'gap-3', className = '' }) {
  const m = mobileCols === 1 ? 'grid-cols-1' : 'grid-cols-2'
  const d = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }[cols] || 'md:grid-cols-3'
  return <div className={`grid ${m} ${d} ${gap} ${className}`}>{children}</div>
}
