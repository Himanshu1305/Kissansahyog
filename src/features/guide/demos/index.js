// The scripted (phone) demos. The tour is TourExplorer.jsx, not a script.
import register from './register.js'
import post from './post.js'
import find from './find.js'

export const DEMOS = { register, post, find }
export const getDemo = (id) => DEMOS[id] || null
