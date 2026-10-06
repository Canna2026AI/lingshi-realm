import React, { useState } from "react";
import { TIERS, UNIT_TOKENS, number } from "../engine";
export const flowArt = (name) => `/images/flow/${name}.webp`;
export default function Gallery({ config }) {
  const [selected, setSelected] = useState(1);
  const items = [
    {
      name: "灵石",
      asset: "spirit-stone",
      description: `每持有 ${number(UNIT_TOKENS)} LINGSHI 计为一个修炼单位，单位数量向下取整。持有不消耗灵石。`,
      function: "灵石是修炼资格，不是合丹材料。",
    },
    ...TIERS.map((t, i) => ({
      ...t,
      description:
        i === 0
          ? `每个修炼单位，在宗门执行一次快照后获得一颗筑基丹。`
          : `消耗 10 个${TIERS[i - 1].name}，合成 1 个${t.name}。余下材料保留。`,
      function: `分配权重 ${t.weight}${i > 0 ? " · 比十个低阶材料高 20%" : ""}。分配金额取决于实际池收入及全网权重。`,
    })),
  ];
  const item = items[selected];
  return (
    <>
      <div className="gallery-object" key={item.asset}>
        <img src={flowArt(item.asset)} alt={item.name} />
      </div>
      <div className="gallery-description" aria-live="polite">
        <h2>{item.name}</h2>
        <p>{item.description}</p>
        <small>{item.function}</small>
      </div>
      <div className="gallery-rail" role="group" aria-label="灵物图鉴">
        {items.map((t, i) => (
          <button
            key={t.asset}
            aria-label={`查看${t.name}功能`}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            <img src={flowArt(t.asset)} alt="" />
            <span>{t.name}</span>
            <i />
          </button>
        ))}
      </div>
    </>
  );
}
