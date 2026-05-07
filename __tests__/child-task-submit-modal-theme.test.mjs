import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const childCss = readFileSync('app/styles/child.css', 'utf8');

function cssBlock(selector) {
  const match = childCss.match(new RegExp(`${selector.replaceAll('.', '\\.')}\\s*{([\\s\\S]*?)\\n}`));
  return match?.[1] ?? '';
}

test('child task submit modal uses theme variables instead of hard-coded dark surfaces', () => {
  const modalBlock = cssBlock('.child-task-submit-modal');
  const heroBlock = cssBlock('.child-task-submit-hero');
  const surfaceBlock = cssBlock('.child-task-submit-surface');
  const uploadBlock = cssBlock('.child-task-submit-upload');

  assert.match(modalBlock, /var\(--child-surface-strong\)/);
  assert.match(heroBlock, /var\(--child-surface-strong\)/);
  assert.match(surfaceBlock, /var\(--child-surface-strong\)/);
  assert.match(uploadBlock, /var\(--child-surface/);

  for (const [label, block] of Object.entries({
    modalBlock,
    heroBlock,
    surfaceBlock,
    uploadBlock,
  })) {
    assert.doesNotMatch(
      block,
      /rgba\((15,\s*23,\s*42|30,\s*41,\s*59|51,\s*65,\s*85)/,
      `${label} should not hard-code dark theme slate backgrounds`,
    );
  }
});
