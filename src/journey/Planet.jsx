import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
export default function Planet({
  progress,
  launch = 0,
  reduced,
  paused,
  onEnter,
  enabled,
}) {
  const host = useRef(),
    current = useRef(progress),
    motion = useRef({ launch, paused }),
    mouse = useRef({ x: 0, y: 0 }),
    [fallback, setFallback] = useState(false);
  current.current = progress;
  motion.current = { launch, paused };
  useEffect(() => {
    const el = host.current;
    let renderer,
      frame = 0,
      texture,
      alive = true,
      last = 0,
      spin = 0.4 + performance.now() * 0.000085,
      orbit = 0,
      previous = 0;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFallback(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(43, 1, 0.1, 60),
      group = new THREE.Group();
    scene.add(group);
    camera.position.z = 5.7;
    scene.add(new THREE.AmbientLight(0xdbe7d5, 2));
    const light = new THREE.DirectionalLight(0xffe1a9, 3);
    light.position.set(-3, 3, 4);
    scene.add(light);
    const material = new THREE.MeshStandardMaterial({
      color: 0x95aaa1,
      roughness: 1,
      emissive: 0x19352c,
      emissiveIntensity: 0.2,
    });
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 64, 40),
      material,
    );
    group.add(sphere);
    sphere.rotation.z = 0.16;
    new THREE.TextureLoader().load("/images/flow/planet-map.webp", (map) => {
      if (!alive) {
        map.dispose();
        return;
      }
      texture = map;
      map.colorSpace = THREE.SRGBColorSpace;
      material.map = map;
      material.color.set(0xffffff);
      material.needsUpdate = true;
      stones.forEach((stone) => {
        stone.material.map = map;
        stone.material.needsUpdate = true;
      });
      render();
    });
    const ring = new THREE.Group();
    group.add(ring);
    ring.rotation.x = 0.45;
    ring.rotation.z = -0.22;
    const curve = new THREE.EllipseCurve(
        0,
        0,
        2.12,
        0.5,
        0,
        Math.PI * 2,
        false,
        0,
      ),
      points = curve.getPoints(100).map((p) => new THREE.Vector3(p.x, p.y, 0));
    ring.add(
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: 0xd9ad67,
          transparent: true,
          opacity: 0.45,
        }),
      ),
    );
    for (let i = 0; i < 2; i++) {
      const extra = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: 0xe7bd76,
          transparent: true,
          opacity: 0.6,
        }),
      );
      extra.rotation.z = i ? 0.2 : -0.25;
      extra.rotation.x = i ? 0.6 : -0.4;
      extra.scale.setScalar(1 + i * 0.1);
      ring.add(extra);
    }
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.42, 48, 32),
      new THREE.MeshBasicMaterial({
        color: 0xb6cfba,
        transparent: true,
        opacity: 0.055,
        side: THREE.BackSide,
      }),
    );
    group.add(atmosphere);
    const stones = Array.from({ length: 9 }, (_, i) => {
      const m = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.047 + (i % 3) * 0.019),
        new THREE.MeshStandardMaterial({ color: 0xd9ad67, roughness: 0.9 }),
      );
      ring.add(m);
      return m;
    });
    const starPositions = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) {
      starPositions[i * 3] = Math.sin(i * 21.7) * 7;
      starPositions[i * 3 + 1] = Math.cos(i * 7.3) * 4;
      starPositions[i * 3 + 2] = -2 - Math.abs(Math.sin(i)) * 5;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3),
    );
    scene.add(
      new THREE.Points(
        starsGeometry,
        new THREE.PointsMaterial({
          color: 0xe9d1a6,
          size: 0.022,
          transparent: true,
          opacity: 0.65,
        }),
      ),
    );
    function render(time = 0) {
      if (!alive) return;
      const mobile = el.clientWidth < 720,
        p = reduced ? 0 : current.current;
      const entry = motion.current.launch;
      const dt = Math.min(0.06, Math.max(0, (time - previous) / 1000));
      previous = time;
      const zoom = Math.max(entry, p * 0.75);
      group.position.set(
        (mobile ? 0 : 1.2) + mouse.current.x * 0.11,
        (mobile ? -0.67 : 0.1) + mouse.current.y * 0.07,
        zoom * 1.6,
      );
      group.scale.setScalar((mobile ? 0.66 : 1.25) * (1 + zoom * 0.5));
      spin += reduced
        ? 0
        : dt * (0.085 + Math.sin(Math.PI * Math.min(1, entry * 1.7)) * 8);
      orbit += reduced ? 0 : dt * (0.16 + entry * 1.6);
      sphere.rotation.y = spin;
      group.rotation.y += (mouse.current.x * 0.08 - group.rotation.y) * 0.05;
      stones.forEach((m, i) => {
        const a = (i / 9) * Math.PI * 2 + orbit;
        m.position.set(
          Math.cos(a) * 2.12,
          Math.sin(a) * 0.5,
          Math.sin(a) * 0.6,
        );
        m.rotation.y = a;
      });
      renderer.render(scene, camera);
    }
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const tick = (time) => {
      frame = 0;
      if (document.hidden || reduced) return;
      if (motion.current.paused) {
        frame = requestAnimationFrame(tick);
        previous = time;
        return;
      }
      if (time - last > (el.clientWidth < 720 ? 30 : 14)) {
        last = time;
        render(time);
      }
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      if (!frame && !document.hidden && !reduced)
        frame = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", resume);
    resume();
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
        }
      });
      texture?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reduced]);
  return (
    <>
      <div className="planet-canvas" ref={host} aria-hidden="true" />
      {fallback && <div className="planet-fallback" aria-hidden="true" />}
      <button
        className="planet-hit"
        aria-label="触碰灵星进入山门"
        onPointerMove={(event) => {
          mouse.current = {
            x: (event.clientX / window.innerWidth - 0.5) * 2,
            y: -(event.clientY / window.innerHeight - 0.5) * 2,
          };
        }}
        onPointerLeave={() => {
          mouse.current = { x: 0, y: 0 };
        }}
        onClick={onEnter}
        disabled={!enabled}
      />
    </>
  );
}
