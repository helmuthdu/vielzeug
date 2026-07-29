import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

await page.goto('http://localhost:4322/');
await page.waitForTimeout(500);
await page.locator('ore-navbar-item[aria-label="Orders"]').first().click();
await page.waitForTimeout(500);

// Clone the first real order-card <li> and stuff it with lots of content to stress-test.
await page.evaluate(() => {
  const list = document.querySelector('.orders-view__list');
  const template = list.querySelector('li');
  const clone = template.cloneNode(true);

  const idEl = clone.querySelector('.order-card__id');

  if (idEl) idEl.textContent = 'order-1001-VERY-LONG-REFERENCE-NUMBER-9988776655';

  const itemsList = clone.querySelector('.order-card__items');

  if (itemsList) {
    itemsList.innerHTML = '';

    const names = [
      'Vielzeug R350 Executive Grand Touring Limousine Deluxe Edition',
      'Vielzeug X600 AS All-Wheel-Drive Performance Package',
      'Vielzeug A200 Compact City Runabout',
      'Vielzeug Z900 Turbo Sport Coupe',
      'Vielzeug M100 Micro EV',
      'Vielzeug T750 Long-Range Touring Sedan',
      'Vielzeug K400 Family Crossover SUV',
    ];

    for (let i = 0; i < 12; i++) {
      const li = document.createElement('li');

      li.textContent = `${names[i % names.length]} × ${i + 1}`;
      itemsList.appendChild(li);
    }
  }

  list.insertBefore(clone, template);
});
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/repro-full.png', fullPage: true });

const firstCard = page.locator('.orders-view__list ore-card').first();
const box = await firstCard.boundingBox();

console.log('stuffed card box:', box);

const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);

console.log('page scrollWidth:', scrollW);

// zoom into first card only
await firstCard.screenshot({ path: '/tmp/repro-card.png' });

await browser.close();
