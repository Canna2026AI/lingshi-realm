import React, { useEffect, useRef } from 'react';
export default function SpiritDust({ pointer, holding, reduced, realm, enabled }) {
  const canvas = useRef(null);
  useEffect(() => {
    const el = canvas.current, ctx = el.getContext('2d'); if (!ctx || reduced || !enabled) return;
    let width = 0, height = 0, raf = 0, last = 0;
    const dots = Array.from({ length: window.innerWidth < 720 ? 28 : 64 }, (_, i) => ({ x: (i * 131.71) % window.innerWidth, y: (i * 79.93) % window.innerHeight, vx: 0, vy: 0, phase: i * 1.7 }));
    const resize = () => { width = window.innerWidth; height = window.innerHeight; const dpr = Math.min(devicePixelRatio || 1, 1.5); el.width = width * dpr; el.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const draw = time => {
      raf = 0; if (document.hidden) return;
      if (time - last > 30) {
        const dt = Math.min((time - last) / 32, 2) || 1; last = time; ctx.clearRect(0, 0, width, height);
        for (const p of dots) {
          if (holding.current) { p.vx += (width * .7 - p.x) * .0009; p.vy += (height * .47 - p.y) * .0009; }
          else {
            const dx = p.x - pointer.current.x, dy = p.y - pointer.current.y, dist = Math.hypot(dx, dy);
            if (dist < 110 && dist > 1) { p.vx += dx / dist * .8; p.vy += dy / dist * .8; }
            p.vx += Math.sin(time / 2800 + p.phase) * .025;
            p.vy -= .035;
          }
          p.vx *= .95; p.vy *= .95; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < -15) p.x = width + 10; if (p.x > width + 15) p.x = -10;
          if (p.y < -15) p.y = height + 10; if (p.y > height + 15) p.y = -10;
          ctx.fillStyle = realm === 2 ? '#f5ebd7' : realm === 1 ? '#d5dbb7' : '#efc087';
          ctx.globalAlpha = .25 + .25 * (Math.sin(time / 1700 + p.phase) + 1) / 2;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(time / 6000 + p.phase);
          if (realm === 1) { ctx.beginPath(); ctx.ellipse(0, 0, 2, 4, 0, 0, Math.PI * 2); ctx.fill(); }
          else { ctx.fillRect(-1, -1, realm === 2 ? 3 : 2, realm === 2 ? 3 : 2); }
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = 0; raf = requestAnimationFrame(draw); } };
    resize(); raf = requestAnimationFrame(draw); window.addEventListener('resize', resize); document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); ctx.clearRect(0, 0, width, height); };
  }, [reduced, enabled, realm]);
  return <canvas className="j-dust" ref={canvas} aria-hidden="true" />;
}
