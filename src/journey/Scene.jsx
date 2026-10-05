import React, { useEffect, useRef, useState } from 'react';
import { clamp, realmImages } from './timeline';
import HoldStone from './HoldStone';
export const art = name => `/images/journey/${name}.webp`;
function Talismans({ finale = false }) {
  return <div className={`j-talismans ${finale ? 'finale' : ''}`} aria-hidden="true">
    {Array.from({ length: finale ? 7 : 5 }, (_, i) => <img key={i} src={art('talisman')} alt="" draggable="false" style={{ '--i': i, '--tx': `${[12, 81, 27, 65, 43, 88, 8][i]}%`, '--ty': `${[20, 28, 77, 75, 17, 78, 53][i]}%`, '--turn': `${(i % 2 ? -1 : 1) * (12 + i * 9)}deg` }} />)}
  </div>;
}
export default function Scene({ scene, progress, realm, reduced, interactive, onTransform, holding, restart, credits }) {
  const p = reduced ? 0 : progress;
  const previousRealm = useRef(realm), [reveal, setReveal] = useState(null);
  useEffect(() => {
    if (previousRealm.current === realm) return;
    const old = previousRealm.current; previousRealm.current = realm;
    if (reduced || scene.id !== 'realms') return;
    setReveal({ old, current: realm });
    const timer = setTimeout(() => setReveal(null), 1150);
    return () => clearTimeout(timer);
  }, [realm, reduced, scene.id]);
  const image = scene.image || (scene.id === 'realms' ? realmImages[realm] : null);
  const backgroundStyle = { '--p': p };
  let scale = 1.04 + p * .2, x = -p * 3, y = 0, rotate = 0;
  if (scene.id === 'cosmos') { scale += p * .55; x = -p * 9; rotate = p * 4; }
  if (scene.id === 'mountain') { scale += p * .5; x = -p * 8; }
  if (scene.id === 'meditation') { scale += p * .3; x = -p * 7; }
  if (scene.id === 'talismans') { scale += p * .45; x = -p * 4; }
  if (scene.id === 'descent') { scale = 1.1 + p * 5; y = -p * 8; rotate = p * 8; }
  backgroundStyle.transform = `translate(calc(${x}% + var(--jx, 0px)), calc(${y}% + var(--jy, 0px))) scale(${scale}) rotate(${rotate}deg)`;
  return <div className={`j-scene scene-${scene.id} ${scene.light ? 'light-scene' : ''}`} style={{ '--scene-progress': p }}>
    {image && <div className="j-art-wrap"><img className="j-art" src={art(image)} alt="" aria-hidden="true" style={backgroundStyle} draggable="false" /></div>}
    {scene.id === 'realms' && reveal && <div className="j-realm-reveal" key={reveal.current} aria-hidden="true"><img className="j-art" src={art(realmImages[reveal.old])} alt="" style={backgroundStyle} /><img className="j-art j-new-realm" src={art(realmImages[reveal.current])} alt="" style={backgroundStyle} /></div>}
    {scene.id === 'panorama' && <div className="j-world-strip" style={{ transform: `translateX(${-clamp(progress) * 200 / 3}%)` }} aria-hidden="true">
      {realmImages.map((name, i) => <div key={name}><img src={art(name)} alt="" /><img className="j-distant-stone" src={art('stone')} alt="" /><span>{['赤霞', '青岚', '玄霜'][i]}</span></div>)}
    </div>}
    {scene.id === 'gate' && <img className="j-pilgrim opening-pilgrim" src={art('pilgrim')} alt="" aria-hidden="true" />}
    {scene.id === 'mountain' && <img className="j-pilgrim climbing-pilgrim" src={art('pilgrim')} alt="" aria-hidden="true" />}
    {scene.id === 'realms' && <>
      <img className="j-pilgrim realm-pilgrim" src={art('pilgrim')} alt="" aria-hidden="true" />
      {interactive ? <HoldStone onTransform={onTransform} holding={holding} reduced={reduced} /> : <img className="j-stone-static" src={art('stone')} alt="" aria-hidden="true" />}
    </>}
    {(scene.id === 'talismans' || scene.id === 'ending') && <Talismans finale={scene.id === 'ending'} />}
    {scene.id === 'descent' && <div className="j-descent-rays" aria-hidden="true" style={{ opacity: progress * .7 }} />}
    {scene.id !== 'credits' && <div className="j-copy">
      <h1>{scene.title}</h1>
      <p>{scene.lines.map(line => <React.Fragment key={line}>{line}<br /></React.Fragment>)}</p>
      {scene.id === 'realms' && <span className="j-realm-name" aria-live={interactive ? 'polite' : 'off'}>{['赤霞境', '青岚境', '玄霜境'][realm]}</span>}
      {scene.id === 'gate' && <span className="j-scroll-hint">↓ <span>向下滚动 / 滑动</span></span>}
      {scene.id === 'ending' && interactive && <div className="j-end-actions"><a href="/realm">进入仙宗 <span>↗</span></a><button onClick={restart}>重新启程 <span>↺</span></button></div>}
    </div>}
    {scene.id === 'credits' && <div className="j-flow-credits"><span>灵石仙宗</span><h1>仙途未尽</h1><p>感谢每一位踏入仙宗的修行者。<br />愿你心中有光，脚下有路。</p><button onClick={restart}>重新启程 ↺</button><button onClick={credits}>制作鸣谢 ↗</button></div>}
  </div>;
}
