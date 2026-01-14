// Static data for GitHub Pages (no backend API available)
const sites = [
  { id: 1, name: 'Just Padel', url: 'https://www.justpadel.nl/siux-electra-stupa-pro-st4-2025', color: '#FF6384' },
  { id: 2, name: 'Passa Sports', url: 'https://www.passasports.nl/siux-electra-st4-pro', color: '#36A2EB' },
  { id: 3, name: 'Holland Padel', url: 'https://www.hollandpadel.nl/siux-electra-stupa-pro', color: '#FFCE56' },
  { id: 4, name: 'Tennis Voordeel', url: 'https://www.tennisvoordeel.nl/siux-electra-st4', color: '#4BC0C0' },
  { id: 5, name: 'Decathlon NL', url: 'https://www.decathlon.nl/siux-electra-stupa', color: '#9966FF' },
  { id: 6, name: 'Padel Nuestro', url: 'https://www.padelnuestro.com/siux-electra-stupa-pro-st4', color: '#FF9F40' }
];

// Demo prices (since we can't fetch from API on static hosting)
const demoPrices = [
  { site_id: 1, site_name: 'Just Padel', color: '#FF6384', price: 279.95, currency: 'EUR', scraped_at: new Date().toISOString() },
  { site_id: 2, site_name: 'Passa Sports', color: '#36A2EB', price: 289.00, currency: 'EUR', scraped_at: new Date().toISOString() },
  { site_id: 3, site_name: 'Holland Padel', color: '#FFCE56', price: 274.99, currency: 'EUR', scraped_at: new Date().toISOString() },
  { site_id: 4, site_name: 'Tennis Voordeel', color: '#4BC0C0', price: 284.95, currency: 'EUR', scraped_at: new Date().toISOString() },
  { site_id: 5, site_name: 'Decathlon NL', color: '#9966FF', price: 299.99, currency: 'EUR', scraped_at: new Date().toISOString() },
  { site_id: 6, site_name: 'Padel Nuestro', color: '#FF9F40', price: 269.00, currency: 'EUR', scraped_at: new Date().toISOString() }
];

// Generate demo price history for chart
function generatePriceHistory(days) {
  const history = [];
  const now = new Date();

  sites.forEach(site => {
    const basePrice = demoPrices.find(p => p.site_id === site.id)?.price || 280;

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Add some variation to make the chart interesting
      const variation = (Math.sin(i * 0.5 + site.id) * 10) + (Math.random() * 5 - 2.5);
      const price = Math.round((basePrice + variation) * 100) / 100;

      history.push({
        site_id: site.id,
        site_name: site.name,
        color: site.color,
        price: price,
        scraped_at: date.toISOString()
      });
    }
  });

  return history;
}

// Global variables
let priceChart = null;
let allPrices = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  renderStoresList();
  renderPrices();
  loadPriceHistory();

  // Event listener for chart period selection
  document.getElementById('daysSelect').addEventListener('change', loadPriceHistory);
});

// Render latest prices
function renderPrices() {
  const container = document.getElementById('priceCards');
  const prices = demoPrices;

  // Find lowest price
  const validPrices = prices.filter(p => p.price !== null);
  const lowestPrice = validPrices.length > 0
    ? Math.min(...validPrices.map(p => p.price))
    : null;

  // Render price cards with links to stores
  container.innerHTML = prices.map(price => {
    const site = sites.find(s => s.id === price.site_id);
    return `
      <a href="${site.url}" target="_blank" rel="noopener" class="price-card-link">
        <div class="price-card" style="--card-color: ${price.color}">
          ${price.price === lowestPrice ? '<span class="lowest-badge">Lowest</span>' : ''}
          <div class="store-name">${price.site_name}</div>
          <div class="price ${price.price === null ? 'unavailable' : ''}">
            ${price.price !== null ? `€${price.price.toFixed(2)}` : 'Price unavailable'}
          </div>
          <div class="last-updated">Click to visit store</div>
        </div>
      </a>
    `;
  }).join('');
}

// Load price history and render chart
function loadPriceHistory() {
  const days = parseInt(document.getElementById('daysSelect').value);
  allPrices = generatePriceHistory(days);
  renderChart();
}

// Render the price chart
function renderChart() {
  const ctx = document.getElementById('priceChart').getContext('2d');

  // Group prices by site
  const siteData = {};
  allPrices.forEach(price => {
    if (!siteData[price.site_id]) {
      siteData[price.site_id] = {
        name: price.site_name,
        color: price.color,
        data: []
      };
    }
    if (price.price !== null) {
      siteData[price.site_id].data.push({
        x: new Date(price.scraped_at),
        y: price.price
      });
    }
  });

  // Create datasets
  const datasets = Object.values(siteData).map(site => ({
    label: site.name,
    data: site.data,
    borderColor: site.color,
    backgroundColor: site.color + '20',
    fill: false,
    tension: 0.3,
    pointRadius: 4,
    pointHoverRadius: 6
  }));

  // Destroy existing chart
  if (priceChart) {
    priceChart.destroy();
  }

  // Create new chart
  priceChart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: €${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'MMM d'
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#94a3b8'
          }
        },
        y: {
          beginAtZero: false,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#94a3b8',
            callback: function(value) {
              return '€' + value;
            }
          }
        }
      }
    }
  });

  // Render custom legend
  renderChartLegend(siteData);
}

// Render custom chart legend
function renderChartLegend(siteData) {
  const container = document.getElementById('chartLegend');
  container.innerHTML = Object.values(siteData).map(site => `
    <div class="legend-item">
      <div class="legend-color" style="background: ${site.color}"></div>
      <span>${site.name}</span>
    </div>
  `).join('');
}

// Render stores list
function renderStoresList() {
  const container = document.getElementById('storesList');

  container.innerHTML = sites.map(site => {
    const hostname = new URL(site.url).hostname;
    return `
      <div class="store-item">
        <div class="store-color" style="background: ${site.color}"></div>
        <div class="store-info">
          <div class="store-name">${site.name}</div>
          <div class="store-url">
            <a href="${site.url}" target="_blank" rel="noopener">${hostname}</a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
