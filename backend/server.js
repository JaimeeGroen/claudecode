const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const db = require('./database');
const { runScraper } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// Get all sites
app.get('/api/sites', (req, res) => {
  try {
    const sites = db.prepare('SELECT * FROM sites').all();
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get price history for all sites
app.get('/api/prices', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const prices = db.prepare(`
      SELECT
        ph.id,
        ph.site_id,
        s.name as site_name,
        s.color,
        ph.price,
        ph.currency,
        ph.scraped_at
      FROM price_history ph
      JOIN sites s ON s.id = ph.site_id
      WHERE ph.scraped_at >= datetime('now', '-${days} days')
      ORDER BY ph.scraped_at ASC
    `).all();

    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get latest prices for all sites
app.get('/api/prices/latest', (req, res) => {
  try {
    const latestPrices = db.prepare(`
      SELECT
        s.id as site_id,
        s.name as site_name,
        s.url,
        s.color,
        ph.price,
        ph.currency,
        ph.scraped_at
      FROM sites s
      LEFT JOIN price_history ph ON ph.id = (
        SELECT id FROM price_history
        WHERE site_id = s.id
        ORDER BY scraped_at DESC
        LIMIT 1
      )
    `).all();

    res.json(latestPrices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get price history for a specific site
app.get('/api/prices/:siteId', (req, res) => {
  try {
    const { siteId } = req.params;
    const days = parseInt(req.query.days) || 30;

    const prices = db.prepare(`
      SELECT
        ph.id,
        ph.price,
        ph.currency,
        ph.scraped_at
      FROM price_history ph
      WHERE ph.site_id = ?
        AND ph.scraped_at >= datetime('now', '-${days} days')
      ORDER BY ph.scraped_at ASC
    `).all(siteId);

    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger manual scrape (for testing)
app.post('/api/scrape', async (req, res) => {
  try {
    await runScraper();
    res.json({ success: true, message: 'Scraping completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product info (static for now)
app.get('/api/product', (req, res) => {
  res.json({
    name: 'Siux Electra Stupa Pro ST4 2025',
    description: 'The official racket of Franco Stupaczuk for 2025. A high-performance padel racket designed for advanced players who seek power, precision, and maximum spin.',
    specs: {
      shape: 'Hybrid',
      weight: '355-375g',
      balance: 'Medium',
      frame: '3K Carbon',
      surface: '15K Carbon',
      core: 'EVA Hard',
      level: 'Advanced/Expert'
    },
    image: '/images/siux-electra-st4-pro.png'
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Schedule daily scraping at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('Running scheduled price scrape...');
  try {
    await runScraper();
    console.log('Scheduled scrape completed');
  } catch (error) {
    console.error('Scheduled scrape failed:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  /              - Main website`);
  console.log(`  GET  /api/product   - Product info`);
  console.log(`  GET  /api/sites     - List all tracked sites`);
  console.log(`  GET  /api/prices    - Price history (all sites)`);
  console.log(`  GET  /api/prices/latest - Latest prices`);
  console.log(`  POST /api/scrape    - Trigger manual scrape`);
  console.log('');
  console.log('Daily scraping scheduled for 8:00 AM');
});
