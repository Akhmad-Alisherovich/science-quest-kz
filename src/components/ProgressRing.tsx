export function ProgressRing({ value, label }: { value: number; label: string }) {
  return <div className="progress-ring" style={{ '--progress': `${Math.max(0, Math.min(100, value)) * 3.6}deg` } as React.CSSProperties}>
    <div><strong>{Math.round(value)}%</strong><small>{label}</small></div>
  </div>
}
