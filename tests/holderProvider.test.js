import test from "node:test";
import assert from "node:assert/strict";
import {
  freshState,
  applySnapshot,
  combineWallet,
  sortedHolders,
} from "../src/engine.js";
import {
  MockHolderProvider,
  BscHolderProvider,
  upsertWallet,
  refreshHolderData,
} from "../src/holderProvider.js";
const address = "0x1234567890123456789012345678901234567890";
test("wallet lookup is stable, bounded by supply, retains inventory, and never awards a snapshot", async () => {
  const provider = new MockHolderProvider(),
    state = freshState(1000);
  const data = await provider.lookup({ address, state });
  const next = upsertWallet(state, data);
  assert.equal(next.round, state.round);
  assert.deepEqual(next.events, state.events);
  assert.ok(
    next.holders.reduce((n, h) => n + h.balance, 0) <= state.config.totalSupply,
  );
  const again = upsertWallet(
    next,
    await provider.lookup({
      address: address.toUpperCase().replace("0X", "0x"),
      state: next,
    }),
  );
  assert.equal(again.holders.length, next.holders.length);
  assert.equal(again.selected, next.selected);
  const funded = {
    ...again,
    holders: again.holders.map((h) =>
      h.address === address ? { ...h, pills: 12 } : h,
    ),
  };
  assert.equal(
    upsertWallet(funded, data).holders.find((h) => h.address === address).pills,
    12,
  );
});
test("backend snapshot followed by wallet forge consumes existing pills without changing holdings", async () => {
  const state = freshState(1000),
    h = state.holders[5];
  h.autoCombine = false;
  const provider = new MockHolderProvider();
  const refreshed = refreshHolderData(state, await provider.load({ state }));
  const snap = applySnapshot(refreshed, "admin:1", 2000);
  const before = snap.holders[5];
  const after = combineWallet(snap, h.address, 0, 3000).holders[5];
  assert.equal(before.pills, 35);
  assert.equal(after.pills, 25);
  assert.equal(after.cores, 1);
  assert.equal(after.balance, h.balance);
  assert.equal(combineWallet(snap, h.address, 0, 3000).round, 1);
});
test("external holder service gets CA/address parameters and refreshes actual indexed balances", async () => {
  const state = freshState(1000),
    ca = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  let requested;
  const provider = new BscHolderProvider(
    "https://index.example/api/holders",
    async (url) => {
      requested = new URL(url);
      return {
        ok: true,
        json: async () => ({
          totalSupply: 1000000000,
          holders: [
            { address, balance: 800000 },
            { address: state.holders[0].address, balance: 100000 },
          ],
          updatedAt: 2000,
        }),
      };
    },
  );
  const data = await provider.load({ ca, chainId: 56 });
  assert.equal(requested.searchParams.get("ca"), ca);
  assert.equal(requested.searchParams.get("chainId"), "56");
  const next = refreshHolderData(state, data);
  assert.equal(next.holders.length, 2);
  assert.equal(sortedHolders(next.holders)[0].address, address);
  assert.equal((await provider.lookup({ ca, address })).balance, 800000);
  assert.equal(requested.searchParams.get("address"), address);
});
test("holder API failures do not silently substitute mock or mutate ledger", async () => {
  const ca = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const provider = new BscHolderProvider(
    "https://index.example/api/holders",
    async () => ({ ok: false, status: 503 }),
  );
  await assert.rejects(provider.load({ ca }), /503/);
  const invalid = new BscHolderProvider(
    "https://index.example/api/holders",
    async () => ({
      ok: true,
      json: async () => ({
        totalSupply: 1000000,
        holders: [{ address, balance: 2000000 }],
        updatedAt: 2000,
      }),
    }),
  );
  await assert.rejects(invalid.load({ ca }), /不能超过/);
  await assert.rejects(
    new MockHolderProvider().lookup({ address: "0x123", state: freshState() }),
    /42/,
  );
});
