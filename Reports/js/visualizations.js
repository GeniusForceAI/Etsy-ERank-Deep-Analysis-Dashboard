/**
 * Visualizations for Etsy Analytics Dashboard
 * Handles creating and updating all charts and visualizations
 */

class Visualizations {
    constructor() {
        this.charts = {};
        this.colorPalette = [
            '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
            '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
        ];
        
        // Default chart options for consistency
        Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        Chart.defaults.color = '#6c757d';
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
    }

    /**
     * Initialize all charts with data
     * @param {Object} data - The processed data object
     */
    initializeCharts(data) {
        this.createViewsSalesChart(data);
        this.createAgeDistributionChart(data);
        this.createPriceDistributionChart(data);
        this.createPricePerformanceChart(data);
        this.createTopSellersViewsChart(data);
        this.createTopSellersRevenueChart(data);
        this.createKeywordCloud(data);
    }

    /**
     * Create the Views vs Sales scatter chart
     * @param {Object} data - The processed data object
     */
    createViewsSalesChart(data) {
        const ctx = document.getElementById('views-sales-chart').getContext('2d');
        
        // Prepare data points
        const dataPoints = data.listings.map(item => ({
            x: item.totalViews,
            y: item.estSales,
            r: Math.max(3, Math.min(20, item.estRevenue / 20)), // Size based on revenue, min 3, max 20
            price: item.price,
            shop: item.shop,
            listing: item.listing.substring(0, 30) + '...',
            hearts: item.hearts
        }));
        
        this.charts.viewsSales = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Listings',
                    data: dataPoints,
                    backgroundColor: dataPoints.map(point => {
                        // Color based on price
                        const priceRatio = point.price / data.summary.priceRange.max;
                        return `rgba(${Math.round(priceRatio * 255)}, ${Math.round((1 - priceRatio) * 255)}, 150, 0.7)`;
                    }),
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                }]
            },
            options: {
                aspectRatio: 1.5,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Total Views'
                        },
                        type: 'logarithmic',
                        ticks: {
                            callback: function(value) {
                                if (value === 10 || value === 100 || value === 1000 || value === 10000) {
                                    return value.toString();
                                }
                                return '';
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Estimated Sales'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                return [
                                    `Shop: ${point.shop}`,
                                    `Listing: ${point.listing}`,
                                    `Views: ${point.x}`,
                                    `Sales: ${point.y}`,
                                    `Price: $${point.price.toFixed(2)}`,
                                    `Hearts: ${point.hearts}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create the Age Distribution chart
     * @param {Object} data - The processed data object
     */
    createAgeDistributionChart(data) {
        const ctx = document.getElementById('age-distribution-chart').getContext('2d');
        
        const ageBrackets = data.summary.ageBrackets;
        
        this.charts.ageDistribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ageBrackets.map(bracket => bracket.range),
                datasets: [{
                    label: 'Number of Listings',
                    data: ageBrackets.map(bracket => bracket.count),
                    backgroundColor: this.colorPalette[0],
                    borderWidth: 0
                }, {
                    label: 'Average Views',
                    data: ageBrackets.map(bracket => bracket.averageViews.toFixed(1)),
                    backgroundColor: this.colorPalette[1],
                    borderWidth: 0,
                    yAxisID: 'y1'
                }]
            },
            options: {
                aspectRatio: 1.5,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Listings'
                        }
                    },
                    y1: {
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Average Views'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    /**
     * Create the Price Distribution chart
     * @param {Object} data - The processed data object
     */
    createPriceDistributionChart(data) {
        const ctx = document.getElementById('price-distribution-chart').getContext('2d');
        
        const priceBrackets = data.summary.priceBrackets;
        
        this.charts.priceDistribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: priceBrackets.map(bracket => bracket.range),
                datasets: [{
                    label: 'Number of Listings',
                    data: priceBrackets.map(bracket => bracket.count),
                    backgroundColor: this.colorPalette[2],
                    borderWidth: 0
                }]
            },
            options: {
                aspectRatio: 1.5,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Listings'
                        }
                    }
                }
            }
        });
    }

    /**
     * Create the Price Performance chart
     * @param {Object} data - The processed data object
     */
    createPricePerformanceChart(data) {
        const ctx = document.getElementById('price-performance-chart').getContext('2d');
        
        const priceBrackets = data.summary.priceBrackets;
        
        this.charts.pricePerformance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: priceBrackets.map(bracket => bracket.range),
                datasets: [{
                    label: 'Average Views',
                    data: priceBrackets.map(bracket => bracket.averageViews.toFixed(1)),
                    borderColor: this.colorPalette[3],
                    backgroundColor: 'rgba(118, 183, 178, 0.2)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                }, {
                    label: 'Average Sales',
                    data: priceBrackets.map(bracket => bracket.averageSales.toFixed(2)),
                    borderColor: this.colorPalette[4],
                    backgroundColor: 'rgba(89, 161, 79, 0.2)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                aspectRatio: 1.5,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Average Views'
                        }
                    },
                    y1: {
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Average Sales'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    /**
     * Create the Top Sellers by Views chart
     * @param {Object} data - The processed data object
     */
    createTopSellersViewsChart(data) {
        const ctx = document.getElementById('top-sellers-views-chart').getContext('2d');
        
        // Get top 10 sellers by views
        const topSellers = data.sellers.slice(0, 10);
        const otherSellers = data.sellers.slice(10);
        const otherViews = otherSellers.reduce((sum, seller) => sum + seller.totalViews, 0);
        
        // Add an "Others" category
        const chartData = [...topSellers, {
            name: 'Others',
            totalViews: otherViews
        }];
        
        this.charts.topSellersViews = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: chartData.map(seller => seller.name),
                datasets: [{
                    data: chartData.map(seller => seller.totalViews),
                    backgroundColor: this.colorPalette.concat(['#dddddd']) // Use gray for "Others"
                }]
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value.toLocaleString()} views (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create the Top Sellers by Revenue chart
     * @param {Object} data - The processed data object
     */
    createTopSellersRevenueChart(data) {
        const ctx = document.getElementById('top-sellers-revenue-chart').getContext('2d');
        
        // Get top 10 sellers by revenue
        const revenueRanked = [...data.sellers].sort((a, b) => b.totalRevenue - a.totalRevenue);
        const topRevenueSellers = revenueRanked.slice(0, 10);
        const otherSellers = revenueRanked.slice(10);
        const otherRevenue = otherSellers.reduce((sum, seller) => sum + seller.totalRevenue, 0);
        
        // Add an "Others" category
        const chartData = [...topRevenueSellers, {
            name: 'Others',
            totalRevenue: otherRevenue
        }];
        
        this.charts.topSellersRevenue = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.map(seller => seller.name),
                datasets: [{
                    data: chartData.map(seller => seller.totalRevenue),
                    backgroundColor: this.colorPalette.concat(['#dddddd']) // Use gray for "Others"
                }]
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create the Keyword Cloud visualization
     * @param {Object} data - The processed data object
     */
    createKeywordCloud(data) {
        // Prepare data for the word cloud
        const keywords = data.keywords.slice(0, 50).map(keyword => ({
            text: keyword.text,
            weight: keyword.count,
            html: {
                title: `Count: ${keyword.count}, Avg Views: ${keyword.averageViews.toFixed(1)}`
            },
            handlers: {
                click: function() {
                    console.log(`Clicked on keyword: ${keyword.text}`);
                    // Optional: Add a filter action here
                }
            }
        }));
        
        // Initialize the word cloud when the script is loaded
        const loadScript = () => {
            if (typeof $.fn.jQCloud !== 'undefined') {
                $('#keyword-cloud').jQCloud(keywords, {
                    width: $('#keyword-cloud').width(),
                    height: 400,
                    colors: this.colorPalette,
                    fontSize: {
                        from: 0.1,
                        to: 0.02
                    }
                });

                // Update the keywords table
                this.updateKeywordsTable(data.keywords.slice(0, 20));
                
                return true;
            }
            return false;
        };
        
        // Try to initialize now or wait for the script to load
        if (!loadScript()) {
            // If jQCloud isn't loaded yet, add link to the head
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/jqcloud2@2.0.3/dist/jqcloud.min.css';
            document.head.appendChild(link);
            
            // Try again when window is loaded
            window.addEventListener('load', loadScript);
        }
    }

    /**
     * Update the keywords table with data
     * @param {Array} keywords - The keywords data
     */
    updateKeywordsTable(keywords) {
        const tableBody = document.getElementById('keywords-table');
        tableBody.innerHTML = '';
        
        keywords.forEach(keyword => {
            const row = document.createElement('tr');
            
            const keywordCell = document.createElement('td');
            keywordCell.textContent = keyword.text;
            
            const countCell = document.createElement('td');
            countCell.textContent = keyword.count;
            
            const viewsCell = document.createElement('td');
            viewsCell.textContent = keyword.averageViews.toFixed(1);
            
            row.appendChild(keywordCell);
            row.appendChild(countCell);
            row.appendChild(viewsCell);
            
            tableBody.appendChild(row);
        });
    }

    /**
     * Update the listings table with data
     * @param {Array} listings - The listings data to display
     */
    updateListingsTable(listings) {
        const tableBody = document.getElementById('listings-table');
        tableBody.innerHTML = '';
        
        // Limit to top 50 for performance
        const displayListings = listings.slice(0, 50);
        
        displayListings.forEach(item => {
            const row = document.createElement('tr');
            
            const shopCell = document.createElement('td');
            shopCell.textContent = item.shop;
            
            const listingCell = document.createElement('td');
            // Truncate long listing names
            listingCell.textContent = item.listing.length > 50 
                ? item.listing.substring(0, 50) + '...' 
                : item.listing;
            listingCell.title = item.listing; // Show full title on hover
            
            const ageCell = document.createElement('td');
            ageCell.textContent = item.age;
            
            const viewsCell = document.createElement('td');
            viewsCell.textContent = item.totalViews.toLocaleString();
            
            const dailyViewsCell = document.createElement('td');
            dailyViewsCell.textContent = item.dailyViews.toLocaleString();
            
            const salesCell = document.createElement('td');
            salesCell.textContent = item.estSales.toLocaleString();
            
            const priceCell = document.createElement('td');
            priceCell.textContent = `$${item.price.toFixed(2)}`;
            
            const revenueCell = document.createElement('td');
            revenueCell.textContent = `$${item.estRevenue.toLocaleString()}`;
            
            const heartsCell = document.createElement('td');
            heartsCell.textContent = item.hearts.toLocaleString();
            
            row.appendChild(shopCell);
            row.appendChild(listingCell);
            row.appendChild(ageCell);
            row.appendChild(viewsCell);
            row.appendChild(dailyViewsCell);
            row.appendChild(salesCell);
            row.appendChild(priceCell);
            row.appendChild(revenueCell);
            row.appendChild(heartsCell);
            
            tableBody.appendChild(row);
        });
    }

    /**
     * Update summary metrics display
     * @param {Object} summary - The summary metrics object
     */
    updateSummaryMetrics(summary) {
        document.getElementById('total-listings').textContent = summary.totalListings.toLocaleString();
        document.getElementById('total-views').textContent = summary.totalViews.toLocaleString();
        document.getElementById('total-sales').textContent = summary.totalSales.toLocaleString();
        document.getElementById('total-revenue').textContent = `$${summary.totalRevenue.toLocaleString()}`;
        document.getElementById('avg-price').textContent = `$${summary.averagePrice.toFixed(2)}`;
        document.getElementById('total-hearts').textContent = summary.totalHearts.toLocaleString();
    }
}
