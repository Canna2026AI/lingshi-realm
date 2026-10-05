import { useEffect, useRef, useState } from 'react';
import { positionAt, sceneOffset } from './timeline';
export function useJourney(started) {
  const [position, setPosition] = useState(() => positionAt(0));
  const root = useRef(null), pointer = useRef({ x: -1000, y: -1000 });
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change); return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; setPosition(positionAt(window.scrollY / window.innerHeight)); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule); update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [started]);
  const jump = (index) => window.scrollTo({ top: (sceneOffset(index) + .12) * window.innerHeight, behavior: reduced ? 'instant' : 'smooth' });
  const move = (event) => {
    pointer.current = { x: event.clientX, y: event.clientY };
    if (reduced || event.pointerType !== 'mouse') return;
    root.current?.style.setProperty('--jx', `${(event.clientX / window.innerWidth - .5) * 16}px`);
    root.current?.style.setProperty('--jy', `${(event.clientY / window.innerHeight - .5) * 10}px`);
  };
  const leave = () => { pointer.current = { x: -1000, y: -1000 }; root.current?.style.setProperty('--jx', '0px'); root.current?.style.setProperty('--jy', '0px'); };
  return { position, root, pointer, reduced, jump, move, leave };
}
