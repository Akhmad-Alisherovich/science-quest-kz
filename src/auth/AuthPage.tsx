import { useEffect, useState, type FormEvent } from 'react'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { authCopy } from '../content/auth'
import { useAuth } from '../store/AuthStore'
import { useGame } from '../store/GameStore'

type AuthTab = 'login' | 'register'
export type AuthView = AuthTab | 'forgot'

export function AuthPage({ onBack, initialView = 'login' }: { onBack?: () => void; initialView?: AuthView }) {
  const { progress } = useGame()
  const auth = useAuth()
  const copy = authCopy(progress.language)
  const [tab, setTab] = useState<AuthTab>(initialView === 'register' ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [recovery, setRecovery] = useState(initialView === 'forgot')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setTab(initialView === 'register' ? 'register' : 'login')
    setRecovery(initialView === 'forgot')
  }, [initialView])

  const fail = (reason?: unknown) => {
    const details = typeof reason === 'object' && reason !== null ? reason as { message?: unknown; code?: unknown } : null
    const rawMessage = typeof details?.message === 'string' ? details.message : ''
    const rawCode = typeof details?.code === 'string' ? details.code : ''
    const value = rawMessage.toLowerCase()
    if (value.includes('registration_session_missing')) {
      setError(copy.signupSessionMissing)
      return
    }
    if (tab === 'register' && !recovery && rawMessage) {
      setError(rawCode ? `${rawMessage} (${rawCode})` : rawMessage)
      return
    }
    setError(
      value.includes('invalid login') ? copy.invalidCredentials
        : value.includes('already registered') || value.includes('already exists') || value.includes('user_already_registered') ? copy.alreadyRegistered
          : value.includes('invalid email') ? copy.invalidEmail
            : value.includes('weak password') || value.includes('password should') || value.includes('password is too') ? copy.weakPassword
              : value.includes('rate limit') || value.includes('too many') ? copy.rateLimited
                : value.includes('failed to fetch') || value.includes('network') || value.includes('load failed') ? copy.networkError
                  : value.includes('phone_invalid') ? copy.invalidPhone
                    : copy.genericError,
    )
  }
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('')
    if (!validEmail) { setError(copy.invalidEmail); return }
    if (recovery) {
      setBusy(true)
      try { await auth.recoverEmail(email); setMessage(copy.linkSent) } catch (reason) { fail(reason) } finally { setBusy(false) }
      return
    }
    if (tab === 'register' && !phone.trim()) { setError(copy.phoneRequired); return }
    if (tab === 'register' && !/^\+[1-9]\d{7,14}$/.test(phone.replace(/[\s()-]/g, ''))) { setError(copy.invalidPhone); return }
    if (password.length < 8) { setError(copy.passwordShort); return }
    if (tab === 'register' && password !== repeat) { setError(copy.passwordMismatch); return }
    setBusy(true)
    try {
      if (tab === 'login') await auth.loginEmail(email, password)
      else await auth.registerEmail(email, password, phone)
    } catch (reason) { fail(reason) } finally { setBusy(false) }
  }

  const saveNewPassword = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (password.length < 8) { setError(copy.passwordShort); return }
    if (password !== repeat) { setError(copy.passwordMismatch); return }
    setBusy(true)
    try { await auth.finishPasswordSetup(password) } catch (reason) { fail(reason) } finally { setBusy(false) }
  }

  if (auth.needsPasswordSetup && auth.user && !auth.isAnonymous) return <AuthShell onBack={onBack}>
    <form className="auth-form" onSubmit={saveNewPassword}><h2>{copy.setPassword}</h2><p>{copy.setPasswordHelp}</p><PasswordFields copy={copy} password={password} repeat={repeat} show={showPassword} setPassword={setPassword} setRepeat={setRepeat} setShow={setShowPassword} />{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? '…' : copy.savePassword}</button></form>
  </AuthShell>

  return <AuthShell onBack={onBack}>
    {auth.isAnonymous && <div className="auth-preserve-note">🔗 {copy.guestPreserved}</div>}
    <div className="auth-tabs" role="tablist"><button className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setRecovery(false) }}>{copy.login}</button><button className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setRecovery(false) }}>{copy.register}</button></div>
    <form className="auth-form" onSubmit={submitEmail}>
      <h2>{recovery ? copy.recovery : tab === 'login' ? copy.login : copy.register}</h2>{recovery && <p>{copy.recoveryHelp}</p>}
      <label>{copy.email}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      {tab === 'register' && !recovery && <label>{copy.phone}<input type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 700 123 45 67" value={phone} onChange={(event) => setPhone(event.target.value)} required /><small>{copy.phoneHint}</small></label>}
      {!recovery && <PasswordFields copy={copy} password={password} repeat={repeat} show={showPassword} setPassword={setPassword} setRepeat={setRepeat} setShow={setShowPassword} hideRepeat={tab === 'login'} />}
      {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success">{message}</p>}
      <button className="primary-button" disabled={busy}>{busy ? tab === 'login' ? copy.loggingIn : copy.registering : recovery ? copy.sendLink : tab === 'login' ? copy.loginAction : copy.registerAction}</button>
      {tab === 'login' && <button type="button" className="auth-text-button" onClick={() => setRecovery((value) => !value)}>{recovery ? copy.login : copy.forgot}</button>}
    </form>
  </AuthShell>
}

function AuthShell({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) {
  const { progress } = useGame(); const copy = authCopy(progress.language)
  return <main className="auth-page"><div className="auth-orbit" aria-hidden="true" /><nav><LanguageSwitch />{onBack && <button className="secondary-button compact" onClick={onBack}>← {copy.backLanding}</button>}</nav><section className="auth-panel"><header><span>⚛</span><div><small>SCIENCE QUEST KZ</small><h1>{copy.welcome}</h1><p>{copy.subtitle}</p></div></header>{children}</section></main>
}

function PasswordFields({ copy, password, repeat, show, setPassword, setRepeat, setShow, hideRepeat = false }: { copy: ReturnType<typeof authCopy>; password: string; repeat: string; show: boolean; setPassword: (value: string) => void; setRepeat: (value: string) => void; setShow: (value: boolean) => void; hideRepeat?: boolean }) {
  return <><label>{copy.password}<span className="password-input"><input type={show ? 'text' : 'password'} autoComplete={hideRepeat ? 'current-password' : 'new-password'} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShow(!show)} aria-label={show ? copy.hidePassword : copy.showPassword}>{show ? '🙈' : '👁'}</button></span></label>{!hideRepeat && <label>{copy.repeatPassword}<input type={show ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={repeat} onChange={(event) => setRepeat(event.target.value)} required /></label>}</>
}
