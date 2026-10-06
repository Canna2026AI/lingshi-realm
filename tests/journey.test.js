import test from "node:test";
import assert from "node:assert/strict";
import {
  scenes,
  totalSpan,
  sceneOffset,
  positionAt,
  holdProgress,
  HOLD_MS,
  nextRealm,
} from "../src/journey/timeline.js";
test("scroll boundaries select adjacent scenes without skipping or duplicating", () => {
  scenes.forEach((scene, index) => {
    const start = sceneOffset(index);
    assert.equal(positionAt(start + 1e-6).index, index);
    if (index) assert.equal(positionAt(start - 1e-6).index, index - 1);
  });
  assert.equal(positionAt(-20).index, 0);
  assert.equal(positionAt(totalSpan + 100).index, scenes.length - 1);
  assert.equal(positionAt(totalSpan).overall, 1);
});
test("long press only reaches completion at full duration; three realms cycle", () => {
  assert.equal(holdProgress(-50), 0);
  assert.ok(holdProgress(HOLD_MS - 1) < 1);
  assert.equal(holdProgress(HOLD_MS), 1);
  assert.equal(holdProgress(HOLD_MS * 2), 1);
  assert.deepEqual([nextRealm(0), nextRealm(1), nextRealm(2)], [1, 2, 0]);
});

import { createCharge } from "../src/journey/charge.js";
test("held input completes once and repeated frames cannot switch another realm", () => {
  const charge = createCharge();
  assert.equal(charge.begin(100), true);
  assert.equal(charge.begin(900), false);
  assert.equal(charge.sample(100 + HOLD_MS - 1).completed, false);
  assert.equal(charge.sample(100 + HOLD_MS).completed, true);
  assert.deepEqual(charge.sample(100 + HOLD_MS * 3), {
    progress: 0,
    completed: false,
  });
});
test("release cancels partial charge; next press starts a fresh full duration", () => {
  const charge = createCharge();
  charge.begin(0);
  assert.ok(charge.sample(700).progress > 0);
  charge.cancel();
  assert.deepEqual(charge.sample(2000), { progress: 0, completed: false });
  assert.equal(charge.begin(2100), true);
  assert.equal(charge.sample(2800).completed, false);
  assert.equal(charge.sample(2100 + HOLD_MS).completed, true);
});

import { transitionAt } from "../src/journey/timeline.js";
test("opening spins before fading and both travel modes finish without an endpoint jump", () => {
  assert.equal(transitionAt(1000, true).mix, 0);
  assert.ok(transitionAt(1000, true).launch > 0);
  for (const launching of [false, true]) {
    const duration = launching ? 3600 : 2400;
    let prior = 0;
    for (let ms = 0; ms <= duration; ms += 100) {
      const stage = transitionAt(ms, launching);
      assert.ok(stage.mix >= prior && stage.mix <= 1);
      assert.equal(stage.done, ms >= duration);
      prior = stage.mix;
    }
    assert.ok(transitionAt(duration - 1, launching).mix > 0.999);
    assert.equal(transitionAt(duration, launching).mix, 1);
  }
});
