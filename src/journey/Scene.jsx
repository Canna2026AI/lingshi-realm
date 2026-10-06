import React, { lazy, Suspense } from "react";
const Planet = lazy(() => import("./Planet"));
import Gallery, { flowArt } from "./Gallery";
import Alchemy from "./Alchemy";
import RealmBoard from "./RealmBoard";
export const art = (name) => `/images/journey/${name}.webp`;
export default function Scene({
  scene,
  progress,
  reduced,
  interactive,
  holding,
  realm,
  next,
  restart,
  paused,
  ready,
  launch,
}) {
  const p = reduced ? 0 : progress;
  return (
    <div
      className={`j-scene scene-${scene.id} ${scene.light ? "light-scene" : ""}`}
      style={{ "--scene-progress": p }}
      inert={!interactive ? true : undefined}
    >
      {scene.image && (
        <div className="j-art-wrap">
          <img
            className="j-art"
            src={scene.flow ? flowArt(scene.image) : art(scene.image)}
            alt=""
            style={{
              transform: `translate(var(--jx),var(--jy)) scale(${1.04 + p * 0.18})`,
            }}
            draggable="false"
          />
        </div>
      )}
      {scene.id === "planet" && (
        <>
          <div className="planet-sky" />
          <div className="planet-landscape" />
          <div className="planet-aura" style={{ opacity: launch * 0.5 }} />
          <Suspense fallback={<div className="planet-fallback" />}>
            <Planet
              progress={p}
              launch={launch}
              reduced={reduced}
              paused={paused}
              onEnter={next}
              enabled={ready && interactive}
            />
          </Suspense>
        </>
      )}
      {scene.id === "gate" && (
        <img
          className="j-pilgrim opening-pilgrim"
          src={art("pilgrim")}
          alt=""
        />
      )}
      {scene.id !== "leaderboard" && (
        <div className="j-copy">
          <h1>{scene.title}</h1>
          <p>
            {scene.lines.map((line) => (
              <React.Fragment key={line}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </p>
          {["planet", "gate"].includes(scene.id) && (
            <button
              className="journey-action scene-action"
              disabled={!ready}
              onClick={next}
            >
              {scene.id === "planet"
                ? ready
                  ? "踏入仙途 →"
                  : "正在展开画卷…"
                : scene.id === "gate"
                  ? "进入洞府 →"
                  : "继续修行 →"}
            </button>
          )}
          {scene.id === "planet" && !ready && (
            <small className="planet-load">素材正在加载，请稍候。</small>
          )}
        </div>
      )}
      {scene.id === "gallery" && <Gallery config={realm.state.config} />}
      {["furnace", "combine"].includes(scene.id) && (
        <Alchemy
          key={scene.id}
          mode={scene.id}
          realm={realm}
          interactive={interactive}
          reduced={reduced}
          holding={holding}
        />
      )}
      {["gallery", "furnace", "combine"].includes(scene.id) && (
        <button className="scene-next" onClick={next}>
          {scene.id === "gallery"
            ? "继续修行 →"
            : scene.id === "furnace"
              ? "下一步 · 十丹结金 →"
              : "查看天骄榜 →"}
        </button>
      )}
      {scene.id === "leaderboard" && (
        <RealmBoard realm={realm} notice={realm.notice} restart={restart} />
      )}
    </div>
  );
}
