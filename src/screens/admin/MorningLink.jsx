import { Link } from 'react-router-dom'

// Batch 17B - the way into /admin/morning from the admin console. Shown on every tab, one tap, at least 48 px high.
// Rendered by Admin.jsx only after the is_admin check, so a non-admin never sees it.
export default function MorningLink({ t }) {
  return (
    <Link to="/admin/morning" data-testid="admin-morning-link" className="mb-3 flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl bg-green-700 px-4 py-2 text-base font-extrabold text-white no-underline hover:bg-green-800">
      <span>{t('adm_morning_link')}</span><span aria-hidden="true">→</span>
    </Link>
  )
}
