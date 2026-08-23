import { useLayoutEffect } from 'react'

const sampleWords = [
  'Ғылым әлемі',
  'Жаратылыстану',
  'Қоршаған орта',
  'Өсімдіктердің тіршілігі',
  'Тірі ағзалардың қасиеттері',
  'Жердің құрылысы',
  'Энергияның түрленуі',
  'Зерттеу жүргізу',
  'Тәжірибе нәтижесі',
]

const buttons = ['Ойынды бастау', 'Жалғастыру', 'Қайта орындау', 'Келесі тапсырма', 'Нәтижені көру']

export function TypographyTest() {
  useLayoutEffect(() => {
    const previousLanguage = document.documentElement.lang
    document.documentElement.lang = 'kk'
    document.documentElement.dataset.language = 'kk'
    return () => { document.documentElement.lang = previousLanguage }
  }, [])

  return <main className="typography-test-page" lang="kk">
    <header>
      <span className="eyebrow">DEVELOPMENT TYPOGRAPHY QA</span>
      <h1>Қазақ әліпбиін тексеру</h1>
      <p>Noto Sans • UTF-8 • Қазақ тілі негізгі тіл ретінде</p>
    </header>

    <div className="typography-test-grid">
      <section className="typography-test-card">
        <h2>Арнайы әріптер</h2>
        <div className="glyph-test" aria-label="Қазақ әріптері">
          {['Ә ә', 'Ғ ғ', 'Қ қ', 'Ң ң', 'Ө ө', 'Ұ ұ', 'Ү ү', 'Һ һ', 'І і'].map((pair) => <span key={pair}>{pair}</span>)}
        </div>
      </section>

      <section className="typography-test-card">
        <h2>Ғылыми мәтін үлгілері</h2>
        <div className="typography-sample-list">
          {sampleWords.map((word) => <span key={word}>{word}</span>)}
        </div>
      </section>

      <section className="typography-test-card">
        <h2>Ұзын мәтін және батырмалар</h2>
        <p className="typography-long-copy">Жанды және жансыз табиғаттағы үдерістерді зерттеп, тірі ағзалардың қоршаған ортамен өзара байланысы туралы ғылыми қорытынды жаса.</p>
        <p className="typography-long-copy">Тірі ағзалардың қоректік заттарды тасымалдауы</p>
        <div className="typography-button-stack">
          {buttons.map((label, index) => <button key={label} className={index === 0 ? 'primary-button compact' : 'secondary-button'}>{label}</button>)}
        </div>
      </section>

      <section className="typography-test-card">
        <h2>График және SVG мәтіні</h2>
        <svg className="typography-test-chart" viewBox="0 0 520 230" role="img" aria-label="Өсімдіктердің өсу графигі">
          <line x1="65" y1="20" x2="65" y2="185" stroke="#7590b3" />
          <line x1="65" y1="185" x2="500" y2="185" stroke="#7590b3" />
          <polyline points="65,170 155,145 245,112 335,72 425,38" fill="none" stroke="#5eead4" strokeWidth="5" />
          <text x="12" y="20" fill="#dcecff" fontSize="16">Өсу биіктігі</text>
          <text x="340" y="220" fill="#dcecff" fontSize="16">Зерттеу күндері</text>
          <text x="78" y="164" fill="#92f3e4" fontSize="15">Тәжірибе нәтижесі</text>
        </svg>
      </section>
    </div>
  </main>
}
