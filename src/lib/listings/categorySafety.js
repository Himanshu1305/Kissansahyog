// Framework-free so static verification can exercise the unknown-category path.
export function categoryOrNull(registry, category) {
  return registry[category] || null
}
