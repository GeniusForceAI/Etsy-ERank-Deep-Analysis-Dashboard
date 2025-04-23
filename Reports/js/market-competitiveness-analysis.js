/**
 * Market Competitiveness Analysis for Etsy Dashboard
 * Provides insights on market share, views per sale, and listing competitiveness metrics
 */

// Debug flag to help troubleshoot visualization issues
const DEBUG_MCA = true;

// Function to initialize market competitiveness analysis visualizations
function initMarketCompetitivenessAnalysis() {
    if (DEBUG_MCA) console.log('Initializing Market Competitiveness Analysis. filteredData available:', typeof window.filteredData !== 'undefined', window.filteredData ? window.filteredData.length : 0);
    
    // Call all visualization functions
    generateViewsPerSaleChart();
    generateMarketShareChart();
    generatePercentageMetricsTable();
}

/**
 * Generate the Views Per Sale Analysis chart
 * Lower values indicate higher conversion efficiency
 */
function generateViewsPerSaleChart() {
    if (DEBUG_MCA) console.log('Generating Views Per Sale chart');
    
    // Get chart container
    const ctx = document.getElementById('views-per-sale-chart');
    if (!ctx) {
        console.error('Chart container for Views Per Sale not found');
        return;
    }
    
    // Get available data - using either filteredData or rawData
    const availableData = getAvailableData();
    if (!availableData) {
        console.warn('No data available - cannot generate Views Per Sale chart');
        renderSampleViewsPerSaleChart();
        return;
    }
    
    if (DEBUG_MCA) console.log(`Found ${availableData.length} items for Views Per Sale chart`);

    // Sort data by views per sale (conversion efficiency)
    let sortedData = [];
    
    try {
        sortedData = availableData
            .filter(item => {
                const sales = item.estSales || item['Est. Sales'] || 0;
                return sales > 0; // Only include items with sales
            })
            .map(item => {
                // Handle both processed data and raw data formats
                const totalViews = item.totalViews || item['Total Views'] || 0;
                const estSales = item.estSales || item['Est. Sales'] || 0;
                const shopListing = item['Shop / Listing'] || '';
                
                // Extract shop and listing from the combined field if available
                let shop = item.shop || '';
                let listing = '';
                
                if (!shop && shopListing.includes(':')) {
                    const parts = shopListing.split(':');
                    shop = parts[0].trim();
                    listing = parts[1].trim();
                } else if (!shop) {
                    shop = 'Unknown Shop';
                    listing = shopListing;
                }
                
                if (!listing) {
                    listing = shopListing;
                }
                
                // Clean up any quotes
                if (listing.startsWith('"')) listing = listing.substring(1);
                if (listing.endsWith('"')) listing = listing.substring(0, listing.length - 1);
                
                // Calculate views per sale
                const viewsPerSale = parseFloat((totalViews / Math.max(estSales, 1)).toFixed(2));
                
                return {
                    listing: listing || 'Unknown Listing',
                    shop: shop,
                    viewsPerSale: viewsPerSale,
                    views: totalViews,
                    sales: estSales,
                    fullTitle: shopListing || listing
                };
            })
            .sort((a, b) => parseFloat(a.viewsPerSale) - parseFloat(b.viewsPerSale)) // Sort by lowest views per sale first (most efficient)
            .slice(0, 5); // Take top 5 most efficient
    } catch (e) {
        console.error('Error processing data for Views Per Sale chart:', e);
    }
        
    if (sortedData.length === 0) {
        if (DEBUG_MCA) console.log('No items with sales found, using sample data');
        renderSampleViewsPerSaleChart();
        return; // Important to return after rendering sample data
    }
    
    if (DEBUG_MCA) console.log(`Found ${sortedData.length} items with sales data for Views Per Sale chart`);
    if (DEBUG_MCA) console.log('Using REAL DATA for Views Per Sale chart - first item:', sortedData[0]);

    // Prepare chart data - use full names when possible but truncate if too long
    const labels = sortedData.map(item => {
        // Use the actual listing name from the data
        let label = item.listing;
        // Truncate long names for display purposes
        if (label.length > 20) {
            label = label.substring(0, 20) + '...';
        }
        return label;
    });
    
    const data = sortedData.map(item => parseFloat(item.viewsPerSale));
    
    // Create or update chart
    if (window.viewsPerSaleChart) {
        window.viewsPerSaleChart.destroy();
    }

    window.viewsPerSaleChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Views Per Sale',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => {
                            const idx = tooltipItems[0].dataIndex;
                            return sortedData[idx].fullTitle;
                        },
                        label: (tooltipItem) => {
                            const idx = tooltipItem.dataIndex;
                            return [
                                `Views Per Sale: ${sortedData[idx].viewsPerSale}`,
                                `Total Views: ${sortedData[idx].views}`,
                                `Sales: ${sortedData[idx].sales}`
                            ];
                        }
                    }
                },
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Most Efficient Converters (Lower is Better)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Views Per Sale'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Listing'
                    }
                }
            }
        }
    });
}

function renderSampleViewsPerSaleChart() {
    if (DEBUG_MCA) console.log('Rendering SAMPLE Views Per Sale chart - NO REAL DATA AVAILABLE');
    
    // Get the canvas element
    const canvas = document.getElementById('views-per-sale-chart');
    if (!canvas) {
        console.error('Views Per Sale chart canvas not found');
        return;
    }
    
    // Sample data for views per sale
    const sampleData = [
        { listing: 'Listing A', viewsPerSale: 12 },
        { listing: 'Listing B', viewsPerSale: 9 },
        { listing: 'Listing C', viewsPerSale: 15 },
        { listing: 'Listing D', viewsPerSale: 7 },
        { listing: 'Listing E', viewsPerSale: 11 }
    ];
    
    const labels = sampleData.map(item => item.listing);
    const data = sampleData.map(item => item.viewsPerSale);
    
    // Create or update chart
    if (window.viewsPerSaleChart) {
        window.viewsPerSaleChart.destroy();
    }

    window.viewsPerSaleChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Views Per Sale',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => {
                            const idx = tooltipItems[0].dataIndex;
                            return sampleData[idx].listing;
                        },
                        label: (tooltipItem) => {
                            const idx = tooltipItem.dataIndex;
                            return [
                                `Views Per Sale: ${sampleData[idx].viewsPerSale}`,
                                `Listing: ${sampleData[idx].listing}`
                            ];
                        }
                    }
                },
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Most Efficient Converters (Lower is Better)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Views Per Sale'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Listing'
                    }
                }
            }
        }
    });
}

/**
 * Generate the Market Share Analysis chart
 * Shows top sellers by estimated sales and market share
 */
function generateMarketShareChart() {
    if (DEBUG_MCA) console.log('Generating Market Share chart');
    
    // Get chart container
    const ctx = document.getElementById('market-share-chart');
    if (!ctx) {
        console.error('Chart container for Market Share not found');
        return;
    }
    
    // Get available data - using either filteredData or rawData
    const availableData = getAvailableData();
    if (!availableData) {
        console.warn('No data available - cannot generate Market Share chart');
        renderSampleMarketShareChart();
        return;
    }
    
    if (DEBUG_MCA) console.log(`Found ${availableData.length} items for Market Share chart`);

    // Group by shop and calculate totals
    const shopMap = new Map();
    
    try {
        availableData.forEach(item => {
            // Handle both processed data and raw data formats
            const shopListing = item['Shop / Listing'] || '';
            let shopName = item.shop || '';
            
            // Try to extract shop name from the Shop / Listing field if needed
            if (!shopName && shopListing) {
                if (shopListing.includes(':')) {
                    shopName = shopListing.split(':')[0].trim();
                    // Remove any quotes
                    if (shopName.startsWith('"')) shopName = shopName.substring(1);
                    if (shopName.endsWith('"')) shopName = shopName.substring(0, shopName.length - 1);
                } else {
                    // If no colon, try to extract a shop name from the beginning
                    // This is a best-effort approach when data format is unexpected
                    const words = shopListing.split(' ');
                    if (words.length > 0) {
                        shopName = words[0];
                    } else {
                        shopName = 'Unknown Shop';
                    }
                }
            }
            
            // Ensure we have a valid shop name
            if (!shopName || shopName.trim() === '') {
                shopName = 'Unknown Shop';
            }
            
            // Create or update shop data
            if (!shopMap.has(shopName)) {
                shopMap.set(shopName, {
                    name: shopName,
                    sales: 0,
                    revenue: 0,
                    listings: 0,
                    // Track actual listings to help with debugging
                    listingNames: []
                });
            }
            
            const shopData = shopMap.get(shopName);
            const sales = item.estSales || item['Est. Sales'] || 0;
            const revenue = item.estRevenue || item['Est. Revenue'] || 0;
            
            shopData.sales += sales;
            shopData.revenue += revenue;
            shopData.listings++;
            
            // Track the listing name
            if (shopListing) {
                shopData.listingNames.push(shopListing);
            }
        });
    } catch (e) {
        console.error('Error processing data for Market Share chart:', e);
    }
    
    if (shopMap.size === 0) {
        if (DEBUG_MCA) console.log('No shop data found, using sample data');
        renderSampleMarketShareChart();
        return; // Important to return after rendering sample data
    }
    
    if (DEBUG_MCA) console.log(`Found ${shopMap.size} shops with sales data for Market Share chart`);
    if (DEBUG_MCA) console.log('Using REAL DATA for Market Share chart - first shop:', Array.from(shopMap.values())[0]);
    
    // Convert to array and sort by sales
    const topSellers = Array.from(shopMap.values())
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5); // Get top 5 sellers
    
    // Calculate total sales for percentage
    const totalSales = topSellers.reduce((sum, shop) => sum + shop.sales, 0);
    
    // Prepare chart data with real shop names
    const labels = topSellers.map(shop => {
        // Use the actual shop name from the data
        let label = shop.name;
        // Trim very long shop names for display purposes
        if (label.length > 18) {
            label = label.substring(0, 18) + '...';
        }
        return label;
    });
    
    const data = topSellers.map(shop => shop.sales);
    
    // Create or update chart
    if (window.marketShareChart) {
        window.marketShareChart.destroy();
    }

    window.marketShareChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Estimated Sales',
                data: data,
                backgroundColor: 'rgba(255, 159, 64, 0.7)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => {
                            const idx = tooltipItems[0].dataIndex;
                            return topSellers[idx].name;
                        },
                        label: (tooltipItem) => {
                            const idx = tooltipItem.dataIndex;
                            const shop = topSellers[idx];
                            const marketShare = ((shop.sales / totalSales) * 100).toFixed(1);
                            return [
                                `Sales: ${shop.sales}`,
                                `Revenue: $${shop.revenue.toFixed(2)}`,
                                `Listings: ${shop.listings}`,
                                `Market Share: ${marketShare}%`
                            ];
                        }
                    }
                },
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Top Shops by Estimated Sales'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Estimated Sales'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Shop'
                    }
                }
            }
        }
    });

    // Update the top sellers list with the data
    updateTopSellersList(topSellers, totalSales);
}

/**
 * Update the top sellers list in the UI
 */
function updateTopSellersList(topSellers, totalSales) {
    const sellersList = document.getElementById('top-sellers-list');
    if (!sellersList) return;

    let html = '';
    
    topSellers.forEach(shop => {
        const marketShare = ((shop.sales / totalSales) * 100).toFixed(1);
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${shop.name}</strong>
                    <div class="text-muted small">${shop.listings} listings</div>
                </div>
                <div class="text-end">
                    <div><b>${shop.sales}</b> sales</div>
                    <div class="text-muted small">${marketShare}% market share</div>
                </div>
            </div>
        `;
    });
    
    sellersList.innerHTML = html;
}

/**
 * Generate the Percentage Metrics Table
 * Shows top listings by percentage of daily views, all views, and sales
 */
function generatePercentageMetricsTable() {
    if (DEBUG_MCA) console.log('Generating Percentage Metrics table');
    
    // Get table body
    const tableBody = document.getElementById('percentage-metrics-table');
    if (!tableBody) {
        console.error('Table body for Percentage Metrics not found');
        return;
    }
    
    // Get available data - using either filteredData or rawData
    const availableData = getAvailableData();
    if (!availableData) {
        console.warn('No data available - cannot generate Percentage Metrics table');
        renderSamplePercentageMetricsTable();
        return;
    }
    
    if (DEBUG_MCA) console.log(`Found ${availableData.length} items for Percentage Metrics table`);
    
    // Calculate totals across all listings for percentages
    let totalDailyViews = 0;
    let totalViews = 0;
    let totalSales = 0;
    
    availableData.forEach(item => {
        totalDailyViews += item.dailyViews || item['Daily Views'] || 0;
        totalViews += item.totalViews || item['Total Views'] || 0;
        totalSales += item.estSales || item['Est. Sales'] || 0;
    });
    
    if (totalDailyViews === 0 && totalViews === 0 && totalSales === 0) {
        if (DEBUG_MCA) console.log('No meaningful metrics data found, using sample data');
        return renderSamplePercentageMetricsTable();
    }
    
    // Prepare data for top 5 listings by combined percentage metrics
    const listings = [];
    
    try {
        availableData.forEach(item => {
            // Handle both processed data and raw data formats
            const dailyViews = item.dailyViews || item['Daily Views'] || 0;
            const totalViewsItem = item.totalViews || item['Total Views'] || 0;
            const sales = item.estSales || item['Est. Sales'] || 0;
            
            // Calculate percentages
            const dailyViewsPercent = totalDailyViews > 0 ? (dailyViews / totalDailyViews * 100) : 0;
            const totalViewsPercent = totalViews > 0 ? (totalViewsItem / totalViews * 100) : 0;
            const salesPercent = totalSales > 0 ? (sales / totalSales * 100) : 0;
            
            // Process the listing name from data
            let listingName = '';
            const shopListing = item['Shop / Listing'] || '';
            
            if (shopListing.includes(':')) {
                // If there's a colon, extract the listing part (after the colon)
                listingName = shopListing.split(':')[1].trim();
            } else {
                // Otherwise use the whole field
                listingName = shopListing;
            }
            
            // Remove quotes if present
            if (listingName.startsWith('"')) listingName = listingName.substring(1);
            if (listingName.endsWith('"')) listingName = listingName.substring(0, listingName.length - 1);
            
            // Fall back to fullDescription if available
            if ((!listingName || listingName.trim() === '') && item.fullDescription) {
                listingName = item.fullDescription;
            }
            
            // Determine price category if not already set
            let priceCategory = item.priceCategory;
            if (!priceCategory) {
                // Handle price in different formats
                let price = 0;
                if (typeof item.price === 'number') {
                    price = item.price;
                } else if (item['Price']) {
                    // Remove currency symbols and commas, then parse
                    const priceStr = item['Price'].toString().replace(/[$,]/g, '');
                    price = parseFloat(priceStr) || 0;
                }
                
                if (price > 50) priceCategory = 'High';
                else if (price < 15) priceCategory = 'Low';
                else priceCategory = 'Medium';
            }
            
            listings.push({
                listing: listingName || 'Unknown Listing',
                dailyViewsPercent,
                totalViewsPercent,
                salesPercent,
                priceCategory: priceCategory,
                // Combined score for ranking
                combinedScore: dailyViewsPercent + totalViewsPercent + salesPercent
            });
        });
    } catch (e) {
        console.error('Error processing data for Percentage Metrics Table:', e);
    }
    
    // Sort by combined score and take top 5
    const topListings = listings
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, 5);
    
    // Generate table HTML with actual listing names
    let html = '';
    
    if (topListings.length === 0) {
        if (DEBUG_MCA) console.log('No listings found for percentage metrics table');
        return renderSamplePercentageMetricsTable();
    }
    
    topListings.forEach(item => {
        // Get the full listing name for tooltip and a truncated version for display
        const fullName = item.listing;
        const truncatedName = item.listing.length > 40 ? item.listing.substring(0, 40) + '...' : item.listing;
        
        // Apply different color classes based on price category
        let categoryClass = '';
        if (item.priceCategory === 'High') categoryClass = 'text-success';
        else if (item.priceCategory === 'Low') categoryClass = 'text-danger';
        
        html += `
            <tr>
                <td title="${fullName}">${truncatedName}</td>
                <td>${item.dailyViewsPercent.toFixed(1)}%</td>
                <td>${item.totalViewsPercent.toFixed(1)}%</td>
                <td>${item.salesPercent.toFixed(1)}%</td>
                <td class="${categoryClass}">${item.priceCategory}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Function to render sample percentage metrics table when no data is available
function renderSamplePercentageMetricsTable() {
    const tableBody = document.getElementById('percentage-metrics-table');
    if (!tableBody) {
        console.error('Percentage Metrics Table body not found');
        return;
    }
    
    tableBody.innerHTML = `
        <tr><td>Listing A</td><td>21%</td><td>14%</td><td>18%</td><td class="text-success">High</td></tr>
        <tr><td>Listing B</td><td>17%</td><td>10%</td><td>15%</td><td>Medium</td></tr>
        <tr><td>Listing C</td><td>12%</td><td>8%</td><td>10%</td><td>Medium</td></tr>
        <tr><td>Listing D</td><td>9%</td><td>6%</td><td>8%</td><td class="text-danger">Low</td></tr>
        <tr><td>Listing E</td><td>7%</td><td>5%</td><td>6%</td><td class="text-danger">Low</td></tr>
    `;
}

// Access any available data (filteredData, rawData, or from parent scope)
function getAvailableData() {
    if (DEBUG_MCA) {
        console.log('Checking for available data...');
    }
    
    // First check if filteredData is available as a global variable
    if (typeof filteredData !== 'undefined' && filteredData && filteredData.length > 0) {
        if (DEBUG_MCA) console.log(`Using direct filteredData with ${filteredData.length} items`);
        return filteredData;
    }
    
    // Then check window.filteredData  
    if (window.filteredData && window.filteredData.length > 0) {
        if (DEBUG_MCA) console.log(`Using window.filteredData with ${window.filteredData.length} items`);
        return window.filteredData;
    } 
    
    // Then check rawData
    if (typeof rawData !== 'undefined' && rawData && rawData.length > 0) {
        if (DEBUG_MCA) console.log(`Using direct rawData with ${rawData.length} items`);
        return rawData;
    }
    
    // Finally check window.rawData
    if (window.rawData && window.rawData.length > 0) {
        if (DEBUG_MCA) console.log(`Using window.rawData with ${window.rawData.length} items`);  
        return window.rawData;
    }
    
    // Debug - check what variables are available in parent scope
    if (DEBUG_MCA) {
        console.log('No data available via expected variables, dumping parent scope data:');
        try {
            console.log('filteredData:', typeof filteredData);
            console.log('window.filteredData:', typeof window.filteredData);
            console.log('window.rawData:', typeof window.rawData);
        } catch (e) {
            console.log('Error checking variable types:', e);
        }
    }
    
    // Last resort - create sample data
    return null;
}

// Add a small script block to ensure data is accessible
function injectGlobalDataAccessor() {
    try {
        const script = document.createElement('script');
        script.textContent = `
            // Make filteredData accessible to the Market Competitiveness Analysis
            window.getMcaData = function() { 
                return { 
                    filteredData: filteredData || [], 
                    rawData: rawData || [] 
                }; 
            };
        `;
        document.head.appendChild(script);
        if (DEBUG_MCA) console.log('Injected global data accessor script');
    } catch (e) {
        console.error('Failed to inject global data accessor:', e);
    }
}

// Update card headers based on current theme
function updateCardHeaderThemes() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    if (DEBUG_MCA) console.log(`Updating card headers for ${isDarkMode ? 'dark' : 'light'} mode`);
    
    // Get all card headers in the Market Competitiveness Analysis section (charts and metrics table)
    const marketAnalysisCards = document.querySelectorAll('#market-competitiveness-analysis .card-header, #percentage-metrics-section .card-header');
    
    marketAnalysisCards.forEach(header => {
        if (isDarkMode) {
            // Switch to dark theme
            header.classList.remove('bg-light');
            header.classList.add('bg-dark');
        } else {
            // Switch to light theme
            header.classList.remove('bg-dark');
            header.classList.add('bg-light');
        }
    });
}

// Wait for DOM to be ready
$(document).ready(function() {
    injectGlobalDataAccessor();
    
    if (DEBUG_MCA) console.log('DOM ready, checking for data to initialize Market Competitiveness Analysis');
    
    // Initialize card header themes based on current mode
    updateCardHeaderThemes();
    
    // Listen for dark mode toggle
    $('#dark-mode-toggle').on('click', function() {
        // Use setTimeout to ensure this runs after the dark mode toggle completes
        setTimeout(updateCardHeaderThemes, 50);
    });
    
    // Try to initialize with available data, if any
    const availableData = getAvailableData();
    if (availableData) {
        if (DEBUG_MCA) console.log(`Data already available: ${availableData.length} items`);
        initMarketCompetitivenessAnalysis();
    } else {
        if (DEBUG_MCA) console.log('No data yet, waiting for data loaded event');
        // Set up delayed initialization attempts
        setTimeout(initMarketCompetitivenessAnalysis, 1000);
        setTimeout(initMarketCompetitivenessAnalysis, 2000);
    }
});

// Listen for data loaded event
$(document).on('dataLoaded', function() {
    if (DEBUG_MCA) console.log('Data loaded event detected, initializing Market Competitiveness Analysis');
    initMarketCompetitivenessAnalysis();
});

// Also listen for filters applied event which may happen after initial load
$(document).on('filtersApplied', function() {
    if (DEBUG_MCA) console.log('Filters applied event detected, refreshing Market Competitiveness Analysis');
    initMarketCompetitivenessAnalysis();
});

// Also listen to table rendering events
$(document).on('click', 'button[data-viz]', function() {
    if (DEBUG_MCA) console.log('Visualization tab clicked, refreshing Market Competitiveness Analysis');
    setTimeout(initMarketCompetitivenessAnalysis, 500);
});

// Main initialization function
function initMarketCompetitivenessAnalysis() {
    if (DEBUG_MCA) {
        console.log('Initializing Market Competitiveness Analysis');
        const availableData = getAvailableData();
        console.log(`Data availability: ${availableData ? `${availableData.length} items available` : 'No data available'}`);
        if (availableData && availableData.length > 0) {
            console.log('Sample data item:', availableData[0]);
        }
    }
    
    // Call all visualization functions
    generateViewsPerSaleChart();
    generateMarketShareChart();
    generatePercentageMetricsTable();
}

// Add a function to force refresh all visualizations when data is ready
function refreshAllMarketCompetitivenessVisualizations() {
    if (DEBUG_MCA) console.log('Forcing refresh of all Market Competitiveness visualizations');
    
    // Try to access data through window.getMcaData if it exists
    if (window.getMcaData) {
        const mcaData = window.getMcaData();
        if (DEBUG_MCA) {
            console.log('Retrieved data through getMcaData():');
            console.log('filteredData:', mcaData.filteredData.length, 'items');
            if (mcaData.filteredData.length > 0) {
                console.log('First filtered item:', mcaData.filteredData[0]);
            }
        }
    }
    
    // Get available data through our utility function
    const availableData = getAvailableData();
    if (availableData && availableData.length > 0) {
        if (DEBUG_MCA) {
            console.log(`Data available for refresh: ${availableData.length} items`);
            console.log('First data item:', availableData[0]);
        }
        
        // Give the DOM a moment to be ready
        setTimeout(() => {
            generateViewsPerSaleChart();
            generateMarketShareChart();
            generatePercentageMetricsTable();
        }, 300);
    } else {
        if (DEBUG_MCA) console.log('No data available for refresh, will use sample data');
    }
}

// Run immediately in case the DOM is already ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (DEBUG_MCA) console.log('Document already ready, initializing Market Competitiveness Analysis');
    
    // Check window.filteredData in global scope
    if (DEBUG_MCA) {
        console.log(`Initial data check: window.filteredData = ${window.filteredData ? 'exists' : 'undefined'}`);
        if (window.filteredData) {
            console.log(`Data length: ${window.filteredData.length} items`);
        }
    }
    
    // Initialize immediately
    initMarketCompetitivenessAnalysis();
    
    // Also set up multiple refresh attempts with increasing delays
    // This helps ensure we catch the data when it becomes available
    setTimeout(refreshAllMarketCompetitivenessVisualizations, 500);
    setTimeout(refreshAllMarketCompetitivenessVisualizations, 1500);
    setTimeout(refreshAllMarketCompetitivenessVisualizations, 3000);
}
