import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const music = read('src/audio/MusicProvider.tsx')
const app = read('src/App.tsx')
const main = read('src/main.tsx')
const header = read('src/components/AppHeader.tsx')
const home = read('src/pages/LandingPage.tsx')

const tracks = [
  ['mp3/Science Quest KZ - Main Menu (Option 2) Для главной страницы.mp3', 'public/audio/main-menu.mp3'],
  ['mp3/Pathfinder Основная фоновая музыка для игрового процесса.mp3', 'public/audio/gameplay.mp3'],
  ['mp3/Logical Drift Во время обычного квеста.mp3', 'public/audio/quest.mp3'],
  ['mp3/Logic Sequence Challenge.mp3', 'public/audio/challenge.mp3'],
]

const checks = []
const check = (name, condition) => checks.push([name, Boolean(condition)])

for (const [source, target] of tracks) {
  const sourcePath = path.join(root, source)
  const targetPath = path.join(root, target)
  check(`${path.basename(target)} exists and exactly matches the user MP3`, fs.existsSync(targetPath) && fs.existsSync(sourcePath) && fs.readFileSync(targetPath).equals(fs.readFileSync(sourcePath)))
}

check('one MusicProvider owns background audio', main.includes('<MusicProvider>') && (main.match(/<MusicProvider>/g) ?? []).length === 1)
check('all requested scenes plus future boss scene are typed', /'menu'\s*\|\s*'gameplay'\s*\|\s*'quest'\s*\|\s*'challenge'\s*\|\s*'boss'\s*\|\s*'none'/.test(music))
check('scene-to-track mapping is stable and cacheable', ['/audio/main-menu.mp3','/audio/gameplay.mp3','/audio/quest.mp3','/audio/challenge.mp3'].every((value) => music.includes(value)) && !/Date\.now\(\)|[?&]t=/.test(music))
check('audio is looped with metadata-only preload', music.includes('audio.loop = true') && music.includes("audio.preload = 'metadata'"))
check('default music volume is 20 percent', music.includes('const DEFAULT_VOLUME = 0.2'))
check('controlled 600 ms requestAnimationFrame crossfade', music.includes('const CROSSFADE_MS = 600') && music.includes('requestAnimationFrame(step)') && music.includes('fromVolume * (1 - progress)'))
check('tracks are created lazily and reused', music.includes('audioByScene.current.get(nextScene)') && music.includes('audioByScene.current.set(nextScene, audio)') && (music.match(/new Audio\(/g) ?? []).length === 1)
check('autoplay waits for a user gesture', music.includes("addEventListener('pointerdown', unlock") && music.includes("addEventListener('touchend', unlock") && music.includes("addEventListener('keydown', unlock") && music.includes('interacted.current'))
check('autoplay and media errors stay non-blocking', music.includes("target.play().then") && music.includes('.catch(() =>') && music.includes("audio.addEventListener('error'"))
check('mute and volume preferences persist independently', music.includes("'sciencequest_music_enabled'") && music.includes("'sciencequest_music_volume'"))
check('mute pauses active music and cannot restart on navigation', music.includes("transitionTo(enabled ? scene : 'none')") && music.includes('if (!enabledRef.current'))
check('rerenders do not restart the active track', music.includes("activeScene.current === nextScene && !target.paused") && !music.includes('currentTime = 0'))
check('only crossfade may briefly keep two tracks active', music.includes('trackScene !== previousScene && trackScene !== nextScene') && music.includes('audio.pause()'))
check('menu map quest challenge and boss use real game state', app.includes("path === '/game/map'") && app.includes("nextScene = 'gameplay'") && app.includes("levelById[id]?.type === 'challenge' ? 'challenge' : 'quest'") && app.includes("nextScene = 'boss'"))
check('admin console explicitly selects no music', app.includes("auth.role === 'admin'") && app.includes("nextScene = 'none'"))
check('existing header and home buttons control the manager', header.includes('toggleMusic') && home.includes('toggleMusic') && !header.includes('onClick={toggleSound}') && !home.includes('onClick={toggleSound}'))
check('accessible Kazakh and Russian music labels are exact', [header, home].every((file) => ['Музыканы өшіру','Музыканы қосу','Выключить музыку','Включить музыку'].every((label) => file.includes(label))))
check('background manager is isolated from Supabase and scoring', !/supabase|leaderboard|xp_transactions|completeLevel|student_progress/i.test(music))

let failures = 0
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}`)
  if (!passed) failures += 1
}
if (failures) {
  console.error(`Background music QA failed: ${failures}/${checks.length} checks.`)
  process.exit(1)
}
console.log(`Background music static QA passed: ${checks.length} checks.`)

