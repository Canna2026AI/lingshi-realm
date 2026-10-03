import test from "node:test";
import assert from "node:assert/strict";
import {
  freshState,
  generateHolders,
  units,
  applySnapshot,
  validateHolders,
  saveConfiguration,
  sortedHolders,
  parseState,
  weight,
} from "../src/engine.js";
test("20 valid unique addresses; balances do not exceed supply; boundary wallets", () => {
  const s = freshState(1000);
  assert.equal(s.holders.length, 20);
  validateHolders(s.holders, s.config.totalSupply);
  assert.equal(new Set(s.holders.map((h) => h.address)).size, 20);
  assert.equal(
    s.holders.filter((h) => units(h.balance, s.config.totalSupply) > 0).length,
    12,
  );
});
test("exact threshold and floor, including non-divisible supply", () => {
  assert.equal(units(999999, 1e9), 0);
  assert.equal(units(1000000, 1e9), 1);
  assert.equal(units(3000000, 1e9), 3);
  assert.equal(units(3500000, 1e9), 3);
  assert.equal(units(1000000, 1000000001), 0);
});
test("one snapshot is idempotent across serialized refresh", () => {
  const s = freshState(1000),
    next = applySnapshot(s, "round-1", 2000),
    loaded = parseState(JSON.stringify(next));
  assert.equal(loaded.round, 1);
  assert.equal(applySnapshot(loaded, "round-1", 3000), loaded);
  assert.equal(next.lastResult.participants, 12);
  assert.equal(next.lastResult.totalPills, 62);
});
test("12 pills yield one golden core and two remaining pills; weight 14", () => {
  let s = freshState(1000);
  const address = s.holders.find((h) => h.balance === 3500000).address;
  for (let i = 1; i <= 4; i++) s = applySnapshot(s, `round-${i}`, 1000 + i);
  const h = s.holders.find((h) => h.address === address);
  assert.equal(h.pills, 2);
  assert.equal(h.cores, 1);
  assert.equal(weight(h), 14);
});
test("multiple cores upgrade at once and every emitted reward matches ledger", () => {
  let s = freshState(1000);
  s.holders[0].pills = 8;
  const n = applySnapshot(s, "multi", 2000);
  assert.equal(n.holders[0].cores, 2);
  assert.equal(n.holders[0].pills, 6);
  for (const h of n.holders) {
    const old = s.holders.find((x) => x.address === h.address);
    const pills = n.events
      .filter((e) => e.type === "pill" && e.address === h.address)
      .reduce((a, e) => a + e.amount, 0);
    const cores = n.events
      .filter((e) => e.type === "core" && e.address === h.address)
      .reduce((a, e) => a + e.amount, 0);
    assert.equal(h.pills + 10 * (h.cores - old.cores), old.pills + pills);
    assert.equal(h.cores - old.cores, cores);
  }
});
test("ranking is balance based and unchanged by snapshots", () => {
  const s = freshState(),
    n = applySnapshot(s, "a");
  assert.deepEqual(
    sortedHolders(s.holders).map((h) => h.address),
    sortedHolders(n.holders).map((h) => h.address),
  );
  const d = s.holders.map((h) => ({ address: h.address, balance: h.balance }));
  d[19].balance = 19000000;
  const edited = saveConfiguration(n, s.config, d);
  assert.equal(sortedHolders(edited.holders)[0].address, d[19].address);
  assert.equal(edited.holders[0].cores, n.holders[0].cores);
});
test("invalid, duplicate and excessive balances rejected", () => {
  assert.throws(() => validateHolders([{ address: "0x123", balance: 1 }], 1e9));
  const h = generateHolders();
  assert.throws(() => validateHolders([...h, h[0]], 1e9));
  h[0].balance = 1e9;
  assert.throws(() => validateHolders(h, 1e9));
  h[0].balance = -1;
  assert.throws(() => validateHolders(h, 1e9));
});
test("CA reload, changed supply and period, system exclusions", () => {
  const s = freshState(1000);
  const cfg = {
    ...s.config,
    ca: "0x" + "a".repeat(40),
    totalSupply: 2e9,
    intervalMinutes: 5,
  };
  const n = saveConfiguration(s, cfg, s.holders, 3000);
  assert.equal(n.round, 0);
  assert.equal(n.nextAt, 303000);
  assert.equal(n.holders.find((h) => h.balance === 2000000).balance, 2000000);
  const excluded = {
    ...s,
    config: { ...s.config, excludedAddresses: [s.holders[0].address] },
  };
  assert.equal(applySnapshot(excluded, "r", 2000).holders[0].pills, 0);
});
