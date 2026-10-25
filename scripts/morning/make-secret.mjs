// node scripts/morning/make-secret.mjs            (the FOUNDER runs this on his laptop; nobody else needs to)
// node scripts/morning/make-secret.mjs --selftest (checks the hashing with a dummy secret; prints no real secret)
//
// Makes a long random secret for the morning job and prints:
//   (1) the secret ONCE: paste it into the GitHub secret MORNING_POST_SECRET and keep a copy somewhere safe;
//   (2) the SQL that stores only its SHA-256 hash in the database (run it on production and on staging).
// The secret is never written to any file. The hash equals PostgreSQL: encode(sha256(convert_to(secret, 'utf8')), 'hex').
import { randomBytes, createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

export const makeSecret = () => randomBytes(48).toString('base64url')
export const hashOf = (secret) => createHash('sha256').update(Buffer.from(String(secret), 'utf8')).digest('hex')
export const sqlFor = (hash) => `insert into public.morning_post_secret(id, secret_sha256) values (true, '${hash}') on conflict (id) do update set secret_sha256 = excluded.secret_sha256;`

export function selfTest() {
  const problems = []
  // well-known SHA-256 test vectors (same bytes PostgreSQL hashes for convert_to(text, 'utf8'))
  if (hashOf('abc') !== 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') problems.push('sha256("abc") is wrong')
  if (hashOf('') !== 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') problems.push('sha256("") is wrong')
  const utf8 = hashOf('kéy')
  if (utf8 !== createHash('sha256').update(Buffer.from([0x6b, 0xc3, 0xa9, 0x79])).digest('hex')) problems.push('UTF-8 bytes are not hashed')
  const s = makeSecret()
  if (!/^[A-Za-z0-9_-]{64}$/.test(s)) problems.push('secret is not 48 random bytes in base64url (64 characters)')
  if (makeSecret() === s) problems.push('two secrets were equal')
  const dummy = 'DUMMY-SECRET-FOR-SELFTEST'
  const sql = sqlFor(hashOf(dummy))
  if (!sql.includes(hashOf(dummy)) || !/^insert into public\.morning_post_secret\(id, secret_sha256\) values \(true, '[0-9a-f]{64}'\) on conflict/.test(sql)) problems.push('SQL text is wrong')
  return problems
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--selftest')) {
    const p = selfTest()
    console.log(p.length ? `SELFTEST FAILED: ${p.join('; ')}` : 'selftest passed (hash matches SHA-256 of the UTF-8 bytes; secret is 48 random bytes)')
    process.exit(p.length ? 1 : 0)
  }
  const secret = makeSecret()
  console.log('\n1. YOUR SECRET (shown once, not saved anywhere). Paste it into the GitHub secret MORNING_POST_SECRET and keep a safe copy:\n')
  console.log(`   ${secret}\n`)
  console.log('2. Run this SQL in the Supabase SQL editor of PRODUCTION (address must contain eltmcznjcqiahqhjvpjg):\n')
  console.log(`   ${sqlFor(hashOf(secret))}\n`)
  console.log('3. Optionally the same SQL on STAGING (address contains wzxtqbqlahyahsnoqqva) if you want the job to work there too.\n')
  console.log('Never send the secret by email or chat. If it ever leaks, run this script again and replace it in both places.')
}
