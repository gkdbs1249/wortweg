import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudOperationIsCurrent } from '../src/cloud-sync.mjs';

test('cloud writes and hydration results belong only to the user that started them', () => {
  assert.equal(cloudOperationIsCurrent('user-a', { uid: 'user-a' }), true);
  assert.equal(cloudOperationIsCurrent('user-a', { uid: 'user-b' }), false);
  assert.equal(cloudOperationIsCurrent('user-a', null), false);
});
