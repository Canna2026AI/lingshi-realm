import React from "react";
import { useState } from "react";
import { Wallet, Search, ArrowRight } from "lucide-react";
import { Modal, Pill } from "./UI";
import {
  sortedHolders,
  number,
  shortAddress,
  units,
  percentage,
} from "../engine";
export default function WalletPicker({ state, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const rows = sortedHolders(state.holders).filter((h) =>
    h.address.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Modal title="选择你的修炼钱包" onClose={onClose}>
      <p className="modal-description">
        一枚灵石，一段仙途。选择地址，查看修炼状态。
      </p>
      <label className="search full">
        <Search size={16} />
        <input
          placeholder="搜索完整或部分地址"
          aria-label="搜索修炼钱包"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="wallet-options">
        {rows.map((h) => (
          <button
            className={`wallet-option ${h.address === state.selected ? "active" : ""}`}
            key={h.address}
            onClick={() => onSelect(h.address)}
          >
            <span className="wallet-avatar">
              <Wallet size={20} />
            </span>
            <span className="wallet-option-info">
              <b>
                {shortAddress(h.address)}
                {h.balance === 3500000 && <small>推荐体验</small>}
              </b>
              <span className="full-address">{h.address}</span>
              <span>
                {number(h.balance)} LINGSHI <i>·</i>{" "}
                {percentage(h.balance, state.config.totalSupply)}
              </span>
            </span>
            <span className="wallet-option-end">
              <span>
                {units(h.balance)
                  ? `${units(h.balance)} 修炼单位`
                  : "未达门槛"}
              </span>
              <ArrowRight size={17} />
            </span>
          </button>
        ))}
        {!rows.length && <p className="no-results">没有匹配的地址</p>}
      </div>
      <div className="modal-note">
        <Pill />
        选择钱包即可体验，无需连接浏览器钱包
      </div>
    </Modal>
  );
}
