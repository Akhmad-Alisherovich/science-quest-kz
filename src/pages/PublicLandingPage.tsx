import { LanguageSwitch } from '../components/LanguageSwitch'
import { publicLandingCopy } from '../content/publicLanding'
import { useGame } from '../store/GameStore'

interface PublicLandingPageProps {
  onLogin: () => void
  onRegister: () => void
}

export function PublicLandingPage({ onLogin, onRegister }: PublicLandingPageProps) {
  const { progress } = useGame()
  const copy = publicLandingCopy(progress.language)

  return <main className="public-landing">
    <div className="public-landing__stars" aria-hidden="true" />
    <header className="public-header">
      <button className="public-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="SCIENCE QUEST KZ">
        <span className="public-brand__mark" aria-hidden="true">⚛</span>
        <span>SCIENCE QUEST <b>KZ</b></span>
      </button>
      <div className="public-header__actions">
        <LanguageSwitch />
        <button className="public-button public-button--quiet public-header__login" onClick={onLogin}>{copy.login}</button>
        <button className="public-button public-button--small" onClick={onRegister}>{copy.register}</button>
      </div>
    </header>

    <section className="public-hero">
      <div className="public-hero__copy">
        <p className="public-eyebrow"><span aria-hidden="true">✦</span>{copy.eyebrow}</p>
        <h1><span>SCIENCE QUEST</span><strong>KZ</strong></h1>
        <h2>{copy.subtitle}</h2>
        <p className="public-description">{copy.description}</p>
        <div className="public-hero__actions">
          <button className="public-button public-button--primary" onClick={onRegister}><span>{copy.register}</span><b aria-hidden="true">→</b></button>
          <button className="public-button public-button--secondary" onClick={onLogin}>{copy.login}</button>
        </div>
      </div>

      <div className="science-orbit" role="img" aria-label={copy.visualLabel}>
        <div className="science-orbit__glow" />
        <div className="science-orbit__planet"><span>🌍</span><small>{copy.earth}</small></div>
        <div className="science-orbit__ring science-orbit__ring--one"><span className="science-node science-node--atom">⚛<small>{copy.atom}</small></span></div>
        <div className="science-orbit__ring science-orbit__ring--two"><span className="science-node science-node--plant">🌱<small>{copy.plant}</small></span></div>
        <div className="science-orbit__ring science-orbit__ring--three"><span className="science-node science-node--lab">⚗<small>{copy.lab}</small></span></div>
      </div>
    </section>

    <section className="public-features" aria-labelledby="public-features-title">
      <div className="public-section-heading"><span aria-hidden="true" /> <h2 id="public-features-title">{copy.featuresLabel}</h2><span aria-hidden="true" /></div>
      <div className="public-features__grid">
        {copy.features.map((feature) => <article className="public-feature" key={feature.title}>
          <span className="public-feature__icon" aria-hidden="true">{feature.icon}</span>
          <h3>{feature.title}</h3>
          <p>{feature.text}</p>
        </article>)}
      </div>
    </section>
  </main>
}
