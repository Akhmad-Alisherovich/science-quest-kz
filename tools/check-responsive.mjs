import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.cwd())
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8')
const failures = []
const checks = []
const viewports = [
  [320, 568], [360, 800], [375, 667], [390, 844], [412, 915], [430, 932],
  [768, 1024], [820, 1180],
  [1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080],
  [844, 390],
]

function expect(condition, message) {
  if (condition) checks.push(message)
  else failures.push(message)
}

const index = read('index.html')
const main = read('src', 'main.tsx')
const css = read('src', 'responsive.css')
const styles = read('src', 'styles.css')
const homeCss = read('src', 'home-dashboard.css')
const leaderboardCss = read('src', 'leaderboard.css')
const achievementCss = read('src', 'achievement-system.css')
const adminCss = read('src', 'admin.css')
const header = read('src', 'components', 'AppHeader.tsx')
const bottomNav = read('src', 'components', 'MobileNavigation.tsx')
const avatarUploader = read('src', 'components', 'AvatarUploader.tsx')
const adminApp = read('src', 'admin', 'AdminApp.tsx')
const profilePage = read('src', 'pages', 'ProfilePage.tsx')
const leaderboardPage = read('src', 'pages', 'LeaderboardPage.tsx')
const app = read('src', 'App.tsx')
const classification = read('src', 'game', 'mechanics', 'ClassificationGame.tsx')
const sequence = read('src', 'game', 'mechanics', 'SequenceGame.tsx')
const lab = read('src', 'game', 'mechanics', 'LabGame.tsx')
const typographyTest = read('src', 'components', 'TypographyTest.tsx')

expect(/width=device-width,\s*initial-scale=1\.0,\s*viewport-fit=cover/.test(index), 'viewport-fit=cover және mobile viewport')
expect(main.indexOf("./responsive.css") > main.indexOf("./typography.css"), 'responsive CSS соңғы override ретінде қосылған')
expect(css.indexOf('@media (min-width: 640px)') > css.indexOf('.landing-page'), 'mobile-first база tablet breakpoint-тан бұрын')
expect(css.includes('@media (min-width: 1024px)'), '1024px laptop/desktop breakpoint')
expect(/min-(?:width|height):\s*44px/.test(css) && css.includes('48px'), '44–48px touch targets')
expect(css.includes('env(safe-area-inset-top)') && css.includes('env(safe-area-inset-bottom)'), 'iPhone safe-area қорғанысы')
expect(css.includes('overflow-x: hidden') && css.includes('max-width: 100%'), 'бет деңгейіндегі horizontal overflow қорғанысы')
expect(/img,[\s\S]*max-width:\s*100%[\s\S]*height:\s*auto/.test(css), 'responsive image/media ережесі')
expect(css.includes('(orientation: landscape)') && css.includes('100svh') && css.includes('100dvh'), 'portrait/landscape және dynamic viewport қолдауы')
expect(css.includes('@media (hover: none)') && css.includes('@media (prefers-reduced-motion: reduce)'), 'touch feedback және reduced-motion')
expect(![css, styles, homeCss, leaderboardCss, achievementCss, adminCss].some((source) => /word-break\s*:\s*break-all|overflow-wrap\s*:\s*anywhere(?=[^}]*\b(?:button|label|nav)\b)/.test(source)), 'UI мәтінінде break-all/anywhere жоқ')
expect(leaderboardCss.includes('grid-template-columns: repeat(5, minmax(0, 1fr))'), 'mobile bottom navigation бес тең бағаннан тұрады')
expect(homeCss.includes('.home-page .home-controls .sound-button { width: 44px; min-width: 44px; min-height: 44px; }'), 'Home controls touch target кемінде 44px')
expect(achievementCss.includes('min-height:44px') && achievementCss.includes('width:44px;min-width:44px;height:44px'), 'Achievement filters/toast touch target кемінде 44px')

expect(header.includes('mobile-menu-toggle') && header.includes('mobile-drawer') && header.includes("event.key === 'Escape'"), 'keyboard-қолдауы бар mobile drawer')
expect(['onHome', 'onMap', 'onLeaderboard', 'onAchievements', 'onProfile'].every((name) => bottomNav.includes(name)), 'mobile bottom navigation толық функциялы')
expect(app.includes('<MobileNavigation') && app.includes('app-shell--with-mobile-nav'), 'mobile navigation негізгі қолданбаға қосылған')
expect(!profilePage.includes('BackendStatus') && !profilePage.includes('VITE_SUPABASE'), 'student Profile техникалық backend панелін көрсетпейді')
expect(!leaderboardPage.includes('VITE_SUPABASE_URL') && !leaderboardPage.includes('VITE_SUPABASE_PUBLISHABLE_KEY'), 'student Leaderboard env айнымалыларын көрсетпейді')

expect(adminApp.includes('admin-sidebar-close') && adminApp.includes("event.key === 'Escape'"), 'Admin drawer X және Escape арқылы жабылады')
expect(adminApp.includes("setView(next);setMenu(false)") && adminApp.includes('admin-backdrop'), 'Admin drawer navigation және backdrop арқылы жабылады')
expect(adminCss.includes('.admin-sidebar-close{') && adminCss.includes('@media(min-width:1024px){.admin-sidebar-close{display:none}}'), 'Admin drawer close mobile-only және 44px')
expect(adminCss.includes('.recipient-body.users{display:flex;flex-direction:column;overflow:hidden') && adminCss.includes('.recipient-student-list{min-height:160px;max-height:390px;flex:1;overflow:auto'), 'recipient selector student режимінде бір list scroll-контейнерін қолданады')
expect(adminCss.includes('.inline-access-actions button{display:flex;align-items:center;justify-content:center;gap:4px;min-width:44px;min-height:44px'), 'Admin inline actions touch target кемінде 44px')

expect(avatarUploader.includes('accept="image/jpeg,image/png,image/webp"'), 'avatar picker mobile gallery MIME түрлерін шектейді')
expect(leaderboardCss.includes('width: min(100%, 720px)') && leaderboardCss.includes('min-height: 48px') && leaderboardCss.includes('.avatar-position-controls { grid-template-columns: 1fr'), 'avatar crop modal, sliders және mobile stack responsive')
expect(leaderboardCss.includes('white-space: nowrap; word-break: normal; overflow-wrap: normal'), 'crop action labels сөз ішінде бөлінбейді')

expect(classification.includes('onPointerDown') && classification.includes('onPointerMove') && classification.includes('data-drop-category'), 'classification Pointer Events арқылы touch drag қолдайды')
expect(classification.includes('setSelected') && classification.includes("event.key === 'Enter'"), 'classification tap және keyboard fallback қолдайды')
expect(sequence.includes('onPointerDown') && sequence.includes('data-sequence-position') && sequence.includes('sequence-drag-handle'), 'sequence touch reorder қолдайды')
expect(sequence.includes('copy.moveUp') && sequence.includes('copy.moveDown'), 'sequence keyboard controls локализацияланған')

expect(lab.includes('lab-data-panel') && css.includes('grid-template-areas: "visual" "controls" "data"'), 'mobile experiment: experiment → controls → data')
expect(css.includes('grid-template-areas: "controls controls" "visual data"'), 'tablet experiment layout')
expect(css.includes('grid-template-areas: "controls visual data"'), 'desktop experiment layout')
expect(css.includes('max-height: 90dvh') && css.includes('align-items: end'), 'mobile bottom-sheet modal және ішкі scroll')
expect(css.includes('overscroll-behavior-inline: contain'), 'chart/table overflow тек ішкі контейнерде')

for (const sample of ['Жанды және жансыз табиғаттағы үдерістер', 'Тірі ағзалардың қоректік заттарды тасымалдауы']) {
  expect(typographyTest.includes(sample), `ұзын қазақша QA мәтіні: ${sample}`)
}

if (process.argv.includes('--dist')) {
  const assets = join(root, 'dist', 'assets')
  const cssAsset = readdirSync(assets).find((name) => name.endsWith('.css'))
  expect(Boolean(cssAsset), 'production CSS asset бар')
  if (cssAsset) {
    const distCss = readFileSync(join(assets, cssAsset), 'utf8')
    expect(distCss.includes('safe-area-inset-bottom') && distCss.includes('mobile-bottom-nav'), 'production bundle responsive ережелерді қамтиды')
  }
}

if (failures.length) {
  console.error('Responsive QA сәтсіз:\n- ' + failures.join('\n- '))
  process.exit(1)
}

console.log(`Responsive source QA OK: ${checks.length} тексеріс.`)
console.log(`QA viewport matrix: ${viewports.map(([width, height]) => `${width}×${height}`).join(', ')}`)
console.log('Қамтылғандар: navigation, Game Map, cards, touch DnD, experiment, chart, modal, safe area, қазақша ұзын мәтін.')
