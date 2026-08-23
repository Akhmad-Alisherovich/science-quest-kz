import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { uploadOwnAvatar, validateAvatarSource } from '../services/avatarService'
import { useGame } from '../store/GameStore'

const OUTPUT_SIZE = 512
const WEBP_QUALITY = 0.82

function canvasToWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== 'image/webp') { reject(new Error('AVATAR_WEBP_UNSUPPORTED')); return }
      resolve(blob)
    }, 'image/webp', WEBP_QUALITY)
  })
}

export function AvatarUploader({ onUploaded }: { onUploaded: (path: string) => void }) {
  const { progress } = useGame(); const kk = progress.language === 'kk'
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ x: number; y: number; horizontal: number; vertical: number } | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [horizontal, setHorizontal] = useState(0)
  const [vertical, setVertical] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    setSourceUrl(null); setImage(null); setError(''); setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  useEffect(() => {
    if (!sourceUrl) return
    const next = new Image()
    next.onload = () => setImage(next)
    next.onerror = () => setError(kk ? 'Суретті оқу мүмкін болмады.' : 'Не удалось прочитать изображение.')
    next.src = sourceUrl
  }, [sourceUrl, kk])

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
  }, [sourceUrl])

  useEffect(() => {
    if (!image || !canvasRef.current) return
    const canvas = canvasRef.current
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return
    const cropSize = Math.min(image.naturalWidth, image.naturalHeight) / zoom
    const sourceX = ((horizontal + 1) / 2) * Math.max(0, image.naturalWidth - cropSize)
    const sourceY = ((vertical + 1) / 2) * Math.max(0, image.naturalHeight - cropSize)
    context.fillStyle = '#071126'; context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  }, [image, zoom, horizontal, vertical])

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      validateAvatarSource(file)
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
      setZoom(1); setHorizontal(0); setVertical(0); setImage(null); setError('')
      setSourceUrl(URL.createObjectURL(file))
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : ''
      setError(code === 'AVATAR_TOO_LARGE'
        ? (kk ? 'Файл өлшемі 5 MB-тан аспауға тиіс.' : 'Файл должен быть не больше 5 MB.')
        : (kk ? 'JPEG, PNG немесе WebP файлын таңдаңыз.' : 'Выберите файл JPEG, PNG или WebP.'))
      event.target.value = ''
    }
  }

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY, horizontal, vertical }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const rect = event.currentTarget.getBoundingClientRect()
    setHorizontal(Math.max(-1, Math.min(1, drag.horizontal - (event.clientX - drag.x) / rect.width * 2)))
    setVertical(Math.max(-1, Math.min(1, drag.vertical - (event.clientY - drag.y) / rect.height * 2)))
  }
  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const upload = async () => {
    if (!canvasRef.current || !image) return
    setBusy(true); setError('')
    try {
      const blob = await canvasToWebp(canvasRef.current)
      const path = await uploadOwnAvatar(blob)
      onUploaded(path)
      close()
    } catch {
      setBusy(false)
      setError(kk ? 'Фотосуретті жүктеу мүмкін болмады. Қайталап көріңіз.' : 'Не удалось загрузить фотографию. Попробуйте снова.')
    }
  }

  return <div className="avatar-upload-control">
    <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} />
    <button type="button" className="avatar-gallery-button" onClick={() => inputRef.current?.click()}>📷 {kk ? 'Галереядан таңдау' : 'Выбрать из галереи'}</button>
    <small>{kk ? 'JPEG, PNG немесе WebP · 5 MB-қа дейін' : 'JPEG, PNG или WebP · до 5 MB'}</small>
    {error && !sourceUrl && <p className="form-message" role="alert">{error}</p>}
    {sourceUrl && <div className="avatar-crop-backdrop" role="presentation">
      <section className="avatar-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
        <header><div><small>512 × 512 · WebP</small><h2 id="avatar-crop-title">{kk ? 'Фотосуретті қиып алу' : 'Обрезка фотографии'}</h2></div><button type="button" aria-label={kk ? 'Жабу' : 'Закрыть'} onClick={close}>×</button></header>
        <p>{kk ? 'Кадрды жылжытыңыз және масштабты реттеңіз.' : 'Перемещайте кадр и настройте масштаб.'}</p>
        <canvas ref={canvasRef} width={OUTPUT_SIZE} height={OUTPUT_SIZE} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} />
        <label>{kk ? 'Масштаб' : 'Масштаб'}<input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
        <div className="avatar-position-controls"><label>{kk ? 'Көлденең' : 'По горизонтали'}<input type="range" min="-1" max="1" step="0.01" value={horizontal} onChange={(event) => setHorizontal(Number(event.target.value))} /></label><label>{kk ? 'Тігінен' : 'По вертикали'}<input type="range" min="-1" max="1" step="0.01" value={vertical} onChange={(event) => setVertical(Number(event.target.value))} /></label></div>
        {error && <p className="form-message" role="alert">{error}</p>}
        <footer className="avatar-crop-actions"><button type="button" className="secondary-button avatar-crop-cancel" disabled={busy} onClick={close}>{kk ? 'Болдырмау' : 'Отмена'}</button><button type="button" className="primary-button avatar-crop-submit" disabled={!image || busy} onClick={() => void upload()}>{busy ? '…' : kk ? 'Қиып алу және жүктеу' : 'Обрезать и загрузить'}</button></footer>
      </section>
    </div>}
  </div>
}
