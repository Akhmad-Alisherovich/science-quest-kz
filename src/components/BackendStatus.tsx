import { useOnline } from '../store/OnlineStore'

export function BackendStatus() {
  const { configured, diagnostics, connect } = useOnline()
  if (!import.meta.env.DEV) return null
  const state = (value: boolean) => value ? 'OK' : configured ? 'Error' : 'Not configured'
  return <section className="backend-status" aria-label="Backend Status">
    <div className="backend-status-heading"><div><small>DEVELOPMENT ONLY</small><h2>Backend Status</h2></div><button onClick={() => void connect()}>↻ Check</button></div>
    <dl><div><dt>Supabase</dt><dd data-ok={diagnostics.database}>{diagnostics.database ? 'Connected' : configured ? 'Error' : 'Not configured'}</dd></div><div><dt>Auth</dt><dd data-ok={diagnostics.auth}>{state(diagnostics.auth)}</dd></div><div><dt>Database</dt><dd data-ok={diagnostics.database}>{state(diagnostics.database)}</dd></div><div><dt>Leaderboard</dt><dd data-ok={diagnostics.leaderboard}>{state(diagnostics.leaderboard)}</dd></div><div><dt>Offline Queue</dt><dd data-ok={diagnostics.pendingQueue === 0}>{diagnostics.pendingQueue} pending</dd></div></dl>
  </section>
}
