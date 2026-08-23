import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const root = resolve(process.cwd())
const fontPath = join(root, 'src', 'assets', 'fonts', 'NotoSans-Variable.ttf')
const requiredGlyphs = [...'ӘҒҚҢӨҰҮҺІәғқңөұүһі']
const requiredSamples = [
  'Қазақ әліпбиін тексеру',
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

const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.css', '.html', '.json', '.md'])
const ignoredDirectories = new Set(['node_modules', 'dist', '.git'])

function collectTextFiles(directory) {
  const files = []
  for (const name of readdirSync(directory)) {
    if (ignoredDirectories.has(name)) continue
    const path = join(directory, name)
    const stat = statSync(path)
    if (stat.isDirectory()) files.push(...collectTextFiles(path))
    else if (allowedExtensions.has(extname(name))) files.push(path)
  }
  return files
}

function getCmapLookup(font) {
  if (font.readUInt32BE(0) !== 0x00010000 && font.toString('ascii', 0, 4) !== 'OTTO') {
    throw new Error('Noto Sans файлы жарамды OpenType/TrueType қарпі емес')
  }
  const numTables = font.readUInt16BE(4)
  let cmapOffset = -1
  for (let index = 0; index < numTables; index += 1) {
    const record = 12 + index * 16
    if (font.toString('ascii', record, record + 4) === 'cmap') {
      cmapOffset = font.readUInt32BE(record + 8)
      break
    }
  }
  if (cmapOffset < 0) throw new Error('Қаріпте cmap кестесі жоқ')

  const subtableCount = font.readUInt16BE(cmapOffset + 2)
  const subtables = []
  for (let index = 0; index < subtableCount; index += 1) {
    const record = cmapOffset + 4 + index * 8
    const platform = font.readUInt16BE(record)
    const encoding = font.readUInt16BE(record + 2)
    const offset = cmapOffset + font.readUInt32BE(record + 4)
    const format = font.readUInt16BE(offset)
    if (format === 4 || format === 12) subtables.push({ platform, encoding, offset, format })
  }
  subtables.sort((a, b) => b.format - a.format || Number(b.platform === 3) - Number(a.platform === 3))
  if (!subtables.length) throw new Error('Қаріпте қолдау көрсетілетін Unicode cmap кестесі жоқ')

  const hasGlyphFormat12 = (offset, codePoint) => {
    const groups = font.readUInt32BE(offset + 12)
    let low = 0
    let high = groups - 1
    while (low <= high) {
      const middle = (low + high) >> 1
      const group = offset + 16 + middle * 12
      const start = font.readUInt32BE(group)
      const end = font.readUInt32BE(group + 4)
      if (codePoint < start) high = middle - 1
      else if (codePoint > end) low = middle + 1
      else return font.readUInt32BE(group + 8) + codePoint - start !== 0
    }
    return false
  }

  const hasGlyphFormat4 = (offset, codePoint) => {
    if (codePoint > 0xffff) return false
    const segCount = font.readUInt16BE(offset + 6) / 2
    const endCodes = offset + 14
    const startCodes = endCodes + segCount * 2 + 2
    const idDeltas = startCodes + segCount * 2
    const idRangeOffsets = idDeltas + segCount * 2
    for (let index = 0; index < segCount; index += 1) {
      const end = font.readUInt16BE(endCodes + index * 2)
      if (codePoint > end) continue
      const start = font.readUInt16BE(startCodes + index * 2)
      if (codePoint < start) return false
      const delta = font.readInt16BE(idDeltas + index * 2)
      const rangeOffsetPosition = idRangeOffsets + index * 2
      const rangeOffset = font.readUInt16BE(rangeOffsetPosition)
      if (rangeOffset === 0) return ((codePoint + delta) & 0xffff) !== 0
      const glyphPosition = rangeOffsetPosition + rangeOffset + (codePoint - start) * 2
      if (glyphPosition + 2 > font.length) return false
      const glyph = font.readUInt16BE(glyphPosition)
      return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0
    }
    return false
  }

  return (character) => {
    const codePoint = character.codePointAt(0)
    return subtables.some((table) => table.format === 12
      ? hasGlyphFormat12(table.offset, codePoint)
      : hasGlyphFormat4(table.offset, codePoint))
  }
}

const failures = []
const files = collectTextFiles(root)
const decoded = files.map((path) => ({ path, text: readFileSync(path, 'utf8') }))
const sourceText = decoded.map((file) => file.text).join('\n')

for (const file of decoded) {
  if (file.text.includes('\ufffd')) failures.push(`${file.path}: бұзылған UTF-8 replacement character табылды`)
  if (file.text.includes('□')) failures.push(`${file.path}: бос квадрат glyph табылды`)
  if (/\\u0(?:4|5)[0-9a-f]{2}/i.test(file.text)) failures.push(`${file.path}: қазақ/кирилл мәтіні Unicode escape арқылы сақталған`)
}

for (const glyph of requiredGlyphs) {
  if (!sourceText.includes(glyph)) failures.push(`Кодта міндетті қазақ әрпі қолданылмаған: ${glyph}`)
}

const typographyTest = readFileSync(join(root, 'src', 'components', 'TypographyTest.tsx'), 'utf8')
for (const sample of requiredSamples) {
  if (!typographyTest.includes(sample)) failures.push(`TypographyTest ішінде үлгі жоқ: ${sample}`)
}

const indexHtml = readFileSync(join(root, 'index.html'), 'utf8')
if (!/<meta\s+charset=["']UTF-8["']\s*\/?>/i.test(indexHtml)) failures.push('index.html ішінде UTF-8 meta charset жоқ')

const store = readFileSync(join(root, 'src', 'store', 'GameStore.tsx'), 'utf8')
if (!store.includes('document.documentElement.lang = progress.language')) failures.push('Тіл ауысқанда document.documentElement.lang өзгермейді')

const typographyCss = readFileSync(join(root, 'src', 'typography.css'), 'utf8')
if (!typographyCss.includes('@font-face') || !typographyCss.includes('NotoSans-Variable.ttf')) failures.push('Жергілікті Noto Sans @font-face дұрыс қосылмаған')
if (!typographyCss.includes('overflow-wrap: break-word') || !typographyCss.includes('word-break: normal')) failures.push('Қазақ мәтініне қауіпсіз жол тасымалы орнатылмаған')
if (/https?:\/\//i.test(typographyCss)) failures.push('Typography CSS сыртқы ресурсқа тәуелді')

const allCss = readFileSync(join(root, 'src', 'styles.css'), 'utf8') + typographyCss + readFileSync(join(root, 'src', 'responsive.css'), 'utf8') + readFileSync(join(root, 'src', 'leaderboard.css'), 'utf8')
if (/Space Grotesk|Manrope|fonts\.googleapis/i.test(allCss)) failures.push('Белгісіз немесе сыртқы декоративті қаріп сілтемесі сақталған')
if (/font-weight:\s*(?:800|900)/i.test(allCss)) failures.push('Рұқсат етілген 400–700 ауқымынан тыс font-weight қолданылған')
if (/line-clamp|text-overflow:\s*ellipsis/i.test(allCss)) failures.push('Қазақ мәтінін қиып тастайтын CSS табылды')

const font = readFileSync(fontPath)
if (font.length < 100_000) failures.push('Noto Sans қаріп файлы тым кішкентай немесе толық жүктелмеген')
const hasFontGlyph = getCmapLookup(font)
for (const glyph of requiredGlyphs) {
  if (!hasFontGlyph(glyph)) failures.push(`Noto Sans cmap ішінде glyph жоқ: ${glyph} U+${glyph.codePointAt(0).toString(16).toUpperCase()}`)
}

if (process.argv.includes('--dist')) {
  const distDirectory = join(root, 'dist')
  const distFiles = collectTextFiles(distDirectory)
  const distText = distFiles.map((path) => readFileSync(path, 'utf8')).join('\n')
  const distAssets = readdirSync(join(distDirectory, 'assets'))
  if (!distAssets.some((name) => /^NotoSans-Variable-.*\.ttf$/i.test(name))) failures.push('Production dist ішінде Noto Sans қаріп asset-і жоқ')
  if (!distText.includes('Noto Sans')) failures.push('Production CSS ішінде Noto Sans жарияланбаған')
  if (distText.includes('\ufffd') || distText.includes('□')) failures.push('Production bundle ішінде бұзылған glyph табылды')
  for (const glyph of requiredGlyphs) {
    if (!distText.includes(glyph)) failures.push(`Production bundle ішінде қазақ glyph-і жоқ: ${glyph}`)
  }
}

if (failures.length) {
  console.error('Қазақ типографикасының QA тексеруі сәтсіз:\n- ' + failures.join('\n- '))
  process.exit(1)
}

console.log(`Қазақ типографиясы OK: ${requiredGlyphs.length} арнайы glyph, ${files.length} UTF-8 файл, ${requiredSamples.length} визуалды үлгі.`)
console.log(`Noto Sans cmap coverage OK: ${requiredGlyphs.join(' ')}`)
if (process.argv.includes('--dist')) console.log('Production bundle typography OK: local font asset, UTF-8 және барлық қазақ glyph-тері бар.')
