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
    await page.getByRole('heading', { name: '小小奋斗者' }).waitFor({ state: 'visible' });
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

test('login page presents an immersive family growth entry visual', { timeout: 120000 }, async () => {
  const { browser, context, page } = await openLoginPage({ width: 1440, height: 900 });

  try {
    await page.locator('.login-hero-stage').waitFor({ state: 'visible' });
    await page.locator('.login-growth-art').waitFor({ state: 'visible' });
    await page.getByText('家庭积分成长入口').waitFor({ state: 'visible' });
    assert.equal(
      await page.locator('.login-visual-row').count(),
      0,
      'old stacked status-card visual should not be used',
    );
    assert.equal(
      await page.locator('.login-mobile-summary').count(),
      0,
      'mobile-only fallback text should not leak into desktop layout',
    );
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
    const landscapeBrandLocator = landscapePage.locator('.login-brand-panel');
    const landscapeFormLocator = landscapePage.locator('.login-form-panel');
    const portraitBrandLocator = portraitPage.locator('.login-brand-panel');
    const portraitFormLocator = portraitPage.locator('.login-form-panel');

    await Promise.all([
      landscapeShellLocator.waitFor({ state: 'attached' }),
      portraitShellLocator.waitFor({ state: 'attached' }),
      landscapeBrandLocator.waitFor({ state: 'attached' }),
      landscapeFormLocator.waitFor({ state: 'attached' }),
      portraitBrandLocator.waitFor({ state: 'attached' }),
      portraitFormLocator.waitFor({ state: 'attached' }),
    ]);

    const landscapeLayout = await landscapePage.evaluate(() => {
      const shell = document.querySelector('.login-shell');
      const brand = document.querySelector('.login-brand-panel');
      const form = document.querySelector('.login-form-panel');
      if (!shell || !brand || !form) {
        return null;
      }

      const shellStyle = window.getComputedStyle(shell);
      const brandRect = brand.getBoundingClientRect();
      const formRect = form.getBoundingClientRect();

      return {
        display: shellStyle.display,
        brand: {
          left: brandRect.left,
          top: brandRect.top,
          right: brandRect.right,
          bottom: brandRect.bottom,
          width: brandRect.width,
          height: brandRect.height,
        },
        form: {
          left: formRect.left,
          top: formRect.top,
          right: formRect.right,
          bottom: formRect.bottom,
          width: formRect.width,
          height: formRect.height,
        },
      };
    });

    const portraitLayout = await portraitPage.evaluate(() => {
      const shell = document.querySelector('.login-shell');
      const brand = document.querySelector('.login-brand-panel');
      const form = document.querySelector('.login-form-panel');
      if (!shell || !brand || !form) {
        return null;
      }

      const shellStyle = window.getComputedStyle(shell);
      const brandRect = brand.getBoundingClientRect();
      const formRect = form.getBoundingClientRect();

      return {
        display: shellStyle.display,
        brand: {
          left: brandRect.left,
          top: brandRect.top,
          right: brandRect.right,
          bottom: brandRect.bottom,
          width: brandRect.width,
          height: brandRect.height,
        },
        form: {
          left: formRect.left,
          top: formRect.top,
          right: formRect.right,
          bottom: formRect.bottom,
          width: formRect.width,
          height: formRect.height,
        },
      };
    });

    assert.ok(landscapeLayout, 'landscape layout should be measurable');
    assert.ok(portraitLayout, 'portrait layout should be measurable');

    assert.notEqual(
      landscapeLayout.display,
      'none',
      `landscape shell should be visible, got ${JSON.stringify(landscapeLayout)}`,
    );
    assert.ok(
      landscapeLayout.form.left >= landscapeLayout.brand.right - 2,
      `landscape panels should sit side by side, got ${JSON.stringify(landscapeLayout)}`,
    );
    assert.ok(
      Math.abs(landscapeLayout.form.top - landscapeLayout.brand.top) <= 2,
      `landscape panels should start on the same row, got ${JSON.stringify(landscapeLayout)}`,
    );

    assert.notEqual(
      portraitLayout.display,
      'none',
      `portrait shell should stay usable, got ${JSON.stringify(portraitLayout)}`,
    );
    assert.ok(
      Math.abs(portraitLayout.form.left - portraitLayout.brand.left) <= 2,
      `portrait panels should align to one column, got ${JSON.stringify(portraitLayout)}`,
    );
    assert.ok(
      portraitLayout.form.top >= portraitLayout.brand.bottom - 2,
      `portrait form should stack below the brand panel, got ${JSON.stringify(portraitLayout)}`,
    );
  } finally {
    await portraitContext.close();
    await landscapeContext.close();
    await browser.close();
  }
});
