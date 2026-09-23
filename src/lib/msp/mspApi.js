// Public read of MSP prices (RLS: is_active). Degrades to [] if the table is
// missing. Also exposes the mandi→MSP crop-name normalisation used by the
// MSP-vs-mandi comparison (mandi API commodity names differ from CACP names).
import { supabase } from '../supabaseClient'

export async function fetchMsp() {
  const { data, error } = await supabase
    .from('msp_prices')
    .select('*')
    .eq('is_active', true)
    .order('season', { ascending: true })
    .order('crop_en', { ascending: true })
  if (error) return []
  return data || []
}

// mandi_prices.commodity_en → msp_prices.crop_en (null = no MSP, skip comparison).
export const MANDI_TO_MSP = {
  Wheat: 'Wheat',
  Soyabean: 'Soyabean',
  Gram: 'Gram',
  Lentil: 'Masur (Lentil)',
  Moong: 'Moong',
  Urad: 'Urad',
  'Paddy(Dhan)(Common)': 'Paddy',
  Maize: 'Maize',
  Mustard: 'Rapeseed & Mustard',
  Garlic: null,
}

export const mspCropName = (row, lang) => (lang === 'hi' ? row.crop_hi : row.crop_en) + (row.variety ? ` (${row.variety})` : '')
