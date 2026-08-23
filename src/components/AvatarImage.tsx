import { useEffect, useState } from 'react'
import { avatarPublicUrl } from '../services/avatarService'

export function AvatarImage({ value, className = '', label }: { value?: string | null; className?: string; label?: string }) {
  const token = value || '🧑‍🔬'
  const url = avatarPublicUrl(token)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [token])
  return <span className={`user-avatar ${className}`.trim()} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    {url && !failed ? <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <span aria-hidden="true">{url ? '🧑‍🔬' : token}</span>}
  </span>
}
