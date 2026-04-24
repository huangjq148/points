import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('table action group uses compact icon-only styling', async () => {
  const source = await readFile(new URL('../components/ui/TableActionGroup.tsx', import.meta.url), 'utf8');

  assert.match(source, /h-8 w-8/, 'action buttons should shrink to a compact 32px square');
  assert.match(source, /rounded-xl/, 'action buttons should use a smaller corner radius');
  assert.match(source, /gap-1/, 'action group should keep a tight icon spacing');

  assert.doesNotMatch(source, /rounded-\[18px\]/, 'legacy pill shell should be removed');
  assert.doesNotMatch(source, /backdrop-blur-sm/, 'action group should no longer rely on a floating blurred shell');
  assert.doesNotMatch(source, /bg-\[var\(--ui-action-blue-bg\)\]/, 'neutral actions should avoid heavy colored fills');
});
