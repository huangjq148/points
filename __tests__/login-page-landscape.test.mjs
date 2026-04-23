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
  await page.locator('body').waitFor({ state: 'visible' });

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
    await page.getByRole('heading', { name: '欢迎登录' }).waitFor({ state: 'visible' });
    await page.getByText('账号统一登录，系统会自动进入对应身份页面').waitFor({ state: 'visible' });
  } finally {
    await context.close();
    await browser.close();
  }
});

test('login shell adapts between landscape and portrait layouts', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  const landscapeContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const portraitContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const landscapePage = await landscapeContext.newPage();
  const portraitPage = await portraitContext.newPage();
  landscapePage.setDefaultTimeout(5000);
  portraitPage.setDefaultTimeout(5000);

  await Promise.all([
    landscapePage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 }),
    portraitPage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 }),
  ]);
  assert.equal(landscapePage.url(), `${BASE_URL}/login`);
  assert.equal(portraitPage.url(), `${BASE_URL}/login`);

  await Promise.all([
    landscapePage.locator('body').waitFor({ state: 'visible' }),
    portraitPage.locator('body').waitFor({ state: 'visible' }),
  ]);

  try {
    const landscapeShellLocator = landscapePage.locator('.login-shell');
    const portraitShellLocator = portraitPage.locator('.login-shell');

    await Promise.all([
      landscapeShellLocator.waitFor({ state: 'attached' }),
      portraitShellLocator.waitFor({ state: 'attached' }),
    ]);

    const landscapeShell = await landscapeShellLocator.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
      };
    });

    const portraitShell = await portraitShellLocator.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
      };
    });

    assert.notEqual(
      landscapeShell.display,
      'none',
      `landscape shell should be visible, got ${JSON.stringify(landscapeShell)}`,
    );
    assert.ok(
      portraitShell.display === 'none' || portraitShell.gridTemplateColumns.startsWith('1fr'),
      `portrait shell should hide or collapse to a single column, got ${JSON.stringify(portraitShell)}`,
    );
  } finally {
    await portraitContext.close();
    await landscapeContext.close();
    await browser.close();
  }
});
