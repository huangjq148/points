import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

async function openLoginPage(viewport) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert.equal(page.url(), `${BASE_URL}/login`);

  return { browser, context, page };
}

test('login page shows the unified login copy and removes role/register controls', { timeout: 120000 }, async () => {
  const { browser, context, page } = await openLoginPage({ width: 1440, height: 900 });

  try {
    assert.equal(
      await page.getByRole('button', { name: '家长登录' }).count(),
      0,
    );
    assert.equal(
      await page.getByRole('button', { name: '孩子登录' }).count(),
      0,
    );
    assert.equal(
      await page.getByRole('button', { name: /点击注册|已有账号/ }).count(),
      0,
    );
    assert.equal(await page.getByRole('heading', { name: '欢迎登录' }).count(), 1);
    assert.equal(await page.getByText('账号统一登录，系统会自动进入对应身份页面').count(), 1);
  } finally {
    await context.close();
    await browser.close();
  }
});

test('login shell adapts between landscape and portrait layouts', { timeout: 120000 }, async () => {
  const landscape = await openLoginPage({ width: 1440, height: 900 });
  const portrait = await openLoginPage({ width: 430, height: 932 });

  try {
    const landscapeShell = await landscape.page.locator('.login-shell').evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
      };
    });

    const portraitShell = await portrait.page.locator('.login-shell').evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
      };
    });

    assert.notEqual(landscapeShell.display, 'none');
    assert.ok(
      portraitShell.display === 'none' || portraitShell.gridTemplateColumns.startsWith('1fr'),
      `portrait shell should collapse to a single column or hide entirely, got ${JSON.stringify(portraitShell)}`,
    );
  } finally {
    await portrait.context.close();
    await portrait.browser.close();
    await landscape.context.close();
    await landscape.browser.close();
  }
});
