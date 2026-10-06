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
  combineInventory,
  combineWallet,
  setAutoCombine,
  TIERS,
  emptyInventory,
} from "../src/engine.js";
test("20 valid unique addresses and exact fixed unit boundaries", () => {
  const s = freshState(1000);
  assert.equal(s.holders.length, 20);
  validateHolders(s.holders, s.config.totalSupply);
  assert.equal(new Set(s.holders.map((h) => h.address)).size, 20);
  assert.deepEqual(
    [units(99999), units(100000), units(350000), units(500000)],
    [0, 1, 3, 5],
  );
  assert.equal(s.config.intervalMinutes, 5);
});
test("snapshot is idempotent after refresh and emitted quantities match units", () => {
  const s = freshState(1000),
    n = applySnapshot(s, "r", 2000),
    loaded = parseState(JSON.stringify(n));
  assert.equal(applySnapshot(loaded, "r", 3000), loaded);
  assert.equal(
    n.lastResult.totalPills,
    s.holders.reduce((a, h) => a + units(h.balance), 0),
  );
  assert.equal(n.lastResult.participants, 17);
  for (const old of s.holders) {
    const h = n.holders.find((x) => x.address === old.address);
    const base = TIERS.reduce((a, t, i) => a + h[t.field] * 10 ** i, 0);
    assert.equal(base, units(old.balance));
  }
});
test("12 pills consume ten and retain two; 20 percent upgrade weight boost", () => {
  const { holder: h } = combineInventory({
    ...emptyInventory(),
    pills: 12,
    balance: 100000,
  });
  assert.equal(h.pills, 2);
  assert.equal(h.cores, 1);
  assert.equal(weight(h), 14);
  assert.equal(h.balance, 100000);
  for (let i = 0; i < 4; i++)
    assert.equal(TIERS[i + 1].weight, TIERS[i].weight * 10 * 1.2);
});
test("all five tiers cascade and conserve base materials including excess top tier", () => {
  const { holder: h } = combineInventory({
    ...emptyInventory(),
    pills: 234567,
  });
  assert.deepEqual(
    TIERS.map((t) => h[t.field]),
    [7, 6, 5, 4, 23],
  );
  assert.equal(
    TIERS.reduce((a, t, i) => a + h[t.field] * 10 ** i, 0),
    234567,
  );
});
test("automatic off retains pills; manual consumes once and rejects insufficient materials", () => {
  let s = freshState(0);
  const a = s.holders[0].address;
  s = setAutoCombine(s, a, false, 1);
  s = applySnapshot(s, "r", 2);
  assert.equal(s.holders[0].pills, 180);
  assert.equal(s.holders[0].cores, 0);
  const n = combineWallet(s, a, 0, 3);
  assert.equal(n.holders[0].pills, 170);
  assert.equal(n.holders[0].cores, 1);
  assert.equal(n.holders[0].balance, s.holders[0].balance);
  assert.throws(() => combineWallet(n, a, 1));
  assert.throws(() => combineWallet(n, a, 4));
  const on = setAutoCombine(n, a, true, 4);
  assert.deepEqual(
    TIERS.map((t) => on.holders[0][t.field]),
    [0, 8, 1, 0, 0],
  );
  assert.ok(on.events.some((e) => e.tier === "souls" && e.amount === 1));
});
test("rankings use their declared metric and stable tie breaking, no mutation", () => {
  const s = freshState(),
    n = applySnapshot(s, "r");
  assert.deepEqual(
    sortedHolders(s.holders).map((h) => h.address),
    sortedHolders(n.holders).map((h) => h.address),
  );
  const holders = s.holders.map((h, i) => ({
    ...h,
    ascensions: i === 19 ? 1 : 0,
  }));
  assert.equal(
    sortedHolders(holders, "weight")[0].address,
    holders[19].address,
  );
  assert.equal(
    sortedHolders(holders, "balance")[0].address,
    holders[0].address,
  );
  assert.deepEqual(
    holders.map((h) => h.address),
    s.holders.map((h) => h.address),
  );
});
test("legacy data migration preserves address balance pills cores and events", () => {
  const s = freshState(1000);
  s.version = 1;
  s.config.intervalMinutes = 10;
  delete s.config.unitTokens;
  s.holders = s.holders.map((h) => ({
    address: h.address,
    balance: h.balance,
    pills: 2,
    cores: 13,
    claimed: false,
  }));
  const n = parseState(JSON.stringify(s), 2000);
  assert.equal(n.version, 2);
  assert.equal(n.config.intervalMinutes, 5);
  assert.equal(n.holders[0].cores, 13);
  assert.equal(n.holders[0].pills, 2);
  assert.equal(n.holders[0].souls, 0);
  assert.equal(n.holders[0].balance, s.holders[0].balance);
  assert.deepEqual(n.events, s.events);
});
test("invalid balances addresses supply and inventory are rejected", () => {
  const h = generateHolders();
  assert.throws(() => validateHolders([...h, h[0]], 1e9));
  h[0].balance = 1e9;
  assert.throws(() => validateHolders(h, 1e9));
  const s = freshState();
  s.holders[0].souls = -1;
  assert.throws(() => parseState(JSON.stringify(s)));
  assert.throws(() => validateHolders([{ address: "0x123", balance: 1 }], 1e9));
});
test("configuration and exclusions, CA reload resets ledger", () => {
  const s = freshState(1000),
    cfg = {
      ...s.config,
      ca: "0x" + "a".repeat(40),
      totalSupply: 2e9,
      intervalMinutes: 10,
    };
  const n = saveConfiguration(s, cfg, s.holders, 3000);
  assert.equal(n.round, 0);
  assert.equal(n.nextAt, 603000);
  assert.equal(n.holders[0].balance, 36000000);
  const excluded = {
    ...s,
    config: { ...s.config, excludedAddresses: [s.holders[0].address] },
  };
  assert.equal(weight(applySnapshot(excluded, "r", 2000).holders[0]), 0);
});
