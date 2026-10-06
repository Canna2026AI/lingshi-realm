import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
export default function Planet({
  progress,
  reduced,
  paused,
  onEnter,
  enabled,
}) {
  const host = useRef(),
    current = useRef(progress),
    [fallback, setFallback] = useState(false);
  current.current = progress;
  useEffect(() => {
    const el = host.current;
    let renderer,
      frame = 0,
      texture,
      alive = true,
      last = 0;
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
      render();
    });
    const ring = new THREE.Group();
    group.add(ring);
    ring.rotation.x = 0.5;
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
    const stones = Array.from({ length: 7 }, (_, i) => {
      const m = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.055 + (i % 3) * 0.02),
        new THREE.MeshStandardMaterial({ color: 0xd9ad67, roughness: 0.9 }),
      );
      ring.add(m);
      return m;
    });
    const starPositions = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
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
          size: 0.015,
          transparent: true,
          opacity: 0.65,
        }),
      ),
    );
    function render(time = 0) {
      if (!alive) return;
      const mobile = el.clientWidth < 720,
        p = reduced ? 0 : current.current;
      group.position.set(mobile ? 0 : 0.95, mobile ? -0.7 : 0, 0);
      group.scale.setScalar((mobile ? 0.65 : 1) * (1 + p * 0.9));
      sphere.rotation.y = reduced ? 0.4 : time * 0.000045;
      stones.forEach((m, i) => {
        const a = (i / 7) * Math.PI * 2 + (reduced ? 0 : time * 0.00008);
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
      if (document.hidden || paused || reduced) return;
      if (time - last > 32) {
        last = time;
        render(time);
      }
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      if (!frame && !document.hidden && !paused && !reduced)
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
  }, [reduced, paused]);
  return (
    <>
      <div className="planet-canvas" ref={host} aria-hidden="true" />
      {fallback && <div className="planet-fallback" aria-hidden="true" />}
      <button
        className="planet-hit"
        aria-label="触碰灵星进入山门"
        onClick={onEnter}
        disabled={!enabled}
      />
    </>
  );
}
