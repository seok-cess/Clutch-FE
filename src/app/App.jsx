import { useState } from 'react';
import { BrowserRouter } from 'react-router';
import LiveScoreboard from '../components/LiveScoreboard.jsx';
import { LIVE_PREVIEW_GAME, LIVE_PREVIEW_MATCH } from '../preview/livePreviewData.js';
import AppRoutes from './routes.jsx';

export default function App() {
  const preview = new URLSearchParams(window.location.search).get('preview') === 'live';
  if (preview) return <LiveFeaturePreview />;

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function LiveFeaturePreview() {
  const [userId, setUserId] = useState('900001');
  return (
    <div className="app">
      <header className="header">
        <h1>LCK LIVE TELEMETRY</h1>
        <span className="badge live">LIVE</span>
        <label className="header-user">
          <span>USER ID</span>
          <input
            type="number"
            min="1"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          />
        </label>
      </header>
      <div className="preview-notice">
        <strong>INTERACTIVE PREVIEW</strong>
        <span>실제 포인트나 배팅 데이터는 변경되지 않습니다.</span>
      </div>
      <LiveScoreboard
        match={LIVE_PREVIEW_MATCH}
        userId={userId}
        preview
        gamePreview={LIVE_PREVIEW_GAME}
      />
    </div>
  );
}
