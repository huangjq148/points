import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOrderActionResult } from '../../utils/orderActions.mjs';

test('resolveOrderActionResult surfaces backend failure message', () => {
  const result = resolveOrderActionResult(
    { success: false, message: '该特权奖励已过期' },
    '核销成功',
    '核销失败',
  );

  assert.deepEqual(result, {
    success: false,
    message: '该特权奖励已过期',
  });
});

test('resolveOrderActionResult falls back when failure message is missing', () => {
  const result = resolveOrderActionResult({ success: false }, '核销成功', '核销失败');

  assert.deepEqual(result, {
    success: false,
    message: '核销失败',
  });
});
