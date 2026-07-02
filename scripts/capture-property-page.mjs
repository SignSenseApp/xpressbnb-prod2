import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { readFileSync } from 'fs';

const OUT = 'd:/xpx/project/tmp-review';
await mkdir(OUT, { recursive: true });

function loadEnv() {
  const raw = readFileSync('d:/xpx/project/.env', 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    env[t.slice(0, i)] = t.slice(i + 1);
  }
  return env;
}

const env = loadEnv();
const baseUrl = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

const res = await fetch(`${baseUrl}/rest/v1/properties?select=id,title&is_active=eq.true&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const rows = await res.json();
const id = rows?.[0]?.id;
if (!id) {
  console.error('No property id from API');
  process.exit(1);
}

const propertyUrl = `http://localhost:5174/property/${id}`;
console.log('Reviewing:', propertyUrl, rows[0].title);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(propertyUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
for (let i = 0; i < 3; i++) await page.keyboard.press('Escape');

await page.screenshot({ path: `${OUT}/property-desktop-top.png` });
await page.screenshot({ path: `${OUT}/property-desktop-full.png`, fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(propertyUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await mobile.waitForTimeout(8000);
for (let i = 0; i < 3; i++) await mobile.keyboard.press('Escape');
await mobile.screenshot({ path: `${OUT}/property-mobile-top.png` });
await mobile.screenshot({ path: `${OUT}/property-mobile-full.png`, fullPage: true });

await browser.close();
console.log('Screenshots saved');
