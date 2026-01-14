/**
 * Seed script to populate sample price history data for testing
 * Run with: node seed.js
 */

const db = require('./database');

// Sample price data - simulating 30 days of historical prices
const baseDate = new Date();
baseDate.setDate(baseDate.getDate() - 30);

// Price ranges per site (realistic EUR prices)
const sitePriceRanges = {
  1: { base: 299, variance: 20 },   // Just Padel
  2: { base: 285, variance: 15 },   // Passa Sports
  3: { base: 295, variance: 25 },   // Holland Padel
  4: { base: 279, variance: 10 },   // Tennis Voordeel
  5: { base: 319, variance: 30 },   // Decathlon NL
  6: { base: 269, variance: 20 }    // Padel Nuestro
};

console.log('Seeding price history data...');

const insertPrice = db.prepare(`
  INSERT INTO price_history (site_id, price, currency, scraped_at)
  VALUES (?, ?, 'EUR', ?)
`);

// Generate 30 days of data
for (let day = 0; day < 30; day++) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + day);
  const dateStr = date.toISOString().slice(0, 19).replace('T', ' ');

  for (let siteId = 1; siteId <= 6; siteId++) {
    const range = sitePriceRanges[siteId];

    // Add some price fluctuation over time
    const trendAdjustment = Math.sin(day / 5) * 10;
    const randomVariance = (Math.random() - 0.5) * range.variance;
    const price = Math.round((range.base + trendAdjustment + randomVariance) * 100) / 100;

    // Occasionally skip a price (simulating unavailable data)
    if (Math.random() > 0.95) {
      insertPrice.run(siteId, null, dateStr);
    } else {
      insertPrice.run(siteId, price, dateStr);
    }
  }
}

console.log('Sample data seeded successfully!');
console.log('');

// Show summary
const summary = db.prepare(`
  SELECT
    s.name,
    COUNT(ph.id) as data_points,
    MIN(ph.price) as min_price,
    MAX(ph.price) as max_price,
    ROUND(AVG(ph.price), 2) as avg_price
  FROM sites s
  LEFT JOIN price_history ph ON ph.site_id = s.id
  GROUP BY s.id
`).all();

console.log('Data summary:');
console.log('─'.repeat(70));
summary.forEach(row => {
  console.log(`${row.name.padEnd(20)} | Points: ${row.data_points.toString().padStart(3)} | ` +
    `Min: €${(row.min_price || 0).toFixed(2)} | Max: €${(row.max_price || 0).toFixed(2)} | ` +
    `Avg: €${(row.avg_price || 0).toFixed(2)}`);
});
