import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudOperationIsCurrent, mergeHydratedProgress, waitForCloudStartup } from '../src/cloud-sync.mjs';

test('cloud writes and hydration results belong only to the user that started them', () => {
  assert.equal(cloudOperationIsCurrent('user-a', { uid: 'user-a' }), true);
  assert.equal(cloudOperationIsCurrent('user-a', { uid: 'user-b' }), false);
  assert.equal(cloudOperationIsCurrent('user-a', null), false);
});

test('cloud startup stops blocking the local app after its deadline', async () => {
  const neverSettles = new Promise(() => {});
  const outcome = await waitForCloudStartup(neverSettles, 5);
  assert.deepEqual(outcome, { timedOut: true });
});

test('cloud startup returns an on-time synchronization result', async () => {
  const outcome = await waitForCloudStartup(Promise.resolve({ configured: true }), 100);
  assert.deepEqual(outcome, { timedOut: false, value: { configured: true } });
});

test('late hydration keeps newer local settings while preserving merged cloud progress', () => {
  const latestLocal = {
    dailyCount: 30,
    nextIndex: 10,
    cohorts: [{ id:'local', learnedDate:'2026-09-08', wordIds:['w1'], updatedAt:'2026-09-08T10:00:00.000Z' }],
    updatedAt: '2026-09-08T10:00:00.000Z',
  };
  const committedHydration = {
    dailyCount: 20,
    nextIndex: 20,
    cohorts: [{ id:'remote', learnedDate:'2026-09-07', wordIds:['w2'], updatedAt:'2026-09-07T10:00:00.000Z' }],
    updatedAt: '2026-09-08T10:00:05.000Z',
  };
  const merged = mergeHydratedProgress(latestLocal, committedHydration, '2026-09-07T10:00:00.000Z');
  assert.equal(merged.dailyCount, 30);
  assert.equal(merged.nextIndex, 20);
  assert.deepEqual(merged.cohorts.map(cohort => cohort.learnedDate), ['2026-09-08', '2026-09-07']);
  assert.equal(merged.updatedAt, committedHydration.updatedAt);
});
