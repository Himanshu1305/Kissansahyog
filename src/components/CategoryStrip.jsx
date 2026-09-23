// Single-row, horizontally-scrollable category selector (compact chips) — used on
// the homepage and the browse screen. Replaces the old 2-row tab grid. All chips
// stay on one line; the row scrolls sideways on mobile.
export default function CategoryStrip({ items, active, onSelect }) {
  return (
    <div className="-mx-2 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2 py-1">
        {items.map((it) => {
          const on = active === it.key
          return (
            <button
              key={it.key}
              type="button"
              data-testid={`chip-${it.key}`}
              onClick={() => onSelect(it.key)}
              className={`flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] ${
                on ? 'border-[var(--ks-primary)] bg-[var(--ks-primary)] font-bold text-white shadow-[0_2px_6px_rgba(45,90,27,0.25)]' : 'border-[var(--ks-border)] bg-[var(--ks-bg-card)] font-semibold text-[var(--ks-text-secondary)]'
              }`}
            >
              {it.icon && <span className="text-base leading-none" aria-hidden="true">{it.icon}</span>}
              <span>{it.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
