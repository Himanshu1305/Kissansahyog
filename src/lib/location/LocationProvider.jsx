// Batch 7L-1 — one shared location for the whole app (see userLocation.js for the shape).
// Resolution order:
//   (a) the device position, if the visitor shares it;
//   (b) else the location saved on this device, else the coordinates the logged-in profile
//       already carries;
//   (c–e) else nothing: the LocationControl asks (type a village → "Did you mean…?" → picker).
// There is never a silent default place — `location` is null until one of the above happens.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { reverseGeocode } from './locationStore'
import { fetchPlaces, nearestPlace, placeName } from './places'
import {
  makeLocation, toCenter, saveLocation, loadSavedLocation, profileLocation,
  isShareDeclined, setShareDeclined, geolocationSupported, geoPermissionState, getDevicePosition,
  clearSavedLocation, isLocationCleared,
} from './userLocation'

const Ctx = createContext(null)

// A device fix closer than this to a listed place is named after that place.
const NAME_WITHIN_KM = 12

export function LocationProvider({ children }) {
  const { user } = useAuth()
  const [location, setLoc] = useState(() => loadSavedLocation())
  const [places, setPlaces] = useState([])
  const [declined, setDeclined] = useState(() => isShareDeclined())
  const [permission, setPermission] = useState('unknown') // granted | denied | prompt | unknown
  const [detecting, setDetecting] = useState(false)
  const placesRef = useRef([])
  // Language used to NAME a place when no component passed one (the automatic fix on load).
  const langRef = useRef((() => { try { return localStorage.getItem('ks_lang_v1') === 'en' ? 'en' : 'hi' } catch { return 'hi' } })())

  useEffect(() => {
    let alive = true
    fetchPlaces().then((p) => { if (alive) { placesRef.current = p; setPlaces(p) } }).catch(() => {})
    return () => { alive = false }
  }, [])

  // (b) — nothing saved on this device: use the coordinates the profile already has.
  useEffect(() => {
    if (location || isLocationCleared()) return
    const p = profileLocation(user)
    if (!p) return
    const near = p.label ? null : nearestPlace(p.lat, p.lng, placesRef.current)
    setLoc({ ...p, label: p.label || (near && near.km <= NAME_WITHIN_KM ? placeName(near.place, langRef.current) : '') })
  }, [user, location, places])

  const setLocation = useCallback((loc) => {
    const clean = loc && makeLocation(loc.lat, loc.lng, loc.label, loc.source)
    if (!clean) return null
    saveLocation(clean)
    setLoc(clean)
    return clean
  }, [])

  // Ask the device. Resolves 'ok' | 'denied' | 'unavailable'. Calling this is what shows the
  // browser's own prompt, so the UI only calls it after "Share my location".
  const shareDevice = useCallback(async (lang = 'hi') => {
    langRef.current = lang
    setDetecting(true)
    try {
      const pos = await getDevicePosition()
      // The fix on load can arrive before the places list has: wait for the list (one cached
      // fetch) so a position near a listed place is named locally and is not sent to BigDataCloud.
      const list = placesRef.current.length ? placesRef.current : await fetchPlaces().catch(() => [])
      const near = nearestPlace(pos.lat, pos.lng, list)
      let label = near && near.km <= NAME_WITHIN_KM ? placeName(near.place, lang) : null
      if (!label) label = await reverseGeocode(pos.lat, pos.lng).catch(() => null)
      setShareDeclined(false); setDeclined(false); setPermission('granted')
      setLocation({ lat: pos.lat, lng: pos.lng, label: label || '', source: 'device' })
      return 'ok'
    } catch (e) {
      const why = e?.message === 'denied' ? 'denied' : 'unavailable'
      if (why === 'denied') setPermission('denied')
      return why
    } finally { setDetecting(false) }
  }, [setLocation])

  // "Clear my location": forget the place on this device and go back to the prompt card.
  const clearLocation = useCallback(() => {
    clearSavedLocation()
    setDeclined(false)
    setLoc(null)
  }, [])

  const declineShare = useCallback(() => { setShareDeclined(true); setDeclined(true) }, [])

  // (a) on load — only when the browser ALREADY has permission (so no prompt can appear) and
  // the visitor has not deliberately typed/picked a different place on this device.
  useEffect(() => {
    let alive = true
    geoPermissionState().then((state) => {
      if (!alive) return
      setPermission(state)
      const saved = loadSavedLocation()
      const deliberate = saved && (saved.from === 'typed' || saved.from === 'picked')
      if (state === 'granted' && !deliberate && !isShareDeclined() && !isLocationCleared()) shareDevice(langRef.current)
    })
    return () => { alive = false }
  }, [shareDevice])

  const value = useMemo(() => ({
    location,
    center: toCenter(location),
    places,
    setLocation,
    shareDevice,
    declineShare,
    clearLocation,
    detecting,
    // The pre-permission card is offered only when asking could still work.
    canAskDevice: geolocationSupported() && permission !== 'denied',
    declined,
  }), [location, places, setLocation, shareDevice, declineShare, clearLocation, detecting, permission, declined])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUserLocation() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUserLocation must be used within LocationProvider')
  return ctx
}
