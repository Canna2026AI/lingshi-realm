import React, { useEffect, useRef, useState } from 'react';
import { createCharge } from './charge';
export default function HoldStone({ onTransform, holding, reduced }) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);
  const raf = useRef(0), charge = useRef(createCharge()), release = useRef(null);
  const stop = () => {
    cancelAnimationFrame(raf.current); raf.current = 0; charge.current.cancel();
    setProgress(0); setActive(false); holding.current = false;
    const captured = release.current; release.current = null;
    if (captured) { try { captured.el.releasePointerCapture(captured.id); } catch {} }
  };
  const begin = (event) => {
    if (event.type === 'pointerdown' && event.button !== 0) return;
    if (!charge.current.begin(performance.now())) return;
    if (event.type === 'pointerdown') {
      event.currentTarget.setPointerCapture(event.pointerId);
      release.current = { el: event.currentTarget, id: event.pointerId };
    }
    setActive(true); holding.current = true;
    const tick = (now) => {
      const { progress: p, completed } = charge.current.sample(now); setProgress(p);
      if (completed) { stop(); onTransform(); } else raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => {
    const cancel = () => stop();
    window.addEventListener('blur', cancel); document.addEventListener('visibilitychange', cancel);
    return () => { cancelAnimationFrame(raf.current); charge.current.cancel(); holding.current = false; window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', cancel); };
  }, []);
  return <button className={`j-stone ${active ? 'charging' : ''}`} aria-label="长按灵石切换秘境"
    onPointerDown={begin} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onContextMenu={e => e.preventDefault()} onBlur={stop}
    onKeyDown={e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); if (!e.repeat) begin(e); } }}
    onKeyUp={e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); stop(); } }}>
    <img src="/images/journey/stone.webp" alt="灵碑" draggable="false" />
    <span className="j-hold-target" style={{ '--hold': progress }}>
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle className="track" cx="50" cy="50" r="46" /><circle className="fill" cx="50" cy="50" r="46" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} /></svg>
      <span className="j-star">✦</span>
      <span className="j-hold-label"><strong>{active ? '凝气中…' : '长按灵石'}</strong><small>凝气 · 改写天地</small></span>
    </span>
    <span className="sr-only" role="progressbar" aria-label="凝气进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)} />
  </button>;
}
