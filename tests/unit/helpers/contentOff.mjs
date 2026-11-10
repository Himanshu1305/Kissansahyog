// Batch 21: the Batch 16-18 tests prove the OLD post, byte for byte. Importing this first runs the generator with MORNING_CONTENT=off
// (the kill switch), so they keep proving exactly that. The new behaviour is tested in morning-21-*.test.mjs.
process.env.MORNING_CONTENT = 'off'
