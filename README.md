# Padel Racket Price Tracker

A web application that tracks and displays prices for the **Siux Electra Stupa Pro ST4 2025** padel racket across multiple online stores.

## Features

- **Product Display**: Shows the racket with image, specifications, and description
- **Live Price Comparison**: Displays current prices from 6 different stores
- **Historical Price Chart**: Interactive chart showing price trends over time
- **Daily Scraping**: Automated price collection at 8:00 AM daily
- **Manual Refresh**: Trigger price updates on-demand

## Tracked Stores

1. [Just Padel](https://justpadel.com)
2. [Passa Sports](https://www.passasports.nl)
3. [Holland Padel](https://hollandpadel.com)
4. [Tennis Voordeel](https://www.tennis-voordeel.nl)
5. [Decathlon NL](https://www.decathlon.nl)
6. [Padel Nuestro](https://www.padelnuestro.com)

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Scraping**: Puppeteer
- **Frontend**: Vanilla HTML/CSS/JS
- **Charts**: Chart.js
- **Scheduling**: node-cron

## Installation

```bash
# Install dependencies
npm install

# Seed sample data (optional, for testing)
node seed.js

# Start the server
npm start
```

The server will start on `http://localhost:3000`.

## Usage

### Web Interface

Open `http://localhost:3000` in your browser to view:
- The padel racket product page
- Current prices from all tracked stores
- Historical price chart
- List of tracked stores

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/product` | GET | Get product information |
| `/api/sites` | GET | List all tracked stores |
| `/api/prices` | GET | Get all price history (optional: `?days=30`) |
| `/api/prices/latest` | GET | Get latest price from each store |
| `/api/prices/:siteId` | GET | Get price history for a specific store |
| `/api/scrape` | POST | Trigger manual price scraping |

### Manual Scraping

You can run the scraper manually:

```bash
npm run scrape
```

Or trigger it via the API:

```bash
curl -X POST http://localhost:3000/api/scrape
```

## Configuration

### Adding a Racket Image

Place your racket image at:
```
public/images/siux-electra-st4-pro.png
```

### Scheduled Scraping

The scraper runs automatically at 8:00 AM daily. To modify the schedule, edit `server.js`:

```javascript
// Current: runs at 8:00 AM every day
cron.schedule('0 8 * * *', async () => {
  // ...
});
```

See [cron syntax](https://crontab.guru/) for schedule options.

## Project Structure

```
├── server.js          # Express server and API routes
├── database.js        # SQLite database setup
├── scraper.js         # Puppeteer web scraper
├── seed.js            # Sample data generator
├── package.json       # Project dependencies
├── prices.db          # SQLite database (created on first run)
└── public/
    ├── index.html     # Main webpage
    ├── styles.css     # Styling
    ├── app.js         # Frontend JavaScript
    └── images/        # Product images
```

## Troubleshooting

### Scraper not finding prices

The scraper uses generic CSS selectors to find prices. If a store changes its layout:

1. Check the site's HTML structure
2. Update the `scraperConfigs` object in `scraper.js`
3. Add site-specific selectors as needed

### Database issues

To reset the database:

```bash
rm prices.db
node -e "require('./database')"  # Recreate schema
node seed.js                      # Add sample data (optional)
```

## License

MIT
