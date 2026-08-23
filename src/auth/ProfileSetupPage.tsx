import { LanguageSwitch } from '../components/LanguageSwitch'
import { OnlineProfileForm } from '../components/OnlineProfileForm'
import { authCopy } from '../content/auth'
import { useGame } from '../store/GameStore'

export function ProfileSetupPage() {
  const { progress } = useGame(); const copy = authCopy(progress.language)
  return <main className="profile-setup-page"><nav><LanguageSwitch /></nav><section><header><span>🧑‍🔬</span><div><small>SCIENCE QUEST KZ</small><h1>{copy.profileTitle}</h1><p>{copy.profileHelp}</p></div></header><OnlineProfileForm /></section></main>
}
