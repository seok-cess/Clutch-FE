import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initDDragon } from './ddragon.js';
import './index.css';

// 아이템·룬 이름 데이터 선로드 (실패해도 화면은 ID 로 동작)
initDDragon();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
