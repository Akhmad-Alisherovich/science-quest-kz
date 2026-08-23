import { useEffect, useState, type FormEvent } from 'react'
import { ui } from '../content/ui'
import { validateNickname } from '../services/leaderboardService'
import { useGame } from '../store/GameStore'
import { useOnline } from '../store/OnlineStore'
import { scienceAvatars, type ScienceAvatar } from '../types/leaderboard'
import { authCopy } from '../content/auth'
import { formatPhone, isValidPhone, normalizePhone } from '../services/privateContactService'
import { AvatarUploader } from './AvatarUploader'
import { AvatarImage } from './AvatarImage'

export function OnlineProfileForm({ onSaved }: { onSaved?: () => void }) {
  const { progress } = useGame()
  const { profile, phone: savedPhone, saveProfile } = useOnline()
  const copy = ui(progress.language)
  const contactCopy = authCopy(progress.language)
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [displayName, setDisplayName] = useState(profile?.displayName ?? progress.name)
  const [grade, setGrade] = useState(profile?.grade ? String(profile.grade) : '')
  const [school, setSchool] = useState(profile?.school ?? '')
  const [avatar, setAvatar] = useState<ScienceAvatar>(profile?.avatar ?? '🧑‍🔬')
  const [avatarPath, setAvatarPath] = useState<string | null>(profile?.avatarPath ?? null)
  const [avatarRevision, setAvatarRevision] = useState(() => Date.now())
  const [showGrade, setShowGrade] = useState(profile?.showGrade ?? false)
  const [phone, setPhone] = useState(savedPhone ? formatPhone(savedPhone) : '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!profile) return
    setNickname(profile.nickname); setDisplayName(profile.displayName); setGrade(profile.grade ? String(profile.grade) : '')
    setSchool(profile.school ?? ''); setAvatar(profile.avatar); setAvatarPath(profile.avatarPath); setShowGrade(profile.showGrade)
  }, [profile])

  useEffect(() => {
    if (savedPhone) setPhone(formatPhone(savedPhone))
  }, [savedPhone])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validateNickname(nickname)) { setMessage(copy.nicknameInvalid); return }
    if (!phone.trim()) { setMessage(contactCopy.phoneRequired); return }
    if (!isValidPhone(phone)) { setMessage(contactCopy.invalidPhone); return }
    setSaving(true); setMessage('')
    try {
      await saveProfile({ nickname, displayName: displayName.trim() || progress.name, grade: grade ? Number(grade) : null, school: school || null, avatar, avatarPath, showGrade, phone: normalizePhone(phone) })
      setMessage(copy.profileSaved)
      onSaved?.()
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setMessage(code === 'NICKNAME_TAKEN' ? copy.nicknameTaken : code === 'NICKNAME_INVALID' ? copy.nicknameInvalid : navigator.onLine ? copy.backendUnavailable : copy.leaderboardUnavailable)
    } finally { setSaving(false) }
  }

  return <form className="online-profile-form" onSubmit={submit}>
    <div className="profile-form-heading"><span>🌐</span><div><h2>{copy.onlineProfile}</h2><p>{copy.leaderboardPrivacy}</p></div></div>
    <label>{copy.nickname}<input value={nickname} minLength={3} maxLength={20} required autoComplete="off" spellCheck={false} onChange={(event) => setNickname(event.target.value)} aria-invalid={nickname.length > 0 && !validateNickname(nickname)} /></label>
    <label>{copy.displayName}<input value={displayName} maxLength={40} onChange={(event) => setDisplayName(event.target.value)} /></label>
    <label>{contactCopy.phone}<input type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 700 123 45 67" value={phone} required onChange={(event) => setPhone(event.target.value)} /><small>{contactCopy.phoneHint}</small></label>
    <fieldset className="avatar-picker avatar-picker-extended"><legend>{copy.avatar}</legend><div className="avatar-current-preview"><AvatarImage value={avatarPath ? `${avatarPath}?v=${avatarRevision}` : avatar} label={progress.language === 'kk' ? 'Таңдалған аватар' : 'Выбранный аватар'} /><span>{avatarPath ? (progress.language === 'kk' ? 'Жеке фотосурет' : 'Личная фотография') : (progress.language === 'kk' ? 'Ғылыми аватар' : 'Научный аватар')}</span></div><div className="science-avatar-options">{scienceAvatars.map((item) => <button type="button" key={item} className={!avatarPath && avatar === item ? 'selected' : ''} onClick={() => { setAvatar(item); setAvatarPath(null) }} aria-pressed={!avatarPath && avatar === item}>{item}</button>)}</div><AvatarUploader onUploaded={(path) => { setAvatarPath(path); setAvatarRevision(Date.now()); setMessage('') }} /></fieldset>
    <div className="profile-form-row">
      <label>{copy.grade}<select value={grade} required onChange={(event) => setGrade(event.target.value)}><option value="">—</option>{[5, 6].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>{copy.schoolOptional}<input value={school} maxLength={120} onChange={(event) => setSchool(event.target.value)} /></label>
    </div>
    <label className="profile-checkbox"><input type="checkbox" checked={showGrade} onChange={(event) => setShowGrade(event.target.checked)} />{copy.showGrade}</label>
    {message && <p className={message === copy.profileSaved ? 'form-message success' : 'form-message'} role="status">{message}</p>}
    <button className="primary-button" disabled={saving} type="submit">{saving ? '…' : profile ? copy.updateProfile : copy.createProfile}</button>
  </form>
}
