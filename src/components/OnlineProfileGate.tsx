import { ui } from '../content/ui'
import { useGame } from '../store/GameStore'
import { useOnline } from '../store/OnlineStore'
import { OnlineProfileForm } from './OnlineProfileForm'

export function OnlineProfileGate() {
  const { progress } = useGame()
  const { configured, status, profile } = useOnline()
  const copy = ui(progress.language)
  if (!configured || status !== 'ready' || profile) return null
  return <div className="modal-backdrop profile-gate-backdrop" role="dialog" aria-modal="true" aria-label={copy.createProfile}>
    <div className="online-profile-modal"><OnlineProfileForm /></div>
  </div>
}
