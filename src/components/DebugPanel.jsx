import { useEffect, useState } from 'react';
import { ChevronIcon } from './icons.jsx';

const DEBUG_POLL_MS = 5000;

/**
 * 백엔드 내부 상태(/api/debug) 확인용 패널.
 * 라이브 테스트 때 폴링 감지 → 활성 게임 등록 → window/details 캐시 적재 흐름을 눈으로 확인한다.
 */
export default function DebugPanel() {
  // 전용 탭으로 분리되어 있으므로 열린 상태로 시작
  const [open, setOpen] = useState(true);
  const [debug, setDebug] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/debug');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        if (!cancelled) { setDebug(d); setError(null); }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    };
    load();
    const t = setInterval(load, DEBUG_POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [open]);

  return (
    <section className="panel debug-panel">
      <span className="kicker">DIAGNOSTICS</span>
      <h2>
        진단 <span className="muted">백엔드 내부 상태{open ? ' · 5초 갱신' : ''}</span>
        <button className="debug-toggle" onClick={() => setOpen(!open)}>
          <ChevronIcon open={open} />
          {open ? 'HIDE' : 'SHOW'}
        </button>
      </h2>

      {open && (
        <div className="debug-body">
          {error && <div className="error">{error}</div>}
          {!debug && !error && <p className="muted">불러오는 중…</p>}
          {debug && (
            <>
              <div className="debug-summary">
                <span>SCHEDULE <b>{debug.scheduleCached ? 'OK' : 'NONE'}</b></span>
                <span>STANDINGS <b>{debug.standingsCached ? 'OK' : 'NONE'}</b></span>
                <span>LIVE <b>{debug.liveMatches?.length ?? 0}</b></span>
                <span>LAG <b>{debug.liveStatsLagSeconds ?? '-'}s</b></span>
                <span>ACTIVE <b>{debug.activeGameIds?.length ? debug.activeGameIds.join(' · ') : 'NONE'}</b></span>
              </div>
              <pre className="debug-json">{JSON.stringify(debug, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </section>
  );
}
