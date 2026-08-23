import { useGame } from '../store/GameStore'

export function LanguageSwitch() {
  const { progress, setLanguage } = useGame()
  return <div className="language-switch" role="group" aria-label="Language">
    <button className={progress.language === 'kk' ? 'active' : ''} onClick={() => setLanguage('kk')}>ҚАЗ</button>
    <button className={progress.language === 'ru' ? 'active' : ''} onClick={() => setLanguage('ru')}>РУС</button>
  </div>
}
