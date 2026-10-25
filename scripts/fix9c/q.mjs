// Batch 9C — read-only staging query helper: node --env-file=.env scripts/fix9c/q.mjs "select ..."
import { stagingSql } from '../fix9b/stagingSql.mjs'
const sql = process.argv[2]
if (!/^\s*(select|with)\b/i.test(sql)) { console.error('read-only: select/with only'); process.exit(2) }
console.log(JSON.stringify(await stagingSql(sql), null, 1))
