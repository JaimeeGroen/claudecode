// Global variables
let priceChart = null;
let allPrices = [];
let sites = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  loadPrices();
  loadPriceHistory();

  // Event listeners
  document.getElementById('refreshBtn').addEventListener('click', triggerScrape);
  document.getElementById('daysSelect').addEventListener('change', loadPriceHistory);
});

// Load all sites
async function loadSites() {
  try {
    const response = await fetch('/api/sites');
    sites = await response.json();
    renderStoresList();
  } catch (error) {
    console.error('Failed to load sites:', error);
  }
}

// Load latest prices
async function loadPrices() {
  const container = document.getElementById('priceCards');

  try {
    const response = await fetch('/api/prices/latest');
    const prices = await response.json();

    if (prices.length === 0) {
      container.innerHTML = `
        <div class="no-data">
          <p>No price data available yet. Click "Refresh Prices" to start scraping.</p>
        </div>
      `;
      return;
    }

    // Find lowest price
    const validPrices = prices.filter(p => p.price !== null);
    const lowestPrice = validPrices.length > 0
      ? Math.min(...validPrices.map(p => p.price))
      : null;

    // Update last update time
    const latestUpdate = prices.find(p => p.scraped_at);
    if (latestUpdate) {
      const date = new Date(latestUpdate.scraped_at);
      document.getElementById('lastUpdate').textContent = date.toLocaleString();
    }

    // Render price cards
    container.innerHTML = prices.map(price => `
      <div class="price-card" style="--card-color: ${price.color}">
        ${price.price === lowestPrice ? '<span class="lowest-badge">Lowest</span>' : ''}
        <div class="store-name">${price.site_name}</div>
        <div class="price ${price.price === null ? 'unavailable' : ''}">
          ${price.price !== null ? `€${price.price.toFixed(2)}` : 'Price unavailable'}
        </div>
        <div class="last-updated">
          ${price.scraped_at ? `Updated: ${new Date(price.scraped_at).toLocaleString()}` : 'Not yet scraped'}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load prices:', error);
    container.innerHTML = '<div class="loading">Failed to load prices</div>';
  }
}

// Load price history and render chart
async function loadPriceHistory() {
  const days = document.getElementById('daysSelect').value;

  try {
    const response = await fetch(`/api/prices?days=${days}`);
    allPrices = await response.json();
    renderChart();
  } catch (error) {
    console.error('Failed to load price history:', error);
  }
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

// Trigger manual scrape
async function triggerScrape() {
  const btn = document.getElementById('refreshBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">&#8987;</span> Scraping...';

  try {
    const response = await fetch('/api/scrape', { method: 'POST' });
    const result = await response.json();

    if (result.success) {
      // Reload data after scraping
      await Promise.all([loadPrices(), loadPriceHistory()]);
      btn.innerHTML = '<span class="btn-icon">&#10003;</span> Done!';
      setTimeout(() => {
        btn.innerHTML = '<span class="btn-icon">&#8635;</span> Refresh Prices';
        btn.disabled = false;
      }, 2000);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Scraping failed:', error);
    btn.innerHTML = '<span class="btn-icon">&#10007;</span> Failed';
    setTimeout(() => {
      btn.innerHTML = '<span class="btn-icon">&#8635;</span> Refresh Prices';
      btn.disabled = false;
    }, 2000);
  }
}
