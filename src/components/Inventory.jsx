import "./inventory.css";
import React, { useState } from "react";
import { TIERS, combineWallet, setAutoCombine } from "../engine";
export default function Inventory({ holder, update, notice }) {
  const [busy, setBusy] = useState(false);
  const run = async (action) => {
    setBusy(true);
    try {
      await update(action);
    } catch (e) {
      notice(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ledger-inventory">
      <div className="inventory-tiers">
        {TIERS.map((t) => (
          <div key={t.field}>
            <img src={`/images/flow/${t.asset}.webp`} alt="" />
            <span>{t.name}</span>
            <b>{holder[t.field]}</b>
            <small>权重 {t.weight}</small>
          </div>
        ))}
      </div>
      <label className="inventory-auto">
        <input
          type="checkbox"
          checked={holder.autoCombine}
          disabled={busy}
          onChange={(e) => {
            const enabled = e.target.checked;
            run((s) => setAutoCombine(s, holder.address, enabled));
          }}
        />
        自动十合一 <small>开启时同时合成已有材料</small>
      </label>
      <div className="inventory-actions">
        {TIERS.slice(0, -1).map((t, i) => (
          <button
            key={t.field}
            disabled={busy || holder[t.field] < 10}
            onClick={() => run((s) => combineWallet(s, holder.address, i))}
          >
            合成{TIERS[i + 1].name}
            <small>消耗 10 {t.name}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
