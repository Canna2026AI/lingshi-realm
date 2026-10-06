import { useEffect, useRef, useState } from "react";
import { positionAt, sceneOffset, easeJourney, clamp } from "./timeline";
export function useJourney(started) {
  const [position, setPosition] = useState(() => positionAt(0)),
    [veil, setVeil] = useState(0),
    [traveling, setTraveling] = useState(false);
  const root = useRef(null),
    pointer = useRef({ x: -1000, y: -1000 }),
    travel = useRef(0);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setPosition(positionAt(window.scrollY / window.innerHeight));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [started]);
  const cancel = () => {
    cancelAnimationFrame(travel.current);
    travel.current = 0;
    setTraveling(false);
    setVeil(0);
  };
  useEffect(() => {
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    return () => {
      cancelAnimationFrame(travel.current);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
    };
  }, []);
  const jump = (index) => {
    cancel();
    const target = (sceneOffset(index) + 0.08) * window.innerHeight,
      from = window.scrollY;
    if (reduced) {
      window.scrollTo({ top: target, behavior: "instant" });
      return;
    }
    const start = performance.now(),
      distant = Math.abs(index - position.index) > 1;
    let switched = false;
    setTraveling(true);
    const tick = (now) => {
      const t = clamp((now - start) / 1500),
        p = easeJourney(t);
      setVeil(Math.sin(Math.PI * t));
      if (distant) {
        if (t >= 0.5 && !switched) {
          window.scrollTo({ top: target, behavior: "instant" });
          switched = true;
        }
      } else
        window.scrollTo({
          top: from + (target - from) * p,
          behavior: "instant",
        });
      if (t < 1) travel.current = requestAnimationFrame(tick);
      else {
        travel.current = 0;
        setTraveling(false);
        setVeil(0);
      }
    };
    travel.current = requestAnimationFrame(tick);
  };
  const move = (e) => {
    pointer.current = { x: e.clientX, y: e.clientY };
    if (reduced || e.pointerType !== "mouse") return;
    root.current?.style.setProperty(
      "--jx",
      `${(e.clientX / window.innerWidth - 0.5) * 12}px`,
    );
    root.current?.style.setProperty(
      "--jy",
      `${(e.clientY / window.innerHeight - 0.5) * 8}px`,
    );
  };
  const leave = () => {
    pointer.current = { x: -1000, y: -1000 };
    root.current?.style.setProperty("--jx", "0px");
    root.current?.style.setProperty("--jy", "0px");
  };
  return {
    position,
    root,
    pointer,
    reduced,
    jump,
    move,
    leave,
    veil,
    traveling,
    cancel,
  };
}
