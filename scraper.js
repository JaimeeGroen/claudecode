const axios = require('axios');
const cheerio = require('cheerio');
const db = require('./database');

// User agent to avoid bot detection
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Site-specific price extraction configurations
const scraperConfigs = {
  'justpadel.com': {
    selectors: ['.price-item--regular', '.product-price', '[class*="price"] .money', '.price .money'],
    extractPrice: extractEuroPrice
  },
  'passasports.nl': {
    selectors: ['.product-price', '.price', '[class*="price"]', '.woocommerce-Price-amount'],
    extractPrice: extractEuroPrice
  },
  'hollandpadel.com': {
    selectors: ['.price .money', '.product-price', '.price', '[class*="price"]'],
    extractPrice: extractEuroPrice
  },
  'tennis-voordeel.nl': {
    selectors: ['.price', '.woocommerce-Price-amount', '.product-price', '[class*="price"]'],
    extractPrice: extractEuroPrice
  },
  'decathlon.nl': {
    selectors: ['[data-testid="price"]', '.product-price', '.vtex-product-price', '[class*="price"]'],
    extractPrice: extractEuroPrice
  },
  'padelnuestro.com': {
    selectors: ['.current-price', '.price', '.product-price', '[class*="price"]'],
    extractPrice: extractEuroPrice
  }
};

// Extract Euro price from text
function extractEuroPrice(text) {
  if (!text) return null;

  // Clean the text
  const cleaned = text.replace(/\s+/g, ' ').trim();

  // Match various price formats: €299,00 | 299.00€ | EUR 299.00 | 299,00
  const patterns = [
    /€\s*([\d.,]+)/,
    /([\d.,]+)\s*€/,
    /EUR\s*([\d.,]+)/,
    /([\d.,]+)\s*EUR/,
    /^([\d.,]+)$/
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      // Handle European format (comma as decimal separator)
      let priceStr = match[1];

      // If we have both comma and dot, determine format
      if (priceStr.includes(',') && priceStr.includes('.')) {
        // European: 1.299,00 or US: 1,299.00
        if (priceStr.lastIndexOf(',') > priceStr.lastIndexOf('.')) {
          // European format
          priceStr = priceStr.replace(/\./g, '').replace(',', '.');
        } else {
          // US format
          priceStr = priceStr.replace(/,/g, '');
        }
      } else if (priceStr.includes(',')) {
        // Check if comma is decimal separator (e.g., 299,00)
        if (/,\d{2}$/.test(priceStr)) {
          priceStr = priceStr.replace(',', '.');
        } else {
          priceStr = priceStr.replace(',', '');
        }
      }

      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0 && price < 10000) {
        return price;
      }
    }
  }

  return null;
}

function getDomainConfig(url) {
  for (const [domain, config] of Object.entries(scraperConfigs)) {
    if (url.includes(domain)) {
      return config;
    }
  }
  return {
    selectors: ['.price', '[class*="price"]'],
    extractPrice: extractEuroPrice
  };
}

async function scrapePrice(url) {
  const config = getDomainConfig(url);

  try {
    console.log(`Scraping: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);

    // Try each selector until we find a price
    for (const selector of config.selectors) {
      const elements = $(selector);

      for (let i = 0; i < elements.length; i++) {
        const el = $(elements[i]);
        const text = el.text().trim();

        if (text) {
          const price = config.extractPrice(text);
          if (price) {
            console.log(`  Found price: €${price.toFixed(2)} (selector: ${selector})`);
            return price;
          }
        }
      }
    }

    // Fallback: search for price patterns in the full HTML
    const bodyText = $('body').text();
    const priceMatch = bodyText.match(/€\s*([\d.,]+)/);
    if (priceMatch) {
      const price = config.extractPrice(priceMatch[0]);
      if (price) {
        console.log(`  Found price (fallback): €${price.toFixed(2)}`);
        return price;
      }
    }

    console.log(`  Could not find price`);
    return null;

  } catch (error) {
    if (error.response) {
      console.error(`  HTTP Error ${error.response.status}: ${error.response.statusText}`);
    } else if (error.code === 'ECONNABORTED') {
      console.error(`  Timeout error`);
    } else {
      console.error(`  Error: ${error.message}`);
    }
    return null;
  }
}

async function runScraper() {
  console.log('Starting price scraper...');
  console.log('Date:', new Date().toISOString());
  console.log('');

  // Get all sites from database
  const sites = db.prepare('SELECT * FROM sites').all();

  const insertPrice = db.prepare(`
    INSERT INTO price_history (site_id, price, currency)
    VALUES (?, ?, 'EUR')
  `);

  for (const site of sites) {
    const price = await scrapePrice(site.url);
    insertPrice.run(site.id, price);
    console.log(`  Saved to database: ${site.name} = €${price ? price.toFixed(2) : 'N/A'}`);
    console.log('');

    // Small delay between requests to be polite
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('Scraping complete!');
}

// Run if called directly
if (require.main === module) {
  runScraper().catch(console.error);
}

module.exports = { runScraper, scrapePrice };
