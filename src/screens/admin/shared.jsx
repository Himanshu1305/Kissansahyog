export function vendorKeyDetail(d = {}) {
  return d.business_name || d.operator_name || d.item_name || d.warehouse_type || d.residue_type || d.crop_type || d.item_name || '—'
}

// Phase 4 — resource/booking dashboard: per-category availability counts + a
// category-filterable table of every active listing's availability status.
