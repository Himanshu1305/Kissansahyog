import { Field, TextInput } from './ui'

// Phase 5 — the किसान-profile field set, shared by Signup (optional, at registration) and
// Profile (editable later). All fields optional. `setK(key)` returns an onChange handler
// (handles both text inputs and checkboxes).
export default function KisanFields({ kisan, setK, t }) {
  return (
    <>
      <Field label={t('kisan_land_acres')} htmlFor="k_land" hint={t('optional')}>
        <TextInput id="k_land" inputMode="decimal" value={kisan.land_acres ?? ''} onChange={setK('land_acres')} placeholder="0" />
      </Field>
      <Field label={t('kisan_main_crops')} htmlFor="k_crops" hint={t('optional')}>
        <TextInput id="k_crops" value={kisan.main_crops ?? ''} onChange={setK('main_crops')} placeholder={t('kisan_main_crops_ph')} />
      </Field>
      <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-200 bg-white p-3">
        <input type="checkbox" checked={!!kisan.interest_lease} onChange={setK('interest_lease')} data-testid="k-interest-lease" className="mt-0.5 h-5 w-5 shrink-0 accent-green-700" />
        <span className="text-sm text-stone-800">{t('kisan_interest_lease')}</span>
      </label>
      <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-200 bg-white p-3">
        <input type="checkbox" checked={!!kisan.interest_equipment} onChange={setK('interest_equipment')} data-testid="k-interest-equipment" className="mt-0.5 h-5 w-5 shrink-0 accent-green-700" />
        <span className="text-sm text-stone-800">{t('kisan_interest_equipment')}</span>
      </label>
      {/* Phase 13 — WhatsApp consent (unchecked by default) + optional preferred mandi. */}
      <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-200 bg-white p-3">
        <input type="checkbox" checked={!!kisan.whatsapp_opt_in} onChange={setK('whatsapp_opt_in')} data-testid="k-whatsapp-optin" className="mt-0.5 h-5 w-5 shrink-0 accent-green-700" />
        <span className="text-sm text-stone-800">{t('wa_consent_label')}</span>
      </label>
      {kisan.whatsapp_opt_in && (
        <Field label={t('wa_pref_mandi')} htmlFor="k_mandi" hint={t('optional')}>
          <TextInput id="k_mandi" value={kisan.preferred_mandi ?? ''} onChange={setK('preferred_mandi')} />
        </Field>
      )}
    </>
  )
}
