import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const taskPage = readFileSync('app/child/task/page.tsx', 'utf8');
const childCss = readFileSync('app/styles/child.css', 'utf8');

test('child task filters keep paired controls in equal-width rows on narrow screens', () => {
  assert.match(taskPage, /child-task-filter-selects/, 'task page should group the two select filters');
  assert.match(taskPage, /child-task-filter-dates/, 'task page should group the two date filters');
  assert.doesNotMatch(
    taskPage,
    /wrapperClassName='w-full rounded-\[18px\]'/,
    'task select filters should not use a larger radius than date filters',
  );
  assert.match(
    taskPage,
    /wrapperClassName='w-full rounded-\[14px\]'/,
    'task select filters should use the same 14px radius as date filters',
  );
  assert.match(
    childCss,
    /\.child-task-filter-selects\s+\.select-surface\s+\.react-select__control\s*{[\s\S]*?border-radius:\s*14px/,
    'task select controls should override the global select-surface 18px radius',
  );

  assert.match(
    childCss,
    /\.child-task-filter-selects[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    'select filters should use two equal-width columns',
  );
  assert.match(
    childCss,
    /\.child-task-filter-dates[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    'date filters should use the same two equal-width columns as select filters',
  );
  assert.doesNotMatch(
    childCss,
    /@media\s*\(max-width:\s*1100px\)[\s\S]*?\.child-task-filter-layout\s*{[\s\S]*?grid-template-columns:\s*1fr/,
    'tablet layout should not collapse all filters into a single column',
  );
});
