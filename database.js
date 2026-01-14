const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'prices.db'));

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    price REAL,
    currency TEXT DEFAULT 'EUR',
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id)
  );

  CREATE INDEX IF NOT EXISTS idx_price_history_site_date
  ON price_history(site_id, scraped_at);
`);

// Insert default sites if not exist
const sites = [
  {
    name: 'Just Padel',
    url: 'https://justpadel.com/products/siux-electra-st4-pro',
    color: '#FF6384'
  },
  {
    name: 'Passa Sports',
    url: 'https://www.passasports.nl/siux-electra-stupa-pro-st4-112639',
    color: '#36A2EB'
  },
  {
    name: 'Holland Padel',
    url: 'https://hollandpadel.com/collections/siux/products/siux-electra-stupa-pro-st4-2025',
    color: '#FFCE56'
  },
  {
    name: 'Tennis Voordeel',
    url: 'https://www.tennis-voordeel.nl/siux-electra-pro-st4/',
    color: '#4BC0C0'
  },
  {
    name: 'Decathlon NL',
    url: 'https://www.decathlon.nl/sporten/padel/padel-racket-volwassenen?pdt-highlight=dff12a42-2531-4069-b253-281e869ee61b',
    color: '#9966FF'
  },
  {
    name: 'Padel Nuestro',
    url: 'https://www.padelnuestro.com/int/siux-electra-stupa-pro-st4-2025',
    color: '#FF9F40'
  }
];

const insertSite = db.prepare(`
  INSERT OR IGNORE INTO sites (name, url, color) VALUES (?, ?, ?)
`);

for (const site of sites) {
  insertSite.run(site.name, site.url, site.color);
}

module.exports = db;
