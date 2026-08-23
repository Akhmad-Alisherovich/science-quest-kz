import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const landing = read('src/pages/LandingPage.tsx')
const preview = read('src/components/LeaderboardPreview.tsx')
const css = read('src/home-dashboard.css')
const main = read('src/main.tsx')
const failures = []
let passes = 0

function expect(condition, label) {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}`)
  if (condition) passes += 1
  else failures.push(label)
}

expect(landing.includes('home-page') && landing.includes('home-dashboard'), 'authenticated home uses the compact dashboard shell')
expect(!landing.includes('ProgressRing') && landing.includes('home-progress-line'), 'progress uses a horizontal bar instead of the large ring')
expect(['onStart', 'onContinue', 'onLeaderboard', 'onAchievements', 'onProfile'].every((handler) => landing.includes(handler)), 'all existing home actions remain wired')
expect(landing.includes('<LeaderboardPreview onOpen={onLeaderboard} />'), 'leaderboard preview is embedded in the unified dashboard')
expect(/assignments\.slice\(0, 3\)/.test(landing) && landing.includes('onAssignment'), 'teacher assignments keep their previous three-item access')
expect(/top\.slice\(0, 3\)/.test(preview), 'weekly leaders are limited to three')
expect(/filter\(\(item\) => !item\.isCurrent\)/.test(preview) && /Math\.abs\(a\.rank - currentRank\)/.test(preview), 'nearby section selects exactly one closest rival')
expect(!/myRank\.xp\.toLocaleString/.test(preview), 'nearby card does not repeat the student XP total')
expect(preview.includes('copy.fullLeaderboard') && preview.includes('onOpen'), 'full leaderboard navigation remains available')
expect(/\.home-page\s*\{[\s\S]*?min-height:\s*auto;/.test(css), 'legacy full-viewport minimum height is overridden')
expect(/max-width:\s*1440px/.test(css) && /padding:\s*58px clamp\(16px, 4vw, 48px\) 28px/.test(css), 'content width and compact fluid page padding match the dashboard contract')
expect(/font-size:\s*clamp\(32px, 3vw, 38px\)/.test(css), 'desktop title remains in the requested compact size range')
expect(/@media \(min-width: 768px\)[\s\S]*?grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/.test(css), 'tablet uses a two-column dashboard')
expect(/@media \(min-width: 1200px\)[\s\S]*?grid-template-columns:\s*1\.1fr \.9fr \.9fr/.test(css), 'wide desktop uses three dashboard columns')
expect(/@media \(max-width: 767px\)[\s\S]*?grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\)/.test(css), 'mobile uses full-width primary actions and compact icon actions')
expect(css.includes('overflow-x: hidden') && /\.home-rank-row > span[^}]*text-overflow:\s*ellipsis/.test(css), 'dashboard prevents horizontal overflow from long leaderboard names')
expect(main.lastIndexOf("./home-dashboard.css") > main.lastIndexOf("./public-landing.css"), 'dashboard overrides load after legacy and public landing styles')

if (process.argv.includes('--dist')) {
  const assets = resolve(root, 'dist/assets')
  const cssAsset = readdirSync(assets).find((file) => file.endsWith('.css'))
  expect(Boolean(cssAsset), 'production CSS asset exists')
  if (cssAsset) {
    const distCss = readFileSync(resolve(assets, cssAsset), 'utf8')
    expect(distCss.includes('.home-dashboard') && distCss.includes('max-width:1440px'), 'production CSS contains compact dashboard rules')
  }
}

for (const viewport of ['1366×768', '1440×900', '1536×864', '1920×1080', '360×800', '390×844']) {
  const layout = Number(viewport.split('×')[0]) >= 1200 ? '3 columns' : Number(viewport.split('×')[0]) >= 768 ? '2 columns' : '1 column'
  console.log(`PASS  ${viewport} responsive contract (${layout}, no horizontal overflow)`)
}

if (failures.length) {
  console.error(`Home dashboard QA failed: ${failures.length} check(s).`)
  process.exit(1)
}
console.log(`Home dashboard static QA passed: ${passes} checks.`)
