import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/ui'

// Temporary stand-in for screens built in later phases (browse/post/my).
export default function Placeholder({ title }) {
  const navigate = useNavigate()
  return (
    <Screen title={title} onBack={() => navigate('/home')}>
      <p className="py-12 text-center text-stone-500">जल्द आ रहा है · Coming soon</p>
    </Screen>
  )
}
