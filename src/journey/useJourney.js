import { useEffect, useRef, useState } from "react";
import { positionAt, sceneOffset, transitionAt } from "./timeline";

export function useJourney(started) {
  const [position, setPosition] = useState(() => positionAt(0));
  const [transition, setTransition] = useState(null);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const root = useRef(null),
    pointer = useRef({ x: -1000, y: -1000 });
  const travel = useRef(0),
    active = useRef(false),
    smooth = useRef(0);
  const view = useRef(position);
  view.current = position;
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    let frame = 0,
      last = performance.now();
    const tick = (now) => {
      frame = 0;
      if (active.current) return;
      const target = window.scrollY / window.innerHeight;
      const dt = Math.min(50, now - last);
      last = now;
      smooth.current = reduced
        ? target
        : smooth.current +
          (target - smooth.current) * (1 - Math.exp(-dt / 120));
      if (Math.abs(target - smooth.current) < 0.001) smooth.current = target;
      setPosition(positionAt(smooth.current));
      if (Math.abs(target - smooth.current) > 0.001)
        frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!frame && !active.current) {
        last = performance.now() - 16;
        frame = requestAnimationFrame(tick);
      }
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [started, reduced]);
  const cancel = () => {
    cancelAnimationFrame(travel.current);
    travel.current = 0;
    active.current = false;
    setTransition(null);
  };
  useEffect(() => {
    const lock = (event) => {
      if (active.current && !event.target.closest?.(".j-overlay"))
        event.preventDefault();
    };
    window.addEventListener("wheel", lock, { passive: false });
    window.addEventListener("touchmove", lock, { passive: false });
    return () => {
      cancelAnimationFrame(travel.current);
      window.removeEventListener("wheel", lock);
      window.removeEventListener("touchmove", lock);
    };
  }, []);
  const jump = (index) => {
    if (active.current) return;
    const target = (sceneOffset(index) + 0.01) * window.innerHeight;
    if (index === view.current.index) {
      smooth.current = target / window.innerHeight;
      window.scrollTo({ top: target, behavior: "instant" });
      setPosition(positionAt(smooth.current));
      return;
    }
    const launch = !reduced && view.current.index === 0 && index > 0;
    const start = performance.now();
    active.current = true;
    setTransition({ target: index, mix: 0, launch: 0 });
    const tick = (now) => {
      const elapsed = now - start;
      const stage = transitionAt(elapsed, launch);
      setTransition({ target: index, mix: stage.mix, launch: stage.launch });
      if (!stage.done) travel.current = requestAnimationFrame(tick);
      else {
        smooth.current = target / window.innerHeight;
        window.scrollTo({ top: target, behavior: "instant" });
        setPosition(positionAt(smooth.current));
        active.current = false;
        travel.current = 0;
        setTransition(null);
      }
    };
    travel.current = requestAnimationFrame(tick);
  };
  const move = (e) => {
    pointer.current = { x: e.clientX, y: e.clientY };
    if (reduced || e.pointerType !== "mouse") return;
    root.current?.style.setProperty(
      "--jx",
      `${(e.clientX / window.innerWidth - 0.5) * 18}px`,
    );
    root.current?.style.setProperty(
      "--jy",
      `${(e.clientY / window.innerHeight - 0.5) * 12}px`,
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
    transition,
    traveling: Boolean(transition),
    cancel,
  };
}
