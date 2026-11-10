// Batch 21: the Batch 16-18 tests prove the OLD post, byte for byte. Importing this first runs the generator with MORNING_CONTENT=off
// (the kill switch), so they keep proving exactly that. The new behaviour is tested in morning-21-*.test.mjs.
process.env.MORNING_CONTENT = 'off'
// Batch 21D: the Batch 16-18 regression tests prove the OLD post against the data as it was before the founder approved the Batch 21 content
// (approved gyaan, kahawat and schemes would legitimately change an old-style post). They load this snapshot instead of data/morning.
export const OLD_DATA_DIR = new URL('../fixtures/morning-data-pre-approval/', import.meta.url)
