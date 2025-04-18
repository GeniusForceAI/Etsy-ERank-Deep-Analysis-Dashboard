/**
 * Advanced Dashboard for Etsy Analytics
 * Handles loading, filtering, and visualizing Erank data using jQuery
 */

// Global variables
let rawData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentVisualization = 'table';
let chart = null;

// Constants
const CSV_PATH = './Erank_Raw_Data/Keyword_Tool - Top Listings (1).csv';
const NUMERIC_COLUMNS = ['Listing Age (Days)', 'Total Views', 'Daily Views', 'Est. Sales', 'Hearts'];
const CURRENCY_COLUMNS = ['Price', 'Est. Revenue'];

// Initialize the dashboard when document is ready (jQuery ready function)
$(document).ready(function() {
    // Event listeners
    $('#csv-file').on('change', handleFileUpload);
    $('#filter-form').on('submit', function(e) {
        e.preventDefault();
        applyFilters();
    });
    $('#reset-filters').on('click', resetFilters);
    $('#toggle-filters').on('click', toggleFilters);
    
    // Visualization buttons
    $('.btn-viz').on('click', function() {
        const vizType = $(this).data('viz');
        switchVisualization(vizType);
    });
    
    // Axis selector events
    $('#x-axis-select, #y-axis-select').on('change', updateChart);
    
    // Export buttons
    $('#download-csv').on('click', exportCSV);
    $('#download-image').on('click', exportImage);
    
    // Load the default data
    loadDefaultData();
});

/**
 * Loads data from the default CSV file
 */
function loadDefaultData() {
    showLoadingState();
    Papa.parse(CSV_PATH, {
        download: true,
        header: true,
        skipEmptyLines: true,
        dynamicTyping: function(field) {
            // Apply dynamic typing only to numeric fields
            if (NUMERIC_COLUMNS.includes(field)) {
                return true;
            }
            // Handle currency fields separately
            if (CURRENCY_COLUMNS.includes(field)) {
                return false; // We'll process these manually
            }
            return false;
        },
        complete: function(results) {
            processData(results.data);
            showDataLoadedState();
        },
        error: function(error) {
            console.error('Error parsing CSV:', error);
            $.toast({
                heading: 'Error',
                text: 'Error loading data. Please check the console for details.',
                showHideTransition: 'fade',
                icon: 'error'
            });
        }
    });
}

/**
 * Update chart visualization based on current data and selected type
 */
function updateChart() {
    // Get chart canvas
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Get selected axes for scatter and bubble charts
    const xAxis = $('#x-axis-select').val() || 'listingAge';
    const yAxis = $('#y-axis-select').val() || 'totalViews';
    
    // Map field names to actual data fields
    const fieldMap = {
        'totalViews': 'Total Views',
        'price': 'Price',
        'estRevenue': 'Est. Revenue',
        'hearts': 'Hearts',
        'listingAge': 'Listing Age (Days)',
        'dailyViews': 'Daily Views',
        'estSales': 'Est. Sales'
    };
    
    // Create chart configuration based on visualization type
    let chartConfig = {
        type: 'bar', // default
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            const shop = filteredData[idx] ? filteredData[idx]['Shop / Listing'].split(':')[0] : '';
                            return shop;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };
    
    // Limit data size for better visualization
    const maxItems = 100;
    const chartData = filteredData.slice(0, maxItems);
    
    // Configure chart based on type
    switch (currentVisualization) {
        case 'bar':
            chartConfig.type = 'bar';
            
            // Set labels (shop names)
            chartConfig.data.labels = chartData.map(item => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName;
            });
            
            // Add datasets for main metrics
            chartConfig.data.datasets = [
                {
                    label: 'Total Views',
                    data: chartData.map(item => item['Total Views']),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Hearts',
                    data: chartData.map(item => item['Hearts']),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Est. Revenue ($)',
                    data: chartData.map(item => item['Est. Revenue']),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ];
            
            // Set bar chart options
            chartConfig.options.scales = {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxRotation: 90,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            };
            break;
            
        case 'scatter':
            chartConfig.type = 'scatter';
            
            // Create scatter plot dataset
            chartConfig.data.datasets = [{
                label: `${fieldMap[xAxis]} vs ${fieldMap[yAxis]}`,
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]]
                })),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
            }];
            
            // Set scatter plot options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (xAxis === 'price' || xAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (yAxis === 'price' || yAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`
                ];
            };
            break;
            
        case 'pie':
            chartConfig.type = 'pie';
            
            // Group data by a property (e.g., price range)
            const priceRanges = {
                'Under $5': chartData.filter(item => item['Price'] < 5).length,
                '$5 - $10': chartData.filter(item => item['Price'] >= 5 && item['Price'] < 10).length,
                '$10 - $20': chartData.filter(item => item['Price'] >= 10 && item['Price'] < 20).length,
                '$20 - $50': chartData.filter(item => item['Price'] >= 20 && item['Price'] < 50).length,
                'Over $50': chartData.filter(item => item['Price'] >= 50).length
            };
            
            chartConfig.data.labels = Object.keys(priceRanges);
            chartConfig.data.datasets = [{
                label: 'Price Ranges',
                data: Object.values(priceRanges),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }];
            
            // Set pie chart options
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
            };
            break;
            
        case 'bubble':
            chartConfig.type = 'bubble';
            
            // Create bubble chart dataset
            chartConfig.data.datasets = [{
                label: 'Listings',
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]],
                    r: Math.sqrt(item['Hearts']) / 3 + 5 // Bubble size based on hearts
                })),
                backgroundColor: chartData.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`),
                borderWidth: 1
            }];
            
            // Set bubble chart options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`,
                    `Hearts: ${item['Hearts']}`
                ];
            };
            break;
            
        case 'radar':
            chartConfig.type = 'radar';
            
            // Select top 5 listings for radar chart
            const top5 = chartData.slice(0, 5);
            
            chartConfig.data.labels = ['Views', 'Hearts', 'Revenue', 'Listing Age', 'Daily Views'];
            
            // Normalize values for radar chart (0-100 scale)
            const maxValues = {
                'Total Views': Math.max(...top5.map(item => item['Total Views'])),
                'Hearts': Math.max(...top5.map(item => item['Hearts'])),
                'Est. Revenue': Math.max(...top5.map(item => item['Est. Revenue'])),
                'Listing Age (Days)': Math.max(...top5.map(item => item['Listing Age (Days)'])),
                'Daily Views': Math.max(...top5.map(item => item['Daily Views']))
            };
            
            chartConfig.data.datasets = top5.map((item, index) => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return {
                    label: shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName,
                    data: [
                        (item['Total Views'] / maxValues['Total Views'] * 100) || 0,
                        (item['Hearts'] / maxValues['Hearts'] * 100) || 0,
                        (item['Est. Revenue'] / maxValues['Est. Revenue'] * 100) || 0,
                        (item['Listing Age (Days)'] / maxValues['Listing Age (Days)'] * 100) || 0,
                        (item['Daily Views'] / maxValues['Daily Views'] * 100) || 0
                    ],
                    borderColor: `hsl(${index * 60}, 70%, 60%)`,
                    backgroundColor: `hsla(${index * 60}, 70%, 60%, 0.3)`
                };
            });
            break;
            
        case 'heatmap':
            // For heatmap, we'll use a modified bar chart
            chartConfig.type = 'bar';
            
            // Group by listing age and price ranges
            const ageRanges = {
                'New (< 100 days)': chartData.filter(item => item['Listing Age (Days)'] < 100),
                'Established (100-500 days)': chartData.filter(item => item['Listing Age (Days)'] >= 100 && item['Listing Age (Days)'] < 500),
                'Mature (500+ days)': chartData.filter(item => item['Listing Age (Days)'] >= 500)
            };
            
            chartConfig.data.labels = Object.keys(ageRanges);
            
            // Create datasets for different price ranges
            const priceRanges2 = [
                { label: 'Under $5', filter: item => item['Price'] < 5, color: 'rgba(54, 162, 235, 0.7)' },
                { label: '$5 - $20', filter: item => item['Price'] >= 5 && item['Price'] < 20, color: 'rgba(255, 206, 86, 0.7)' },
                { label: 'Over $20', filter: item => item['Price'] >= 20, color: 'rgba(255, 99, 132, 0.7)' }
            ];
            
            chartConfig.data.datasets = priceRanges2.map(range => ({
                label: range.label,
                data: Object.values(ageRanges).map(items => items.filter(range.filter).length),
                backgroundColor: range.color,
                borderColor: range.color.replace('0.7', '1'),
                borderWidth: 1
            }));
            
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: 'Listing Age'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Listings'
                    },
                    beginAtZero: true
                }
            };
            break;
    }
    
    // Create the chart
    chart = new Chart(ctx, chartConfig);
}

/**
 * Show loading state while data is being loaded
 */
function showLoadingState() {
    $('#loading-section').show();
    $('#loading-message').show();
    $('#data-loaded').hide();
    $('.dashboard-content').hide();
}

/**
 * Show content after data has been loaded
 */
function showDataLoadedState() {
    $('#loading-message').hide();
    $('#data-loaded').fadeIn(300);
    
    // Short delay before showing dashboard content for better UX
    setTimeout(() => {
        $('#loading-section').fadeOut(300);
        $('.dashboard-content').fadeIn(500);
    }, 1000);
}

/**
 * Export current filtered data as CSV
 */
function exportCSV() {
    // Create CSV content
    const headers = Object.keys(filteredData[0] || {}).join(',');
    const rows = filteredData.map(item => {
        return Object.values(item).map(value => {
            // Handle string values with commas
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'etsy_filtered_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export current chart as image
 */
function exportImage() {
    if (currentVisualization === 'table') {
        alert('Please switch to a chart visualization to export an image.');
        return;
    }
    
    // Get chart canvas
    const canvas = document.getElementById('chart-canvas');
    const url = canvas.toDataURL('image/png');
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `etsy_${currentVisualization}_chart.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Handles file upload for custom CSV files
 */
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        showLoadingState();
        $('#data-source-name').text(file.name);
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: function(field) {
                if (NUMERIC_COLUMNS.includes(field)) {
                    return true;
                }
                if (CURRENCY_COLUMNS.includes(field)) {
                    return false;
                }
                return false;
            },
            complete: function(results) {
                processData(results.data);
                showDataLoadedState();
            },
            error: function(error) {
                console.error('Error parsing CSV:', error);
                alert('Error loading data. Please check the console for details.');
            }
        });
    }
}

/**
 * Update chart visualization based on current data and selected type
 */
function updateChart() {
    // Get chart canvas
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Get selected axes for scatter and bubble charts
    const xAxis = $('#x-axis-select').val() || 'listingAge';
    const yAxis = $('#y-axis-select').val() || 'totalViews';
    
    // Map field names to actual data fields
    const fieldMap = {
        'totalViews': 'Total Views',
        'price': 'Price',
        'estRevenue': 'Est. Revenue',
        'hearts': 'Hearts',
        'listingAge': 'Listing Age (Days)',
        'dailyViews': 'Daily Views',
        'estSales': 'Est. Sales'
    };
    
    // Create chart configuration based on visualization type
    let chartConfig = {
        type: 'bar', // default
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            const shop = filteredData[idx] ? filteredData[idx]['Shop / Listing'].split(':')[0] : '';
                            return shop;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };
    
    // Limit data size for better visualization
    const maxItems = 100;
    const chartData = filteredData.slice(0, maxItems);
    
    // Configure chart based on type
    switch (currentVisualization) {
        case 'bar':
            chartConfig.type = 'bar';
            
            // Set labels (shop names)
            chartConfig.data.labels = chartData.map(item => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName;
            });
            
            // Add datasets for main metrics
            chartConfig.data.datasets = [
                {
                    label: 'Total Views',
                    data: chartData.map(item => item['Total Views']),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Hearts',
                    data: chartData.map(item => item['Hearts']),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Est. Revenue ($)',
                    data: chartData.map(item => item['Est. Revenue']),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ];
            
            // Set bar chart options
            chartConfig.options.scales = {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxRotation: 90,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            };
            break;
            
        case 'scatter':
            chartConfig.type = 'scatter';
            
            // Create scatter plot dataset
            chartConfig.data.datasets = [{
                label: `${fieldMap[xAxis]} vs ${fieldMap[yAxis]}`,
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]]
                })),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
            }];
            
            // Set scatter plot options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (xAxis === 'price' || xAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (yAxis === 'price' || yAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`
                ];
            };
            break;
            
        case 'pie':
            chartConfig.type = 'pie';
            
            // Group data by a property (e.g., price range)
            const priceRanges = {
                'Under $5': chartData.filter(item => item['Price'] < 5).length,
                '$5 - $10': chartData.filter(item => item['Price'] >= 5 && item['Price'] < 10).length,
                '$10 - $20': chartData.filter(item => item['Price'] >= 10 && item['Price'] < 20).length,
                '$20 - $50': chartData.filter(item => item['Price'] >= 20 && item['Price'] < 50).length,
                'Over $50': chartData.filter(item => item['Price'] >= 50).length
            };
            
            chartConfig.data.labels = Object.keys(priceRanges);
            chartConfig.data.datasets = [{
                label: 'Price Ranges',
                data: Object.values(priceRanges),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }];
            
            // Set pie chart options
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
            };
            break;
            
        case 'bubble':
            chartConfig.type = 'bubble';
            
            // Create bubble chart dataset
            chartConfig.data.datasets = [{
                label: 'Listings',
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]],
                    r: Math.sqrt(item['Hearts']) / 3 + 5 // Bubble size based on hearts
                })),
                backgroundColor: chartData.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`),
                borderWidth: 1
            }];
            
            // Set bubble chart options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`,
                    `Hearts: ${item['Hearts']}`
                ];
            };
            break;
            
        case 'radar':
            chartConfig.type = 'radar';
            
            // Select top 5 listings for radar chart
            const top5 = chartData.slice(0, 5);
            
            chartConfig.data.labels = ['Views', 'Hearts', 'Revenue', 'Listing Age', 'Daily Views'];
            
            // Normalize values for radar chart (0-100 scale)
            const maxValues = {
                'Total Views': Math.max(...top5.map(item => item['Total Views'])),
                'Hearts': Math.max(...top5.map(item => item['Hearts'])),
                'Est. Revenue': Math.max(...top5.map(item => item['Est. Revenue'])),
                'Listing Age (Days)': Math.max(...top5.map(item => item['Listing Age (Days)'])),
                'Daily Views': Math.max(...top5.map(item => item['Daily Views']))
            };
            
            chartConfig.data.datasets = top5.map((item, index) => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return {
                    label: shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName,
                    data: [
                        (item['Total Views'] / maxValues['Total Views'] * 100) || 0,
                        (item['Hearts'] / maxValues['Hearts'] * 100) || 0,
                        (item['Est. Revenue'] / maxValues['Est. Revenue'] * 100) || 0,
                        (item['Listing Age (Days)'] / maxValues['Listing Age (Days)'] * 100) || 0,
                        (item['Daily Views'] / maxValues['Daily Views'] * 100) || 0
                    ],
                    borderColor: `hsl(${index * 60}, 70%, 60%)`,
                    backgroundColor: `hsla(${index * 60}, 70%, 60%, 0.3)`
                };
            });
            break;
            
        case 'heatmap':
            // For heatmap, we'll use a modified bar chart
            chartConfig.type = 'bar';
            
            // Group by listing age and price ranges
            const ageRanges = {
                'New (< 100 days)': chartData.filter(item => item['Listing Age (Days)'] < 100),
                'Established (100-500 days)': chartData.filter(item => item['Listing Age (Days)'] >= 100 && item['Listing Age (Days)'] < 500),
                'Mature (500+ days)': chartData.filter(item => item['Listing Age (Days)'] >= 500)
            };
            
            chartConfig.data.labels = Object.keys(ageRanges);
            
            // Create datasets for different price ranges
            const priceRanges2 = [
                { label: 'Under $5', filter: item => item['Price'] < 5, color: 'rgba(54, 162, 235, 0.7)' },
                { label: '$5 - $20', filter: item => item['Price'] >= 5 && item['Price'] < 20, color: 'rgba(255, 206, 86, 0.7)' },
                { label: 'Over $20', filter: item => item['Price'] >= 20, color: 'rgba(255, 99, 132, 0.7)' }
            ];
            
            chartConfig.data.datasets = priceRanges2.map(range => ({
                label: range.label,
                data: Object.values(ageRanges).map(items => items.filter(range.filter).length),
                backgroundColor: range.color,
                borderColor: range.color.replace('0.7', '1'),
                borderWidth: 1
            }));
            
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: 'Listing Age'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Listings'
                    },
                    beginAtZero: true
                }
            };
            break;
    }
    
    // Create the chart
    chart = new Chart(ctx, chartConfig);
}

/**
 * Show loading state while data is being loaded
 */
function showLoadingState() {
    $('#loading-section').show();
    $('#loading-message').show();
    $('#data-loaded').hide();
    $('.dashboard-content').hide();
}

/**
 * Show content after data has been loaded
 */
function showDataLoadedState() {
    $('#loading-message').hide();
    $('#data-loaded').fadeIn(300);
    
    // Short delay before showing dashboard content for better UX
    setTimeout(() => {
        $('#loading-section').fadeOut(300);
        $('.dashboard-content').fadeIn(500);
    }, 1000);
}

/**
 * Export current filtered data as CSV
 */
function exportCSV() {
    // Create CSV content
    const headers = Object.keys(filteredData[0] || {}).join(',');
    const rows = filteredData.map(item => {
        return Object.values(item).map(value => {
            // Handle string values with commas
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'etsy_filtered_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export current chart as image
 */
function exportImage() {
    if (currentVisualization === 'table') {
        alert('Please switch to a chart visualization to export an image.');
        return;
    }
    
    // Get chart canvas
    const canvas = document.getElementById('chart-canvas');
    const url = canvas.toDataURL('image/png');
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `etsy_${currentVisualization}_chart.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Process the raw CSV data
 */
function processData(data) {
    // Clean and normalize the data
    rawData = data.map(item => {
        const cleanedItem = {};
        
        // Process each field
        Object.keys(item).forEach(key => {
            if (key === 'Shop / Listing') {
                cleanedItem[key] = item[key];
            } else if (CURRENCY_COLUMNS.includes(key)) {
                // Extract numeric value from currency string
                const valueStr = item[key] || '0';
                const numericValue = parseFloat(valueStr.replace(/[^0-9.-]+/g, ''));
                cleanedItem[key] = isNaN(numericValue) ? 0 : numericValue;
            } else {
                // For regular numeric columns, ensure they're numbers
                if (NUMERIC_COLUMNS.includes(key)) {
                    cleanedItem[key] = typeof item[key] === 'number' ? item[key] : 0;
                } else {
                    cleanedItem[key] = item[key];
                }
            }
        });
        
        return cleanedItem;
    });
    
    // Initialize with all data
    filteredData = [...rawData];
    
    // Apply initial rendering
    updateResultsOverview();
    renderTableView();
    
    // Initialize chart if needed
    if (!chart && currentVisualization !== 'table') {
        updateChart();
    }
}

/**
 * Update chart visualization based on current data and selected type
 */
function updateChart() {
    // Get chart canvas
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Get selected axes for scatter and bubble charts
    const xAxis = $('#x-axis-select').val() || 'listingAge';
    const yAxis = $('#y-axis-select').val() || 'totalViews';
    
    // Map field names to actual data fields
    const fieldMap = {
        'totalViews': 'Total Views',
        'price': 'Price',
        'estRevenue': 'Est. Revenue',
        'hearts': 'Hearts',
        'listingAge': 'Listing Age (Days)',
        'dailyViews': 'Daily Views',
        'estSales': 'Est. Sales'
    };
    
    // Create chart configuration based on visualization type
    let chartConfig = {
        type: 'bar', // default
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            const shop = filteredData[idx] ? filteredData[idx]['Shop / Listing'].split(':')[0] : '';
                            return shop;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };
    
    // Limit data size for better visualization
    const maxItems = 100;
    const chartData = filteredData.slice(0, maxItems);
    
    // Configure chart based on type
    switch (currentVisualization) {
        case 'bar':
            chartConfig.type = 'bar';
            
            // Set labels (shop names)
            chartConfig.data.labels = chartData.map(item => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName;
            });
            
            // Add datasets for main metrics
            chartConfig.data.datasets = [
                {
                    label: 'Total Views',
                    data: chartData.map(item => item['Total Views']),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Hearts',
                    data: chartData.map(item => item['Hearts']),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Est. Revenue ($)',
                    data: chartData.map(item => item['Est. Revenue']),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ];
            
            // Set bar chart options
            chartConfig.options.scales = {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxRotation: 90,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            };
            break;
            
        case 'scatter':
            chartConfig.type = 'scatter';
            
            // Create scatter plot dataset
            chartConfig.data.datasets = [{
                label: `${fieldMap[xAxis]} vs ${fieldMap[yAxis]}`,
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]]
                })),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
            }];
            
            // Set scatter plot options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (xAxis === 'price' || xAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (yAxis === 'price' || yAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`
                ];
            };
            break;
            
        case 'pie':
            chartConfig.type = 'pie';
            
            // Group data by a property (e.g., price range)
            const priceRanges = {
                'Under $5': chartData.filter(item => item['Price'] < 5).length,
                '$5 - $10': chartData.filter(item => item['Price'] >= 5 && item['Price'] < 10).length,
                '$10 - $20': chartData.filter(item => item['Price'] >= 10 && item['Price'] < 20).length,
                '$20 - $50': chartData.filter(item => item['Price'] >= 20 && item['Price'] < 50).length,
                'Over $50': chartData.filter(item => item['Price'] >= 50).length
            };
            
            chartConfig.data.labels = Object.keys(priceRanges);
            chartConfig.data.datasets = [{
                label: 'Price Ranges',
                data: Object.values(priceRanges),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }];
            
            // Set pie chart options
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
            };
            break;
            
        case 'bubble':
            chartConfig.type = 'bubble';
            
            // Create bubble chart dataset
            chartConfig.data.datasets = [{
                label: 'Listings',
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]],
                    r: Math.sqrt(item['Hearts']) / 3 + 5 // Bubble size based on hearts
                })),
                backgroundColor: chartData.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`),
                borderWidth: 1
            }];
            
            // Set bubble chart options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`,
                    `Hearts: ${item['Hearts']}`
                ];
            };
            break;
            
        case 'radar':
            chartConfig.type = 'radar';
            
            // Select top 5 listings for radar chart
            const top5 = chartData.slice(0, 5);
            
            chartConfig.data.labels = ['Views', 'Hearts', 'Revenue', 'Listing Age', 'Daily Views'];
            
            // Normalize values for radar chart (0-100 scale)
            const maxValues = {
                'Total Views': Math.max(...top5.map(item => item['Total Views'])),
                'Hearts': Math.max(...top5.map(item => item['Hearts'])),
                'Est. Revenue': Math.max(...top5.map(item => item['Est. Revenue'])),
                'Listing Age (Days)': Math.max(...top5.map(item => item['Listing Age (Days)'])),
                'Daily Views': Math.max(...top5.map(item => item['Daily Views']))
            };
            
            chartConfig.data.datasets = top5.map((item, index) => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return {
                    label: shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName,
                    data: [
                        (item['Total Views'] / maxValues['Total Views'] * 100) || 0,
                        (item['Hearts'] / maxValues['Hearts'] * 100) || 0,
                        (item['Est. Revenue'] / maxValues['Est. Revenue'] * 100) || 0,
                        (item['Listing Age (Days)'] / maxValues['Listing Age (Days)'] * 100) || 0,
                        (item['Daily Views'] / maxValues['Daily Views'] * 100) || 0
                    ],
                    borderColor: `hsl(${index * 60}, 70%, 60%)`,
                    backgroundColor: `hsla(${index * 60}, 70%, 60%, 0.3)`
                };
            });
            break;
            
        case 'heatmap':
            // For heatmap, we'll use a modified bar chart
            chartConfig.type = 'bar';
            
            // Group by listing age and price ranges
            const ageRanges = {
                'New (< 100 days)': chartData.filter(item => item['Listing Age (Days)'] < 100),
                'Established (100-500 days)': chartData.filter(item => item['Listing Age (Days)'] >= 100 && item['Listing Age (Days)'] < 500),
                'Mature (500+ days)': chartData.filter(item => item['Listing Age (Days)'] >= 500)
            };
            
            chartConfig.data.labels = Object.keys(ageRanges);
            
            // Create datasets for different price ranges
            const priceRanges2 = [
                { label: 'Under $5', filter: item => item['Price'] < 5, color: 'rgba(54, 162, 235, 0.7)' },
                { label: '$5 - $20', filter: item => item['Price'] >= 5 && item['Price'] < 20, color: 'rgba(255, 206, 86, 0.7)' },
                { label: 'Over $20', filter: item => item['Price'] >= 20, color: 'rgba(255, 99, 132, 0.7)' }
            ];
            
            chartConfig.data.datasets = priceRanges2.map(range => ({
                label: range.label,
                data: Object.values(ageRanges).map(items => items.filter(range.filter).length),
                backgroundColor: range.color,
                borderColor: range.color.replace('0.7', '1'),
                borderWidth: 1
            }));
            
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: 'Listing Age'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Listings'
                    },
                    beginAtZero: true
                }
            };
            break;
    }
    
    // Create the chart
    chart = new Chart(ctx, chartConfig);
}

/**
 * Show loading state while data is being loaded
 */
function showLoadingState() {
    $('#loading-section').show();
    $('#loading-message').show();
    $('#data-loaded').hide();
    $('.dashboard-content').hide();
}

/**
 * Show content after data has been loaded
 */
function showDataLoadedState() {
    $('#loading-message').hide();
    $('#data-loaded').fadeIn(300);
    
    // Short delay before showing dashboard content for better UX
    setTimeout(() => {
        $('#loading-section').fadeOut(300);
        $('.dashboard-content').fadeIn(500);
    }, 1000);
}

/**
 * Export current filtered data as CSV
 */
function exportCSV() {
    // Create CSV content
    const headers = Object.keys(filteredData[0] || {}).join(',');
    const rows = filteredData.map(item => {
        return Object.values(item).map(value => {
            // Handle string values with commas
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'etsy_filtered_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export current chart as image
 */
function exportImage() {
    if (currentVisualization === 'table') {
        alert('Please switch to a chart visualization to export an image.');
        return;
    }
    
    // Get chart canvas
    const canvas = document.getElementById('chart-canvas');
    const url = canvas.toDataURL('image/png');
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `etsy_${currentVisualization}_chart.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Apply filters to the raw data
 */
function applyFilters() {
    const priceMin = parseFloat($('#price-min').val()) || 0;
    const priceMax = parseFloat($('#price-max').val()) || Infinity;
    const revenueMin = parseFloat($('#revenue-min').val()) || 0;
    const revenueMax = parseFloat($('#revenue-max').val()) || Infinity;
    const viewsMin = parseFloat($('#views-min').val()) || 0;
    const viewsMax = parseFloat($('#views-max').val()) || Infinity;
    const heartsMin = parseFloat($('#hearts-min').val()) || 0;
    const heartsMax = parseFloat($('#hearts-max').val()) || Infinity;
    
    const shopSearch = $('#shop-search').val().toLowerCase().trim();
    const listingSearch = $('#listing-search').val().toLowerCase().trim();
    const keywordsSearch = $('#keywords-search').val().toLowerCase().trim();
    
    const sortByValue = $('#sort-by').val();
    const limitResults = parseInt($('#limit-results').val()) || 0;
    
    // Filter the data
    filteredData = rawData.filter(item => {
        // Price range filter
        if (item['Price'] < priceMin || item['Price'] > priceMax) return false;
        
        // Revenue range filter
        if (item['Est. Revenue'] < revenueMin || item['Est. Revenue'] > revenueMax) return false;
        
        // Views range filter
        if (item['Total Views'] < viewsMin || item['Total Views'] > viewsMax) return false;
        
        // Hearts range filter
        if (item['Hearts'] < heartsMin || item['Hearts'] > heartsMax) return false;
        
        // Text search filters
        const shopListing = item['Shop / Listing'] || '';
        
        // Shop name filter
        if (shopSearch && !shopListing.toLowerCase().includes(shopSearch)) return false;
        
        // Listing description filter
        if (listingSearch && !shopListing.toLowerCase().includes(listingSearch)) return false;
        
        // Keywords filter - this assumes keywords are in the listing description
        if (keywordsSearch && !shopListing.toLowerCase().includes(keywordsSearch)) return false;
        
        return true;
    });
    
    // Sort the data
    sortData(sortByValue);
    
    // Apply limit if needed
    if (limitResults > 0 && filteredData.length > limitResults) {
        filteredData = filteredData.slice(0, limitResults);
    }
    
    // Reset to first page when applying filters
    currentPage = 1;
    
    // Update the view
    updateResultsOverview();
    
    // Update current visualization
    if (currentVisualization === 'table') {
        renderTableView();
    } else {
        updateChart();
    }
    
    // Scroll to results section
    $('html, body').animate({
        scrollTop: $('#viz-title').offset().top - 100
    }, 500);
}

/**
 * Update chart visualization based on current data and selected type
 */
function updateChart() {
    // Get chart canvas
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Get selected axes for scatter and bubble charts
    const xAxis = $('#x-axis-select').val() || 'listingAge';
    const yAxis = $('#y-axis-select').val() || 'totalViews';
    
    // Map field names to actual data fields
    const fieldMap = {
        'totalViews': 'Total Views',
        'price': 'Price',
        'estRevenue': 'Est. Revenue',
        'hearts': 'Hearts',
        'listingAge': 'Listing Age (Days)',
        'dailyViews': 'Daily Views',
        'estSales': 'Est. Sales'
    };
    
    // Create chart configuration based on visualization type
    let chartConfig = {
        type: 'bar', // default
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            const shop = filteredData[idx] ? filteredData[idx]['Shop / Listing'].split(':')[0] : '';
                            return shop;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };
    
    // Limit data size for better visualization
    const maxItems = 100;
    const chartData = filteredData.slice(0, maxItems);
    
    // Configure chart based on type
    switch (currentVisualization) {
        case 'bar':
            chartConfig.type = 'bar';
            
            // Set labels (shop names)
            chartConfig.data.labels = chartData.map(item => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName;
            });
            
            // Add datasets for main metrics
            chartConfig.data.datasets = [
                {
                    label: 'Total Views',
                    data: chartData.map(item => item['Total Views']),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Hearts',
                    data: chartData.map(item => item['Hearts']),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Est. Revenue ($)',
                    data: chartData.map(item => item['Est. Revenue']),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ];
            
            // Set bar chart options
            chartConfig.options.scales = {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxRotation: 90,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            };
            break;
            
        case 'scatter':
            chartConfig.type = 'scatter';
            
            // Create scatter plot dataset
            chartConfig.data.datasets = [{
                label: `${fieldMap[xAxis]} vs ${fieldMap[yAxis]}`,
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]]
                })),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
            }];
            
            // Set scatter plot options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (xAxis === 'price' || xAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (yAxis === 'price' || yAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`
                ];
            };
            break;
            
        case 'pie':
            chartConfig.type = 'pie';
            
            // Group data by a property (e.g., price range)
            const priceRanges = {
                'Under $5': chartData.filter(item => item['Price'] < 5).length,
                '$5 - $10': chartData.filter(item => item['Price'] >= 5 && item['Price'] < 10).length,
                '$10 - $20': chartData.filter(item => item['Price'] >= 10 && item['Price'] < 20).length,
                '$20 - $50': chartData.filter(item => item['Price'] >= 20 && item['Price'] < 50).length,
                'Over $50': chartData.filter(item => item['Price'] >= 50).length
            };
            
            chartConfig.data.labels = Object.keys(priceRanges);
            chartConfig.data.datasets = [{
                label: 'Price Ranges',
                data: Object.values(priceRanges),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }];
            
            // Set pie chart options
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
            };
            break;
            
        case 'bubble':
            chartConfig.type = 'bubble';
            
            // Create bubble chart dataset
            chartConfig.data.datasets = [{
                label: 'Listings',
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]],
                    r: Math.sqrt(item['Hearts']) / 3 + 5 // Bubble size based on hearts
                })),
                backgroundColor: chartData.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`),
                borderWidth: 1
            }];
            
            // Set bubble chart options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`,
                    `Hearts: ${item['Hearts']}`
                ];
            };
            break;
            
        case 'radar':
            chartConfig.type = 'radar';
            
            // Select top 5 listings for radar chart
            const top5 = chartData.slice(0, 5);
            
            chartConfig.data.labels = ['Views', 'Hearts', 'Revenue', 'Listing Age', 'Daily Views'];
            
            // Normalize values for radar chart (0-100 scale)
            const maxValues = {
                'Total Views': Math.max(...top5.map(item => item['Total Views'])),
                'Hearts': Math.max(...top5.map(item => item['Hearts'])),
                'Est. Revenue': Math.max(...top5.map(item => item['Est. Revenue'])),
                'Listing Age (Days)': Math.max(...top5.map(item => item['Listing Age (Days)'])),
                'Daily Views': Math.max(...top5.map(item => item['Daily Views']))
            };
            
            chartConfig.data.datasets = top5.map((item, index) => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return {
                    label: shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName,
                    data: [
                        (item['Total Views'] / maxValues['Total Views'] * 100) || 0,
                        (item['Hearts'] / maxValues['Hearts'] * 100) || 0,
                        (item['Est. Revenue'] / maxValues['Est. Revenue'] * 100) || 0,
                        (item['Listing Age (Days)'] / maxValues['Listing Age (Days)'] * 100) || 0,
                        (item['Daily Views'] / maxValues['Daily Views'] * 100) || 0
                    ],
                    borderColor: `hsl(${index * 60}, 70%, 60%)`,
                    backgroundColor: `hsla(${index * 60}, 70%, 60%, 0.3)`
                };
            });
            break;
            
        case 'heatmap':
            // For heatmap, we'll use a modified bar chart
            chartConfig.type = 'bar';
            
            // Group by listing age and price ranges
            const ageRanges = {
                'New (< 100 days)': chartData.filter(item => item['Listing Age (Days)'] < 100),
                'Established (100-500 days)': chartData.filter(item => item['Listing Age (Days)'] >= 100 && item['Listing Age (Days)'] < 500),
                'Mature (500+ days)': chartData.filter(item => item['Listing Age (Days)'] >= 500)
            };
            
            chartConfig.data.labels = Object.keys(ageRanges);
            
            // Create datasets for different price ranges
            const priceRanges2 = [
                { label: 'Under $5', filter: item => item['Price'] < 5, color: 'rgba(54, 162, 235, 0.7)' },
                { label: '$5 - $20', filter: item => item['Price'] >= 5 && item['Price'] < 20, color: 'rgba(255, 206, 86, 0.7)' },
                { label: 'Over $20', filter: item => item['Price'] >= 20, color: 'rgba(255, 99, 132, 0.7)' }
            ];
            
            chartConfig.data.datasets = priceRanges2.map(range => ({
                label: range.label,
                data: Object.values(ageRanges).map(items => items.filter(range.filter).length),
                backgroundColor: range.color,
                borderColor: range.color.replace('0.7', '1'),
                borderWidth: 1
            }));
            
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: 'Listing Age'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Listings'
                    },
                    beginAtZero: true
                }
            };
            break;
    }
    
    // Create the chart
    chart = new Chart(ctx, chartConfig);
}

/**
 * Show loading state while data is being loaded
 */
function showLoadingState() {
    $('#loading-section').show();
    $('#loading-message').show();
    $('#data-loaded').hide();
    $('.dashboard-content').hide();
}

/**
 * Show content after data has been loaded
 */
function showDataLoadedState() {
    $('#loading-message').hide();
    $('#data-loaded').fadeIn(300);
    
    // Short delay before showing dashboard content for better UX
    setTimeout(() => {
        $('#loading-section').fadeOut(300);
        $('.dashboard-content').fadeIn(500);
    }, 1000);
}

/**
 * Export current filtered data as CSV
 */
function exportCSV() {
    // Create CSV content
    const headers = Object.keys(filteredData[0] || {}).join(',');
    const rows = filteredData.map(item => {
        return Object.values(item).map(value => {
            // Handle string values with commas
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'etsy_filtered_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export current chart as image
 */
function exportImage() {
    if (currentVisualization === 'table') {
        alert('Please switch to a chart visualization to export an image.');
        return;
    }
    
    // Get chart canvas
    const canvas = document.getElementById('chart-canvas');
    const url = canvas.toDataURL('image/png');
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `etsy_${currentVisualization}_chart.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Sort the filtered data based on the selected option
 */
function sortData(sortOption) {
    const [field, direction] = sortOption.split('-');
    
    // Map sort field to actual data field
    const fieldMap = {
        'totalViews': 'Total Views',
        'price': 'Price',
        'estRevenue': 'Est. Revenue',
        'hearts': 'Hearts',
        'listingAge': 'Listing Age (Days)',
        'dailyViews': 'Daily Views',
        'estSales': 'Est. Sales'
    };
    
    const dataField = fieldMap[field] || 'Total Views';
    
    filteredData.sort((a, b) => {
        if (direction === 'asc') {
            return a[dataField] - b[dataField];
        } else {
            return b[dataField] - a[dataField];
        }
    });
}

/**
 * Update chart visualization based on current data and selected type
 */
function updateChart() {
    // Get chart canvas
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Get selected axes for scatter and bubble charts
    const xAxis = $('#x-axis-select').val() || 'listingAge';
    const yAxis = $('#y-axis-select').val() || 'totalViews';
    
    // Map field names to actual data fields
    const fieldMap = {
        'totalViews': 'Total Views',
        'price': 'Price',
        'estRevenue': 'Est. Revenue',
        'hearts': 'Hearts',
        'listingAge': 'Listing Age (Days)',
        'dailyViews': 'Daily Views',
        'estSales': 'Est. Sales'
    };
    
    // Create chart configuration based on visualization type
    let chartConfig = {
        type: 'bar', // default
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            const shop = filteredData[idx] ? filteredData[idx]['Shop / Listing'].split(':')[0] : '';
                            return shop;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };
    
    // Limit data size for better visualization
    const maxItems = 100;
    const chartData = filteredData.slice(0, maxItems);
    
    // Configure chart based on type
    switch (currentVisualization) {
        case 'bar':
            chartConfig.type = 'bar';
            
            // Set labels (shop names)
            chartConfig.data.labels = chartData.map(item => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName;
            });
            
            // Add datasets for main metrics
            chartConfig.data.datasets = [
                {
                    label: 'Total Views',
                    data: chartData.map(item => item['Total Views']),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Hearts',
                    data: chartData.map(item => item['Hearts']),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Est. Revenue ($)',
                    data: chartData.map(item => item['Est. Revenue']),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ];
            
            // Set bar chart options
            chartConfig.options.scales = {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxRotation: 90,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            };
            break;
            
        case 'scatter':
            chartConfig.type = 'scatter';
            
            // Create scatter plot dataset
            chartConfig.data.datasets = [{
                label: `${fieldMap[xAxis]} vs ${fieldMap[yAxis]}`,
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]]
                })),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
            }];
            
            // Set scatter plot options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (xAxis === 'price' || xAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (yAxis === 'price' || yAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`
                ];
            };
            break;
            
        case 'pie':
            chartConfig.type = 'pie';
            
            // Group data by a property (e.g., price range)
            const priceRanges = {
                'Under $5': chartData.filter(item => item['Price'] < 5).length,
                '$5 - $10': chartData.filter(item => item['Price'] >= 5 && item['Price'] < 10).length,
                '$10 - $20': chartData.filter(item => item['Price'] >= 10 && item['Price'] < 20).length,
                '$20 - $50': chartData.filter(item => item['Price'] >= 20 && item['Price'] < 50).length,
                'Over $50': chartData.filter(item => item['Price'] >= 50).length
            };
            
            chartConfig.data.labels = Object.keys(priceRanges);
            chartConfig.data.datasets = [{
                label: 'Price Ranges',
                data: Object.values(priceRanges),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }];
            
            // Set pie chart options
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
            };
            break;
            
        case 'bubble':
            chartConfig.type = 'bubble';
            
            // Create bubble chart dataset
            chartConfig.data.datasets = [{
                label: 'Listings',
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]],
                    r: Math.sqrt(item['Hearts']) / 3 + 5 // Bubble size based on hearts
                })),
                backgroundColor: chartData.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`),
                borderWidth: 1
            }];
            
            // Set bubble chart options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`,
                    `Hearts: ${item['Hearts']}`
                ];
            };
            break;
            
        case 'radar':
            chartConfig.type = 'radar';
            
            // Select top 5 listings for radar chart
            const top5 = chartData.slice(0, 5);
            
            chartConfig.data.labels = ['Views', 'Hearts', 'Revenue', 'Listing Age', 'Daily Views'];
            
            // Normalize values for radar chart (0-100 scale)
            const maxValues = {
                'Total Views': Math.max(...top5.map(item => item['Total Views'])),
                'Hearts': Math.max(...top5.map(item => item['Hearts'])),
                'Est. Revenue': Math.max(...top5.map(item => item['Est. Revenue'])),
                'Listing Age (Days)': Math.max(...top5.map(item => item['Listing Age (Days)'])),
                'Daily Views': Math.max(...top5.map(item => item['Daily Views']))
            };
            
            chartConfig.data.datasets = top5.map((item, index) => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return {
                    label: shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName,
                    data: [
                        (item['Total Views'] / maxValues['Total Views'] * 100) || 0,
                        (item['Hearts'] / maxValues['Hearts'] * 100) || 0,
                        (item['Est. Revenue'] / maxValues['Est. Revenue'] * 100) || 0,
                        (item['Listing Age (Days)'] / maxValues['Listing Age (Days)'] * 100) || 0,
                        (item['Daily Views'] / maxValues['Daily Views'] * 100) || 0
                    ],
                    borderColor: `hsl(${index * 60}, 70%, 60%)`,
                    backgroundColor: `hsla(${index * 60}, 70%, 60%, 0.3)`
                };
            });
            break;
            
        case 'heatmap':
            // For heatmap, we'll use a modified bar chart
            chartConfig.type = 'bar';
            
            // Group by listing age and price ranges
            const ageRanges = {
                'New (< 100 days)': chartData.filter(item => item['Listing Age (Days)'] < 100),
                'Established (100-500 days)': chartData.filter(item => item['Listing Age (Days)'] >= 100 && item['Listing Age (Days)'] < 500),
                'Mature (500+ days)': chartData.filter(item => item['Listing Age (Days)'] >= 500)
            };
            
            chartConfig.data.labels = Object.keys(ageRanges);
            
            // Create datasets for different price ranges
            const priceRanges2 = [
                { label: 'Under $5', filter: item => item['Price'] < 5, color: 'rgba(54, 162, 235, 0.7)' },
                { label: '$5 - $20', filter: item => item['Price'] >= 5 && item['Price'] < 20, color: 'rgba(255, 206, 86, 0.7)' },
                { label: 'Over $20', filter: item => item['Price'] >= 20, color: 'rgba(255, 99, 132, 0.7)' }
            ];
            
            chartConfig.data.datasets = priceRanges2.map(range => ({
                label: range.label,
                data: Object.values(ageRanges).map(items => items.filter(range.filter).length),
                backgroundColor: range.color,
                borderColor: range.color.replace('0.7', '1'),
                borderWidth: 1
            }));
            
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: 'Listing Age'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Listings'
                    },
                    beginAtZero: true
                }
            };
            break;
    }
    
    // Create the chart
    chart = new Chart(ctx, chartConfig);
}

/**
 * Show loading state while data is being loaded
 */
function showLoadingState() {
    $('#loading-section').show();
    $('#loading-message').show();
    $('#data-loaded').hide();
    $('.dashboard-content').hide();
}

/**
 * Show content after data has been loaded
 */
function showDataLoadedState() {
    $('#loading-message').hide();
    $('#data-loaded').fadeIn(300);
    
    // Short delay before showing dashboard content for better UX
    setTimeout(() => {
        $('#loading-section').fadeOut(300);
        $('.dashboard-content').fadeIn(500);
    }, 1000);
}

/**
 * Export current filtered data as CSV
 */
function exportCSV() {
    // Create CSV content
    const headers = Object.keys(filteredData[0] || {}).join(',');
    const rows = filteredData.map(item => {
        return Object.values(item).map(value => {
            // Handle string values with commas
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'etsy_filtered_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export current chart as image
 */
function exportImage() {
    if (currentVisualization === 'table') {
        alert('Please switch to a chart visualization to export an image.');
        return;
    }
    
    // Get chart canvas
    const canvas = document.getElementById('chart-canvas');
    const url = canvas.toDataURL('image/png');
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `etsy_${currentVisualization}_chart.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Switch between different visualization types
 */
function switchVisualization(vizType) {
    // Update active button
    $('.btn-viz').removeClass('active');
    $(`.btn-viz[data-viz='${vizType}']`).addClass('active');
    
    // Save current visualization type
    currentVisualization = vizType;
    
    // Show/hide axis selectors based on visualization type
    if (['scatter', 'bubble'].includes(vizType)) {
        $('#x-axis-select, #y-axis-select').removeClass('d-none');
    } else {
        $('#x-axis-select, #y-axis-select').addClass('d-none');
    }
    
    // Show appropriate view
    if (vizType === 'table') {
        $('#chart-view').hide();
        $('#table-view').fadeIn(300);
        renderTableView();
        
        // Update title
        $('#viz-title').text('Data Table View');
    } else {
        $('#table-view').hide();
        $('#chart-view').fadeIn(300);
        updateChart();
        
        // Update title based on visualization type
        const titleMap = {
            'bar': 'Bar Chart',
            'scatter': 'Scatter Plot',
            'pie': 'Pie Chart',
            'bubble': 'Bubble Chart',
            'radar': 'Radar Chart',
            'heatmap': 'Heatmap Visualization'
        };
        
        $('#viz-title').text(titleMap[vizType] || 'Chart Visualization');
    }
}

/**
 * Update chart visualization based on current data and selected type
 */
function updateChart() {
    // Get chart canvas
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Get selected axes for scatter and bubble charts
    const xAxis = $('#x-axis-select').val() || 'listingAge';
    const yAxis = $('#y-axis-select').val() || 'totalViews';
    
    // Map field names to actual data fields
    const fieldMap = {
        'totalViews': 'Total Views',
        'price': 'Price',
        'estRevenue': 'Est. Revenue',
        'hearts': 'Hearts',
        'listingAge': 'Listing Age (Days)',
        'dailyViews': 'Daily Views',
        'estSales': 'Est. Sales'
    };
    
    // Create chart configuration based on visualization type
    let chartConfig = {
        type: 'bar', // default
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            const shop = filteredData[idx] ? filteredData[idx]['Shop / Listing'].split(':')[0] : '';
                            return shop;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };
    
    // Limit data size for better visualization
    const maxItems = 100;
    const chartData = filteredData.slice(0, maxItems);
    
    // Configure chart based on type
    switch (currentVisualization) {
        case 'bar':
            chartConfig.type = 'bar';
            
            // Set labels (shop names)
            chartConfig.data.labels = chartData.map(item => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName;
            });
            
            // Add datasets for main metrics
            chartConfig.data.datasets = [
                {
                    label: 'Total Views',
                    data: chartData.map(item => item['Total Views']),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Hearts',
                    data: chartData.map(item => item['Hearts']),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Est. Revenue ($)',
                    data: chartData.map(item => item['Est. Revenue']),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ];
            
            // Set bar chart options
            chartConfig.options.scales = {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxRotation: 90,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            };
            break;
            
        case 'scatter':
            chartConfig.type = 'scatter';
            
            // Create scatter plot dataset
            chartConfig.data.datasets = [{
                label: `${fieldMap[xAxis]} vs ${fieldMap[yAxis]}`,
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]]
                })),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
            }];
            
            // Set scatter plot options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (xAxis === 'price' || xAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (yAxis === 'price' || yAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`
                ];
            };
            break;
            
        case 'pie':
            chartConfig.type = 'pie';
            
            // Group data by a property (e.g., price range)
            const priceRanges = {
                'Under $5': chartData.filter(item => item['Price'] < 5).length,
                '$5 - $10': chartData.filter(item => item['Price'] >= 5 && item['Price'] < 10).length,
                '$10 - $20': chartData.filter(item => item['Price'] >= 10 && item['Price'] < 20).length,
                '$20 - $50': chartData.filter(item => item['Price'] >= 20 && item['Price'] < 50).length,
                'Over $50': chartData.filter(item => item['Price'] >= 50).length
            };
            
            chartConfig.data.labels = Object.keys(priceRanges);
            chartConfig.data.datasets = [{
                label: 'Price Ranges',
                data: Object.values(priceRanges),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }];
            
            // Set pie chart options
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
            };
            break;
            
        case 'bubble':
            chartConfig.type = 'bubble';
            
            // Create bubble chart dataset
            chartConfig.data.datasets = [{
                label: 'Listings',
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]],
                    r: Math.sqrt(item['Hearts']) / 3 + 5 // Bubble size based on hearts
                })),
                backgroundColor: chartData.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`),
                borderWidth: 1
            }];
            
            // Set bubble chart options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`,
                    `Hearts: ${item['Hearts']}`
                ];
            };
            break;
            
        case 'radar':
            chartConfig.type = 'radar';
            
            // Select top 5 listings for radar chart
            const top5 = chartData.slice(0, 5);
            
            chartConfig.data.labels = ['Views', 'Hearts', 'Revenue', 'Listing Age', 'Daily Views'];
            
            // Normalize values for radar chart (0-100 scale)
            const maxValues = {
                'Total Views': Math.max(...top5.map(item => item['Total Views'])),
                'Hearts': Math.max(...top5.map(item => item['Hearts'])),
                'Est. Revenue': Math.max(...top5.map(item => item['Est. Revenue'])),
                'Listing Age (Days)': Math.max(...top5.map(item => item['Listing Age (Days)'])),
                'Daily Views': Math.max(...top5.map(item => item['Daily Views']))
            };
            
            chartConfig.data.datasets = top5.map((item, index) => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return {
                    label: shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName,
                    data: [
                        (item['Total Views'] / maxValues['Total Views'] * 100) || 0,
                        (item['Hearts'] / maxValues['Hearts'] * 100) || 0,
                        (item['Est. Revenue'] / maxValues['Est. Revenue'] * 100) || 0,
                        (item['Listing Age (Days)'] / maxValues['Listing Age (Days)'] * 100) || 0,
                        (item['Daily Views'] / maxValues['Daily Views'] * 100) || 0
                    ],
                    borderColor: `hsl(${index * 60}, 70%, 60%)`,
                    backgroundColor: `hsla(${index * 60}, 70%, 60%, 0.3)`
                };
            });
            break;
            
        case 'heatmap':
            // For heatmap, we'll use a modified bar chart
            chartConfig.type = 'bar';
            
            // Group by listing age and price ranges
            const ageRanges = {
                'New (< 100 days)': chartData.filter(item => item['Listing Age (Days)'] < 100),
                'Established (100-500 days)': chartData.filter(item => item['Listing Age (Days)'] >= 100 && item['Listing Age (Days)'] < 500),
                'Mature (500+ days)': chartData.filter(item => item['Listing Age (Days)'] >= 500)
            };
            
            chartConfig.data.labels = Object.keys(ageRanges);
            
            // Create datasets for different price ranges
            const priceRanges2 = [
                { label: 'Under $5', filter: item => item['Price'] < 5, color: 'rgba(54, 162, 235, 0.7)' },
                { label: '$5 - $20', filter: item => item['Price'] >= 5 && item['Price'] < 20, color: 'rgba(255, 206, 86, 0.7)' },
                { label: 'Over $20', filter: item => item['Price'] >= 20, color: 'rgba(255, 99, 132, 0.7)' }
            ];
            
            chartConfig.data.datasets = priceRanges2.map(range => ({
                label: range.label,
                data: Object.values(ageRanges).map(items => items.filter(range.filter).length),
                backgroundColor: range.color,
                borderColor: range.color.replace('0.7', '1'),
                borderWidth: 1
            }));
            
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: 'Listing Age'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Listings'
                    },
                    beginAtZero: true
                }
            };
            break;
    }
    
    // Create the chart
    chart = new Chart(ctx, chartConfig);
}

/**
 * Show loading state while data is being loaded
 */
function showLoadingState() {
    $('#loading-section').show();
    $('#loading-message').show();
    $('#data-loaded').hide();
    $('.dashboard-content').hide();
}

/**
 * Show content after data has been loaded
 */
function showDataLoadedState() {
    $('#loading-message').hide();
    $('#data-loaded').fadeIn(300);
    
    // Short delay before showing dashboard content for better UX
    setTimeout(() => {
        $('#loading-section').fadeOut(300);
        $('.dashboard-content').fadeIn(500);
    }, 1000);
}

/**
 * Export current filtered data as CSV
 */
function exportCSV() {
    // Create CSV content
    const headers = Object.keys(filteredData[0] || {}).join(',');
    const rows = filteredData.map(item => {
        return Object.values(item).map(value => {
            // Handle string values with commas
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'etsy_filtered_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export current chart as image
 */
function exportImage() {
    if (currentVisualization === 'table') {
        alert('Please switch to a chart visualization to export an image.');
        return;
    }
    
    // Get chart canvas
    const canvas = document.getElementById('chart-canvas');
    const url = canvas.toDataURL('image/png');
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `etsy_${currentVisualization}_chart.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Reset all filters to their default values
 */
function resetFilters() {
    // Reset all form inputs
    $('#filter-form')[0].reset();
    
    // Reset filtered data to raw data
    filteredData = [...rawData];
    currentPage = 1;
    
    // Update the view
    updateResultsOverview();
    
    if (currentVisualization === 'table') {
        renderTableView();
    } else {
        updateChart();
    }
    
    // Show success message
    $.toast({
        heading: 'Reset Complete',
        text: 'All filters have been reset to default values.',
        showHideTransition: 'slide',
        icon: 'info',
        position: 'top-right',
        hideAfter: 3000
    });
}

/**
 * Update chart visualization based on current data and selected type
 */
function updateChart() {
    // Get chart canvas
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Get selected axes for scatter and bubble charts
    const xAxis = $('#x-axis-select').val() || 'listingAge';
    const yAxis = $('#y-axis-select').val() || 'totalViews';
    
    // Map field names to actual data fields
    const fieldMap = {
        'totalViews': 'Total Views',
        'price': 'Price',
        'estRevenue': 'Est. Revenue',
        'hearts': 'Hearts',
        'listingAge': 'Listing Age (Days)',
        'dailyViews': 'Daily Views',
        'estSales': 'Est. Sales'
    };
    
    // Create chart configuration based on visualization type
    let chartConfig = {
        type: 'bar', // default
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            const shop = filteredData[idx] ? filteredData[idx]['Shop / Listing'].split(':')[0] : '';
                            return shop;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };
    
    // Limit data size for better visualization
    const maxItems = 100;
    const chartData = filteredData.slice(0, maxItems);
    
    // Configure chart based on type
    switch (currentVisualization) {
        case 'bar':
            chartConfig.type = 'bar';
            
            // Set labels (shop names)
            chartConfig.data.labels = chartData.map(item => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName;
            });
            
            // Add datasets for main metrics
            chartConfig.data.datasets = [
                {
                    label: 'Total Views',
                    data: chartData.map(item => item['Total Views']),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Hearts',
                    data: chartData.map(item => item['Hearts']),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Est. Revenue ($)',
                    data: chartData.map(item => item['Est. Revenue']),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ];
            
            // Set bar chart options
            chartConfig.options.scales = {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxRotation: 90,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            };
            break;
            
        case 'scatter':
            chartConfig.type = 'scatter';
            
            // Create scatter plot dataset
            chartConfig.data.datasets = [{
                label: `${fieldMap[xAxis]} vs ${fieldMap[yAxis]}`,
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]]
                })),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
            }];
            
            // Set scatter plot options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (xAxis === 'price' || xAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (yAxis === 'price' || yAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`
                ];
            };
            break;
            
        case 'pie':
            chartConfig.type = 'pie';
            
            // Group data by a property (e.g., price range)
            const priceRanges = {
                'Under $5': chartData.filter(item => item['Price'] < 5).length,
                '$5 - $10': chartData.filter(item => item['Price'] >= 5 && item['Price'] < 10).length,
                '$10 - $20': chartData.filter(item => item['Price'] >= 10 && item['Price'] < 20).length,
                '$20 - $50': chartData.filter(item => item['Price'] >= 20 && item['Price'] < 50).length,
                'Over $50': chartData.filter(item => item['Price'] >= 50).length
            };
            
            chartConfig.data.labels = Object.keys(priceRanges);
            chartConfig.data.datasets = [{
                label: 'Price Ranges',
                data: Object.values(priceRanges),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }];
            
            // Set pie chart options
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
            };
            break;
            
        case 'bubble':
            chartConfig.type = 'bubble';
            
            // Create bubble chart dataset
            chartConfig.data.datasets = [{
                label: 'Listings',
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]],
                    r: Math.sqrt(item['Hearts']) / 3 + 5 // Bubble size based on hearts
                })),
                backgroundColor: chartData.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`),
                borderWidth: 1
            }];
            
            // Set bubble chart options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`,
                    `Hearts: ${item['Hearts']}`
                ];
            };
            break;
            
        case 'radar':
            chartConfig.type = 'radar';
            
            // Select top 5 listings for radar chart
            const top5 = chartData.slice(0, 5);
            
            chartConfig.data.labels = ['Views', 'Hearts', 'Revenue', 'Listing Age', 'Daily Views'];
            
            // Normalize values for radar chart (0-100 scale)
            const maxValues = {
                'Total Views': Math.max(...top5.map(item => item['Total Views'])),
                'Hearts': Math.max(...top5.map(item => item['Hearts'])),
                'Est. Revenue': Math.max(...top5.map(item => item['Est. Revenue'])),
                'Listing Age (Days)': Math.max(...top5.map(item => item['Listing Age (Days)'])),
                'Daily Views': Math.max(...top5.map(item => item['Daily Views']))
            };
            
            chartConfig.data.datasets = top5.map((item, index) => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return {
                    label: shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName,
                    data: [
                        (item['Total Views'] / maxValues['Total Views'] * 100) || 0,
                        (item['Hearts'] / maxValues['Hearts'] * 100) || 0,
                        (item['Est. Revenue'] / maxValues['Est. Revenue'] * 100) || 0,
                        (item['Listing Age (Days)'] / maxValues['Listing Age (Days)'] * 100) || 0,
                        (item['Daily Views'] / maxValues['Daily Views'] * 100) || 0
                    ],
                    borderColor: `hsl(${index * 60}, 70%, 60%)`,
                    backgroundColor: `hsla(${index * 60}, 70%, 60%, 0.3)`
                };
            });
            break;
            
        case 'heatmap':
            // For heatmap, we'll use a modified bar chart
            chartConfig.type = 'bar';
            
            // Group by listing age and price ranges
            const ageRanges = {
                'New (< 100 days)': chartData.filter(item => item['Listing Age (Days)'] < 100),
                'Established (100-500 days)': chartData.filter(item => item['Listing Age (Days)'] >= 100 && item['Listing Age (Days)'] < 500),
                'Mature (500+ days)': chartData.filter(item => item['Listing Age (Days)'] >= 500)
            };
            
            chartConfig.data.labels = Object.keys(ageRanges);
            
            // Create datasets for different price ranges
            const priceRanges2 = [
                { label: 'Under $5', filter: item => item['Price'] < 5, color: 'rgba(54, 162, 235, 0.7)' },
                { label: '$5 - $20', filter: item => item['Price'] >= 5 && item['Price'] < 20, color: 'rgba(255, 206, 86, 0.7)' },
                { label: 'Over $20', filter: item => item['Price'] >= 20, color: 'rgba(255, 99, 132, 0.7)' }
            ];
            
            chartConfig.data.datasets = priceRanges2.map(range => ({
                label: range.label,
                data: Object.values(ageRanges).map(items => items.filter(range.filter).length),
                backgroundColor: range.color,
                borderColor: range.color.replace('0.7', '1'),
                borderWidth: 1
            }));
            
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: 'Listing Age'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Listings'
                    },
                    beginAtZero: true
                }
            };
            break;
    }
    
    // Create the chart
    chart = new Chart(ctx, chartConfig);
}

/**
 * Show loading state while data is being loaded
 */
function showLoadingState() {
    $('#loading-section').show();
    $('#loading-message').show();
    $('#data-loaded').hide();
    $('.dashboard-content').hide();
}

/**
 * Show content after data has been loaded
 */
function showDataLoadedState() {
    $('#loading-message').hide();
    $('#data-loaded').fadeIn(300);
    
    // Short delay before showing dashboard content for better UX
    setTimeout(() => {
        $('#loading-section').fadeOut(300);
        $('.dashboard-content').fadeIn(500);
    }, 1000);
}

/**
 * Export current filtered data as CSV
 */
function exportCSV() {
    // Create CSV content
    const headers = Object.keys(filteredData[0] || {}).join(',');
    const rows = filteredData.map(item => {
        return Object.values(item).map(value => {
            // Handle string values with commas
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'etsy_filtered_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export current chart as image
 */
function exportImage() {
    if (currentVisualization === 'table') {
        alert('Please switch to a chart visualization to export an image.');
        return;
    }
    
    // Get chart canvas
    const canvas = document.getElementById('chart-canvas');
    const url = canvas.toDataURL('image/png');
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `etsy_${currentVisualization}_chart.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Toggle the visibility of the filters section
 */
function toggleFilters() {
    const $filtersBody = $('#filters-body');
    const $toggleButton = $('#toggle-filters');
    
    if ($filtersBody.is(':visible')) {
        $filtersBody.slideUp(300);
        $toggleButton.text('Show Filters');
    } else {
        $filtersBody.slideDown(300);
        $toggleButton.text('Hide Filters');
    }
}

/**
 * Update chart visualization based on current data and selected type
 */
function updateChart() {
    // Get chart canvas
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Get selected axes for scatter and bubble charts
    const xAxis = $('#x-axis-select').val() || 'listingAge';
    const yAxis = $('#y-axis-select').val() || 'totalViews';
    
    // Map field names to actual data fields
    const fieldMap = {
        'totalViews': 'Total Views',
        'price': 'Price',
        'estRevenue': 'Est. Revenue',
        'hearts': 'Hearts',
        'listingAge': 'Listing Age (Days)',
        'dailyViews': 'Daily Views',
        'estSales': 'Est. Sales'
    };
    
    // Create chart configuration based on visualization type
    let chartConfig = {
        type: 'bar', // default
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            const shop = filteredData[idx] ? filteredData[idx]['Shop / Listing'].split(':')[0] : '';
                            return shop;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };
    
    // Limit data size for better visualization
    const maxItems = 100;
    const chartData = filteredData.slice(0, maxItems);
    
    // Configure chart based on type
    switch (currentVisualization) {
        case 'bar':
            chartConfig.type = 'bar';
            
            // Set labels (shop names)
            chartConfig.data.labels = chartData.map(item => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName;
            });
            
            // Add datasets for main metrics
            chartConfig.data.datasets = [
                {
                    label: 'Total Views',
                    data: chartData.map(item => item['Total Views']),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Hearts',
                    data: chartData.map(item => item['Hearts']),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Est. Revenue ($)',
                    data: chartData.map(item => item['Est. Revenue']),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ];
            
            // Set bar chart options
            chartConfig.options.scales = {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxRotation: 90,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            };
            break;
            
        case 'scatter':
            chartConfig.type = 'scatter';
            
            // Create scatter plot dataset
            chartConfig.data.datasets = [{
                label: `${fieldMap[xAxis]} vs ${fieldMap[yAxis]}`,
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]]
                })),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
            }];
            
            // Set scatter plot options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (xAxis === 'price' || xAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (yAxis === 'price' || yAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`
                ];
            };
            break;
            
        case 'pie':
            chartConfig.type = 'pie';
            
            // Group data by a property (e.g., price range)
            const priceRanges = {
                'Under $5': chartData.filter(item => item['Price'] < 5).length,
                '$5 - $10': chartData.filter(item => item['Price'] >= 5 && item['Price'] < 10).length,
                '$10 - $20': chartData.filter(item => item['Price'] >= 10 && item['Price'] < 20).length,
                '$20 - $50': chartData.filter(item => item['Price'] >= 20 && item['Price'] < 50).length,
                'Over $50': chartData.filter(item => item['Price'] >= 50).length
            };
            
            chartConfig.data.labels = Object.keys(priceRanges);
            chartConfig.data.datasets = [{
                label: 'Price Ranges',
                data: Object.values(priceRanges),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }];
            
            // Set pie chart options
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
            };
            break;
            
        case 'bubble':
            chartConfig.type = 'bubble';
            
            // Create bubble chart dataset
            chartConfig.data.datasets = [{
                label: 'Listings',
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]],
                    r: Math.sqrt(item['Hearts']) / 3 + 5 // Bubble size based on hearts
                })),
                backgroundColor: chartData.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`),
                borderWidth: 1
            }];
            
            // Set bubble chart options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`,
                    `Hearts: ${item['Hearts']}`
                ];
            };
            break;
            
        case 'radar':
            chartConfig.type = 'radar';
            
            // Select top 5 listings for radar chart
            const top5 = chartData.slice(0, 5);
            
            chartConfig.data.labels = ['Views', 'Hearts', 'Revenue', 'Listing Age', 'Daily Views'];
            
            // Normalize values for radar chart (0-100 scale)
            const maxValues = {
                'Total Views': Math.max(...top5.map(item => item['Total Views'])),
                'Hearts': Math.max(...top5.map(item => item['Hearts'])),
                'Est. Revenue': Math.max(...top5.map(item => item['Est. Revenue'])),
                'Listing Age (Days)': Math.max(...top5.map(item => item['Listing Age (Days)'])),
                'Daily Views': Math.max(...top5.map(item => item['Daily Views']))
            };
            
            chartConfig.data.datasets = top5.map((item, index) => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return {
                    label: shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName,
                    data: [
                        (item['Total Views'] / maxValues['Total Views'] * 100) || 0,
                        (item['Hearts'] / maxValues['Hearts'] * 100) || 0,
                        (item['Est. Revenue'] / maxValues['Est. Revenue'] * 100) || 0,
                        (item['Listing Age (Days)'] / maxValues['Listing Age (Days)'] * 100) || 0,
                        (item['Daily Views'] / maxValues['Daily Views'] * 100) || 0
                    ],
                    borderColor: `hsl(${index * 60}, 70%, 60%)`,
                    backgroundColor: `hsla(${index * 60}, 70%, 60%, 0.3)`
                };
            });
            break;
            
        case 'heatmap':
            // For heatmap, we'll use a modified bar chart
            chartConfig.type = 'bar';
            
            // Group by listing age and price ranges
            const ageRanges = {
                'New (< 100 days)': chartData.filter(item => item['Listing Age (Days)'] < 100),
                'Established (100-500 days)': chartData.filter(item => item['Listing Age (Days)'] >= 100 && item['Listing Age (Days)'] < 500),
                'Mature (500+ days)': chartData.filter(item => item['Listing Age (Days)'] >= 500)
            };
            
            chartConfig.data.labels = Object.keys(ageRanges);
            
            // Create datasets for different price ranges
            const priceRanges2 = [
                { label: 'Under $5', filter: item => item['Price'] < 5, color: 'rgba(54, 162, 235, 0.7)' },
                { label: '$5 - $20', filter: item => item['Price'] >= 5 && item['Price'] < 20, color: 'rgba(255, 206, 86, 0.7)' },
                { label: 'Over $20', filter: item => item['Price'] >= 20, color: 'rgba(255, 99, 132, 0.7)' }
            ];
            
            chartConfig.data.datasets = priceRanges2.map(range => ({
                label: range.label,
                data: Object.values(ageRanges).map(items => items.filter(range.filter).length),
                backgroundColor: range.color,
                borderColor: range.color.replace('0.7', '1'),
                borderWidth: 1
            }));
            
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: 'Listing Age'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Listings'
                    },
                    beginAtZero: true
                }
            };
            break;
    }
    
    // Create the chart
    chart = new Chart(ctx, chartConfig);
}

/**
 * Show loading state while data is being loaded
 */
function showLoadingState() {
    $('#loading-section').show();
    $('#loading-message').show();
    $('#data-loaded').hide();
    $('.dashboard-content').hide();
}

/**
 * Show content after data has been loaded
 */
function showDataLoadedState() {
    $('#loading-message').hide();
    $('#data-loaded').fadeIn(300);
    
    // Short delay before showing dashboard content for better UX
    setTimeout(() => {
        $('#loading-section').fadeOut(300);
        $('.dashboard-content').fadeIn(500);
    }, 1000);
}

/**
 * Export current filtered data as CSV
 */
function exportCSV() {
    // Create CSV content
    const headers = Object.keys(filteredData[0] || {}).join(',');
    const rows = filteredData.map(item => {
        return Object.values(item).map(value => {
            // Handle string values with commas
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'etsy_filtered_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export current chart as image
 */
function exportImage() {
    if (currentVisualization === 'table') {
        alert('Please switch to a chart visualization to export an image.');
        return;
    }
    
    // Get chart canvas
    const canvas = document.getElementById('chart-canvas');
    const url = canvas.toDataURL('image/png');
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `etsy_${currentVisualization}_chart.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Update the results overview metrics
 */
function updateResultsOverview() {
    // Calculate metrics
    const totalListings = filteredData.length;
    
    let totalPrice = 0;
    let totalRevenue = 0;
    let totalHearts = 0;
    
    filteredData.forEach(item => {
        totalPrice += item['Price'] || 0;
        totalRevenue += item['Est. Revenue'] || 0;
        totalHearts += item['Hearts'] || 0;
    });
    
    const avgPrice = totalListings > 0 ? totalPrice / totalListings : 0;
    
    // Update the UI with jQuery
    $('#total-listings').text(totalListings.toLocaleString());
    $('#avg-price').text('$' + avgPrice.toFixed(2));
    $('#total-revenue').text('$' + totalRevenue.toLocaleString());
    $('#total-hearts').text(totalHearts.toLocaleString());
    
    // Update showing results text
    $('#total-results').text(totalListings.toLocaleString());
    
    // Add animation to the metric cards
    $('.metric-card').each(function(index) {
        $(this).delay(index * 100).animate({opacity: 0.8}, 200).animate({opacity: 1}, 200);
    });
}

/**
 * Update chart visualization based on current data and selected type
 */
function updateChart() {
    // Get chart canvas
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Get selected axes for scatter and bubble charts
    const xAxis = $('#x-axis-select').val() || 'listingAge';
    const yAxis = $('#y-axis-select').val() || 'totalViews';
    
    // Map field names to actual data fields
    const fieldMap = {
        'totalViews': 'Total Views',
        'price': 'Price',
        'estRevenue': 'Est. Revenue',
        'hearts': 'Hearts',
        'listingAge': 'Listing Age (Days)',
        'dailyViews': 'Daily Views',
        'estSales': 'Est. Sales'
    };
    
    // Create chart configuration based on visualization type
    let chartConfig = {
        type: 'bar', // default
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            const shop = filteredData[idx] ? filteredData[idx]['Shop / Listing'].split(':')[0] : '';
                            return shop;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };
    
    // Limit data size for better visualization
    const maxItems = 100;
    const chartData = filteredData.slice(0, maxItems);
    
    // Configure chart based on type
    switch (currentVisualization) {
        case 'bar':
            chartConfig.type = 'bar';
            
            // Set labels (shop names)
            chartConfig.data.labels = chartData.map(item => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName;
            });
            
            // Add datasets for main metrics
            chartConfig.data.datasets = [
                {
                    label: 'Total Views',
                    data: chartData.map(item => item['Total Views']),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Hearts',
                    data: chartData.map(item => item['Hearts']),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Est. Revenue ($)',
                    data: chartData.map(item => item['Est. Revenue']),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ];
            
            // Set bar chart options
            chartConfig.options.scales = {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxRotation: 90,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            };
            break;
            
        case 'scatter':
            chartConfig.type = 'scatter';
            
            // Create scatter plot dataset
            chartConfig.data.datasets = [{
                label: `${fieldMap[xAxis]} vs ${fieldMap[yAxis]}`,
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]]
                })),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
            }];
            
            // Set scatter plot options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (xAxis === 'price' || xAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    },
                    ticks: {
                        callback: function(value) {
                            if (yAxis === 'price' || yAxis === 'estRevenue') {
                                return '$' + value;
                            }
                            return value;
                        }
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`
                ];
            };
            break;
            
        case 'pie':
            chartConfig.type = 'pie';
            
            // Group data by a property (e.g., price range)
            const priceRanges = {
                'Under $5': chartData.filter(item => item['Price'] < 5).length,
                '$5 - $10': chartData.filter(item => item['Price'] >= 5 && item['Price'] < 10).length,
                '$10 - $20': chartData.filter(item => item['Price'] >= 10 && item['Price'] < 20).length,
                '$20 - $50': chartData.filter(item => item['Price'] >= 20 && item['Price'] < 50).length,
                'Over $50': chartData.filter(item => item['Price'] >= 50).length
            };
            
            chartConfig.data.labels = Object.keys(priceRanges);
            chartConfig.data.datasets = [{
                label: 'Price Ranges',
                data: Object.values(priceRanges),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }];
            
            // Set pie chart options
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
            };
            break;
            
        case 'bubble':
            chartConfig.type = 'bubble';
            
            // Create bubble chart dataset
            chartConfig.data.datasets = [{
                label: 'Listings',
                data: chartData.map(item => ({
                    x: item[fieldMap[xAxis]],
                    y: item[fieldMap[yAxis]],
                    r: Math.sqrt(item['Hearts']) / 3 + 5 // Bubble size based on hearts
                })),
                backgroundColor: chartData.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`),
                borderWidth: 1
            }];
            
            // Set bubble chart options
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: fieldMap[xAxis]
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: fieldMap[yAxis]
                    }
                }
            };
            
            // Customize tooltip
            chartConfig.options.plugins.tooltip.callbacks.label = function(context) {
                const idx = context.dataIndex;
                const item = chartData[idx];
                const shopName = item['Shop / Listing'].split(':')[0];
                return [
                    `Shop: ${shopName}`,
                    `${fieldMap[xAxis]}: ${item[fieldMap[xAxis]]}`,
                    `${fieldMap[yAxis]}: ${item[fieldMap[yAxis]]}`,
                    `Hearts: ${item['Hearts']}`
                ];
            };
            break;
            
        case 'radar':
            chartConfig.type = 'radar';
            
            // Select top 5 listings for radar chart
            const top5 = chartData.slice(0, 5);
            
            chartConfig.data.labels = ['Views', 'Hearts', 'Revenue', 'Listing Age', 'Daily Views'];
            
            // Normalize values for radar chart (0-100 scale)
            const maxValues = {
                'Total Views': Math.max(...top5.map(item => item['Total Views'])),
                'Hearts': Math.max(...top5.map(item => item['Hearts'])),
                'Est. Revenue': Math.max(...top5.map(item => item['Est. Revenue'])),
                'Listing Age (Days)': Math.max(...top5.map(item => item['Listing Age (Days)'])),
                'Daily Views': Math.max(...top5.map(item => item['Daily Views']))
            };
            
            chartConfig.data.datasets = top5.map((item, index) => {
                const shopName = item['Shop / Listing'].split(':')[0];
                return {
                    label: shopName.length > 15 ? shopName.substring(0, 15) + '...' : shopName,
                    data: [
                        (item['Total Views'] / maxValues['Total Views'] * 100) || 0,
                        (item['Hearts'] / maxValues['Hearts'] * 100) || 0,
                        (item['Est. Revenue'] / maxValues['Est. Revenue'] * 100) || 0,
                        (item['Listing Age (Days)'] / maxValues['Listing Age (Days)'] * 100) || 0,
                        (item['Daily Views'] / maxValues['Daily Views'] * 100) || 0
                    ],
                    borderColor: `hsl(${index * 60}, 70%, 60%)`,
                    backgroundColor: `hsla(${index * 60}, 70%, 60%, 0.3)`
                };
            });
            break;
            
        case 'heatmap':
            // For heatmap, we'll use a modified bar chart
            chartConfig.type = 'bar';
            
            // Group by listing age and price ranges
            const ageRanges = {
                'New (< 100 days)': chartData.filter(item => item['Listing Age (Days)'] < 100),
                'Established (100-500 days)': chartData.filter(item => item['Listing Age (Days)'] >= 100 && item['Listing Age (Days)'] < 500),
                'Mature (500+ days)': chartData.filter(item => item['Listing Age (Days)'] >= 500)
            };
            
            chartConfig.data.labels = Object.keys(ageRanges);
            
            // Create datasets for different price ranges
            const priceRanges2 = [
                { label: 'Under $5', filter: item => item['Price'] < 5, color: 'rgba(54, 162, 235, 0.7)' },
                { label: '$5 - $20', filter: item => item['Price'] >= 5 && item['Price'] < 20, color: 'rgba(255, 206, 86, 0.7)' },
                { label: 'Over $20', filter: item => item['Price'] >= 20, color: 'rgba(255, 99, 132, 0.7)' }
            ];
            
            chartConfig.data.datasets = priceRanges2.map(range => ({
                label: range.label,
                data: Object.values(ageRanges).map(items => items.filter(range.filter).length),
                backgroundColor: range.color,
                borderColor: range.color.replace('0.7', '1'),
                borderWidth: 1
            }));
            
            chartConfig.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: 'Listing Age'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Listings'
                    },
                    beginAtZero: true
                }
            };
            break;
    }
    
    // Create the chart
    chart = new Chart(ctx, chartConfig);
}

/**
 * Show loading state while data is being loaded
 */
function showLoadingState() {
    $('#loading-section').show();
    $('#loading-message').show();
    $('#data-loaded').hide();
    $('.dashboard-content').hide();
}

/**
 * Show content after data has been loaded
 */
function showDataLoadedState() {
    $('#loading-message').hide();
    $('#data-loaded').fadeIn(300);
    
    // Short delay before showing dashboard content for better UX
    setTimeout(() => {
        $('#loading-section').fadeOut(300);
        $('.dashboard-content').fadeIn(500);
    }, 1000);
}

/**
 * Export current filtered data as CSV
 */
function exportCSV() {
    // Create CSV content
    const headers = Object.keys(filteredData[0] || {}).join(',');
    const rows = filteredData.map(item => {
        return Object.values(item).map(value => {
            // Handle string values with commas
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'etsy_filtered_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export current chart as image
 */
function exportImage() {
    if (currentVisualization === 'table') {
        alert('Please switch to a chart visualization to export an image.');
        return;
    }
    
    // Get chart canvas
    const canvas = document.getElementById('chart-canvas');
    const url = canvas.toDataURL('image/png');
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `etsy_${currentVisualization}_chart.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Render the table view with pagination using jQuery
 */
function renderTableView() {
    const $tableBody = $('#results-table-body');
    const $paginationContainer = $('#pagination');
    
    // Clear existing content
    $tableBody.empty();
    $paginationContainer.empty();
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageData = filteredData.slice(startIndex, endIndex);
    
    // Update showing results count
    $('#showing-results').text(`${startIndex + 1}-${Math.min(endIndex, filteredData.length)} of ${filteredData.length}`);
    
    // Render table rows with jQuery
    $.each(currentPageData, function(index, item) {
        const $row = $('<tr>');
        
        // Shop / Listing column
        const $shopListingCell = $('<td>')
            .text(item['Shop / Listing'])
            .css({
                'max-width': '300px',
                'overflow': 'hidden',
                'text-overflow': 'ellipsis',
                'white-space': 'nowrap'
            })
            .attr('title', item['Shop / Listing']); // Show full text on hover
        
        $row.append($shopListingCell);
        
        // Numeric columns
        $.each(['Listing Age (Days)', 'Total Views', 'Daily Views', 'Est. Sales'], function(i, column) {
            const $cell = $('<td>').text(
                typeof item[column] === 'number' ? item[column].toLocaleString() : item[column]
            );
            $row.append($cell);
        });
        
        // Price column
        const $priceCell = $('<td>').text('$' + (item['Price'] || 0).toFixed(2));
        $row.append($priceCell);
        
        // Est. Revenue column
        const $revenueCell = $('<td>').text('$' + (item['Est. Revenue'] || 0).toLocaleString());
        $row.append($revenueCell);
        
        // Hearts column
        const $heartsCell = $('<td>').text((item['Hearts'] || 0).toLocaleString());
        $row.append($heartsCell);
        
        $tableBody.append($row);
    });
    
    // Add a fade-in effect to the table rows
    $tableBody.find('tr').each(function(index) {
        $(this).hide().delay(index * 50).fadeIn(200);
    });
    
    // Create pagination if needed
    if (totalPages > 1) {
        // Previous button
        const $prevLi = $('<li>')
            .addClass('page-item')
            .toggleClass('disabled', currentPage === 1);
        
        const $prevLink = $('<a>')
            .addClass('page-link')
            .attr('href', '#')
            .text('Previous')
            .on('click', function(e) {
                e.preventDefault();
                if (currentPage > 1) {
                    currentPage--;
                    renderTableView();
                }
            });
        
        $prevLi.append($prevLink);
        $paginationContainer.append($prevLi);
        
        // Page numbers
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const $pageLi = $('<li>')
                .addClass('page-item')
                .toggleClass('active', i === currentPage);
            
            const $pageLink = $('<a>')
                .addClass('page-link')
                .attr('href', '#')
                .text(i)
                .on('click', function(e) {
                    e.preventDefault();
                    currentPage = i;
                    renderTableView();
                });
            
            $pageLi.append($pageLink);
            $paginationContainer.append($pageLi);
        }
        
        // Next button
        const $nextLi = $('<li>')
            .addClass('page-item')
            .toggleClass('disabled', currentPage === totalPages);
        
        const $nextLink = $('<a>')
            .addClass('page-link')
            .attr('href', '#')
            .text('Next')
            .on('click', function(e) {
                e.preventDefault();
                if (currentPage < totalPages) {
                    currentPage++;
                    renderTableView();
                }
            });
        
        $nextLi.append($nextLink);
        $paginationContainer.append($nextLi);
    }
}
