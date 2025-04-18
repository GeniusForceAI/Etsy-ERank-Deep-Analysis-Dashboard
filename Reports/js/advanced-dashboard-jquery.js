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
            alert('Error loading data. Please check the console for details.');
        }
    });
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
    
    // Show success message with jQuery toast plugin if available
    if ($.toast) {
        $.toast({
            heading: 'Reset Complete',
            text: 'All filters have been reset to default values.',
            showHideTransition: 'slide',
            icon: 'info',
            position: 'top-right',
            hideAfter: 3000
        });
    } else {
        // Fallback to standard notification if toast isn't available
        alert('All filters have been reset to default values.');
    }
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
 * Render data as table view with pagination
 */
function renderTableView() {
    const $tableBody = $('#results-table-body');
    $tableBody.empty();
    
    if (filteredData.length === 0) {
        const noDataRow = `<tr><td colspan="7" class="text-center">No data matching the current filters</td></tr>`;
        $tableBody.html(noDataRow);
        updatePagination();
        return;
    }
    
    // Calculate pagination
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, filteredData.length);
    const pageData = filteredData.slice(start, end);
    
    // Create table rows
    const rows = pageData.map(item => {
        return `<tr>
            <td>${item['Shop / Listing'] || 'N/A'}</td>
            <td class="text-end">${item['Listing Age (Days)']?.toLocaleString() || '0'}</td>
            <td class="text-end">${item['Total Views']?.toLocaleString() || '0'}</td>
            <td class="text-end">${item['Daily Views']?.toLocaleString() || '0'}</td>
            <td class="text-end">${item['Est. Sales']?.toLocaleString() || '0'}</td>
            <td class="text-end">$${item['Price']?.toFixed(2) || '0.00'}</td>
            <td class="text-end">$${item['Est. Revenue']?.toLocaleString() || '0'}</td>
            <td class="text-end">${item['Hearts']?.toLocaleString() || '0'}</td>
        </tr>`;
    }).join('');
    
    // Add to table
    $tableBody.html(rows);
    
    // Update pagination
    updatePagination();
    
    // Add row hover effect
    $('.table tbody tr').on('mouseenter', function() {
        $(this).addClass('highlight');
    }).on('mouseleave', function() {
        $(this).removeClass('highlight');
    });
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const $pagination = $('#pagination');
    
    // Update page info
    $('#page-info').text(`Page ${currentPage} of ${totalPages}`);
    
    // Create pagination HTML
    let paginationHtml = '';
    
    // Previous button
    paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="prev" aria-label="Previous">
            <span aria-hidden="true">&laquo;</span>
        </a>
    </li>`;
    
    // Page buttons
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page if not visible
    if (startPage > 1) {
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
        if (startPage > 2) {
            paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Visible pages
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>`;
    }
    
    // Last page if not visible
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }
    
    // Next button
    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="next" aria-label="Next">
            <span aria-hidden="true">&raquo;</span>
        </a>
    </li>`;
    
    // Add to pagination container
    $pagination.html(paginationHtml);
    
    // Add pagination event listeners
    $('.page-link').on('click', function(e) {
        e.preventDefault();
        const page = $(this).data('page');
        
        if (page === 'prev' && currentPage > 1) {
            currentPage--;
        } else if (page === 'next' && currentPage < totalPages) {
            currentPage++;
        } else if (typeof page === 'number') {
            currentPage = page;
        }
        
        renderTableView();
        
        // Scroll to table top
        $('html, body').animate({
            scrollTop: $('.table').offset().top - 20
        }, 300);
    });
}

/**
 * Show loading state of the dashboard
 */
function showLoadingState() {
    // Show loading section, hide dashboard content
    $('.dashboard-content').hide();
    $('#loading-section').show();
    $('#loading-message').show();
    $('#data-loaded').hide();
    
    // Disable filter controls
    $('#filter-form :input').prop('disabled', true);
    $('.btn-viz').prop('disabled', true);
}

/**
 * Show data loaded state of the dashboard
 */
function showDataLoadedState() {
    // Hide loading message, show success message
    $('#loading-message').hide();
    $('#data-loaded').show();
    
    // Show dashboard content
    $('.dashboard-content').fadeIn(800);
    
    // Enable filter controls
    $('#filter-form :input').prop('disabled', false);
    $('.btn-viz').prop('disabled', false);
}

/**
 * Update the chart visualization
 */
function updateChart() {
    // Get the chart canvas
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // If no data, show a message
    if (filteredData.length === 0) {
        $('#chart-message').removeClass('d-none').text('No data available for visualization');
        return;
    }
    
    // Hide any error messages
    $('#chart-message').addClass('d-none');
    
    // Process data for the chart based on visualization type
    let chartData;
    let options;
    
    switch (currentVisualization) {
        case 'bar':
            [chartData, options] = prepareBarChartData();
            break;
        case 'scatter':
            [chartData, options] = prepareScatterPlotData();
            break;
        case 'pie':
            [chartData, options] = preparePieChartData();
            break;
        case 'bubble':
            [chartData, options] = prepareBubbleChartData();
            break;
        case 'radar':
            [chartData, options] = prepareRadarChartData();
            break;
        case 'heatmap':
            [chartData, options] = prepareHeatmapData();
            break;
        default:
            [chartData, options] = prepareBarChartData();
    }
    
    // Create the chart
    chart = new Chart(ctx, {
        type: currentVisualization === 'heatmap' ? 'bar' : currentVisualization,  // Heatmap is a special case
        data: chartData,
        options: options
    });
}

/**
 * Prepare data for bar chart
 */
function prepareBarChartData() {
    // Group data by shop
    const shopData = {};
    const metricField = 'Total Views';  // Default metric
    
    // Limit to top 10 shops for readability
    const limitedData = [...filteredData].sort((a, b) => b[metricField] - a[metricField]).slice(0, 10);
    
    // Extract shop names and values
    limitedData.forEach(item => {
        const shopName = item['Shop / Listing'].split(' - ')[0] || 'Unknown';
        if (!shopData[shopName]) {
            shopData[shopName] = 0;
        }
        shopData[shopName] += item[metricField] || 0;
    });
    
    // Prepare chart data
    const chartData = {
        labels: Object.keys(shopData),
        datasets: [{
            label: 'Total Views',
            data: Object.values(shopData),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };
    
    // Chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: 'Top 10 Shops by Total Views'
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Total Views'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Shop Name'
                }
            }
        }
    };
    
    return [chartData, options];
}

/**
 * Prepare data for scatter plot
 */
function prepareScatterPlotData() {
    // Get selected axes
    const xAxisField = $('#x-axis-select').val() || 'Price';
    const yAxisField = $('#y-axis-select').val() || 'Total Views';
    
    // Map field IDs to actual data fields
    const fieldMap = {
        'price': 'Price',
        'totalViews': 'Total Views',
        'dailyViews': 'Daily Views',
        'hearts': 'Hearts',
        'estSales': 'Est. Sales',
        'estRevenue': 'Est. Revenue',
        'listingAge': 'Listing Age (Days)'
    };
    
    const xField = fieldMap[xAxisField] || 'Price';
    const yField = fieldMap[yAxisField] || 'Total Views';
    
    // Prepare data points
    const dataPoints = filteredData.map(item => ({
        x: item[xField] || 0,
        y: item[yField] || 0
    }));
    
    // Chart data
    const chartData = {
        datasets: [{
            label: `${yField} vs ${xField}`,
            data: dataPoints,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            pointRadius: 5,
            pointHoverRadius: 8
        }]
    };
    
    // Chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: `Correlation between ${xField} and ${yField}`
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${xField}: ${context.parsed.x}, ${yField}: ${context.parsed.y}`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                title: {
                    display: true,
                    text: xField
                }
            },
            y: {
                title: {
                    display: true,
                    text: yField
                }
            }
        }
    };
    
    return [chartData, options];
}

/**
 * Prepare data for pie chart
 */
function preparePieChartData() {
    // Group by price ranges for this example
    const priceRanges = {
        'Under $10': 0,
        '$10 - $25': 0,
        '$25 - $50': 0,
        '$50 - $100': 0,
        'Over $100': 0
    };
    
    // Sort items into price ranges
    filteredData.forEach(item => {
        const price = item['Price'] || 0;
        
        if (price < 10) {
            priceRanges['Under $10']++;
        } else if (price < 25) {
            priceRanges['$10 - $25']++;
        } else if (price < 50) {
            priceRanges['$25 - $50']++;
        } else if (price < 100) {
            priceRanges['$50 - $100']++;
        } else {
            priceRanges['Over $100']++;
        }
    });
    
    // Chart colors
    const backgroundColors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)'
    ];
    
    // Chart data
    const chartData = {
        labels: Object.keys(priceRanges),
        datasets: [{
            data: Object.values(priceRanges),
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
            borderWidth: 1
        }]
    };
    
    // Chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: 'Distribution by Price Range'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                        const percentage = total ? Math.round((value / total) * 100) : 0;
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    };
    
    return [chartData, options];
}

/**
 * Prepare data for bubble chart
 */
function prepareBubbleChartData() {
    // Get selected axes
    const xAxisField = $('#x-axis-select').val() || 'Price';
    const yAxisField = $('#y-axis-select').val() || 'Total Views';
    
    // Map field IDs to actual data fields
    const fieldMap = {
        'price': 'Price',
        'totalViews': 'Total Views',
        'dailyViews': 'Daily Views',
        'hearts': 'Hearts',
        'estSales': 'Est. Sales',
        'estRevenue': 'Est. Revenue',
        'listingAge': 'Listing Age (Days)'
    };
    
    const xField = fieldMap[xAxisField] || 'Price';
    const yField = fieldMap[yAxisField] || 'Total Views';
    
    // Bubble size will be based on Heart count
    const sizeField = 'Hearts';
    
    // Limit to top 50 items for performance
    const limitedData = filteredData.slice(0, 50);
    
    // Prepare data points
    const dataPoints = limitedData.map(item => ({
        x: item[xField] || 0,
        y: item[yField] || 0,
        r: Math.sqrt(item[sizeField] || 1) * 2  // Scale size appropriately
    }));
    
    // Chart data
    const chartData = {
        datasets: [{
            label: `${yField} vs ${xField} (size: ${sizeField})`,
            data: dataPoints,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    };
    
    // Chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: `${yField} vs ${xField} (bubble size: ${sizeField})`
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${xField}: ${context.parsed.x}, ${yField}: ${context.parsed.y}, ${sizeField}: ${filteredData[context.dataIndex]?.[sizeField] || 0}`;
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: xField
                }
            },
            y: {
                title: {
                    display: true,
                    text: yField
                }
            }
        }
    };
    
    return [chartData, options];
}

/**
 * Prepare data for radar chart
 */
function prepareRadarChartData() {
    // We'll compare the top 5 shops across various metrics
    const metrics = ['Total Views', 'Est. Sales', 'Hearts', 'Est. Revenue'];
    
    // Identify top 5 shops by revenue
    const shopMap = {};
    
    filteredData.forEach(item => {
        const shopName = item['Shop / Listing'].split(' - ')[0] || 'Unknown';
        if (!shopMap[shopName]) {
            shopMap[shopName] = {
                'Total Views': 0,
                'Est. Sales': 0,
                'Hearts': 0,
                'Est. Revenue': 0
            };
        }
        
        metrics.forEach(metric => {
            shopMap[shopName][metric] += item[metric] || 0;
        });
    });
    
    // Sort shops by revenue and get top 5
    const topShops = Object.entries(shopMap)
        .sort((a, b) => b[1]['Est. Revenue'] - a[1]['Est. Revenue'])
        .slice(0, 5)
        .map(entry => entry[0]);
    
    // Find max values for each metric for normalization
    const maxValues = {};
    metrics.forEach(metric => {
        maxValues[metric] = Math.max(...Object.values(shopMap).map(shop => shop[metric]));
    });
    
    // Create normalized datasets for each shop
    const datasets = topShops.map((shop, index) => {
        // Generate a color for this shop
        const hue = (index * 70) % 360;  // Distribute colors evenly
        const color = `hsla(${hue}, 70%, 60%, 0.7)`;
        const borderColor = `hsla(${hue}, 70%, 50%, 1)`;
        
        // Normalize metrics to 0-100 scale for radar chart
        const data = metrics.map(metric => {
            const value = shopMap[shop][metric];
            const max = maxValues[metric];
            return max > 0 ? (value / max) * 100 : 0;
        });
        
        return {
            label: shop,
            data: data,
            backgroundColor: color,
            borderColor: borderColor,
            borderWidth: 2,
            pointBackgroundColor: borderColor,
            pointRadius: 4
        };
    });
    
    // Chart data
    const chartData = {
        labels: metrics,
        datasets: datasets
    };
    
    // Chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: 'Top 5 Shops Comparison (Normalized)'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const shop = context.dataset.label;
                        const metric = context.label;
                        const normalizedValue = context.raw;
                        const actualValue = shopMap[shop][metric];
                        return `${shop}: ${actualValue.toLocaleString()} (${normalizedValue.toFixed(1)}%)`;
                    }
                }
            }
        },
        scales: {
            r: {
                angleLines: {
                    display: true
                },
                suggestedMin: 0,
                suggestedMax: 100,
                ticks: {
                    display: false
                }
            }
        }
    };
    
    return [chartData, options];
}

/**
 * Prepare data for heatmap
 */
function prepareHeatmapData() {
    // We'll create a price vs views heatmap
    // Define price ranges and views ranges
    const priceRanges = [
        { min: 0, max: 10, label: '$0-$10' },
        { min: 10, max: 25, label: '$10-$25' },
        { min: 25, max: 50, label: '$25-$50' },
        { min: 50, max: 100, label: '$50-$100' },
        { min: 100, max: Infinity, label: '$100+' }
    ];
    
    const viewsRanges = [
        { min: 0, max: 100, label: '0-100' },
        { min: 100, max: 500, label: '100-500' },
        { min: 500, max: 1000, label: '500-1000' },
        { min: 1000, max: 5000, label: '1000-5000' },
        { min: 5000, max: Infinity, label: '5000+' }
    ];
    
    // Create a matrix to hold counts
    const matrix = Array(priceRanges.length).fill().map(() => Array(viewsRanges.length).fill(0));
    
    // Count items in each range combination
    filteredData.forEach(item => {
        const price = item['Price'] || 0;
        const views = item['Total Views'] || 0;
        
        // Find which range this item belongs to
        const priceRangeIndex = priceRanges.findIndex(range => price >= range.min && price < range.max);
        const viewsRangeIndex = viewsRanges.findIndex(range => views >= range.min && views < range.max);
        
        // If valid range found, increment the count
        if (priceRangeIndex >= 0 && viewsRangeIndex >= 0) {
            matrix[priceRangeIndex][viewsRangeIndex]++;
        }
    });
    
    // Find maximum value for scaling intensity
    const maxValue = Math.max(...matrix.map(row => Math.max(...row)));
    
    // Create datasets (one for each price range)
    const datasets = priceRanges.map((range, index) => {
        return {
            label: range.label,
            data: matrix[index].map(value => value),
            backgroundColor: matrix[index].map(value => {
                // Calculate intensity (0 to 1)
                const intensity = maxValue > 0 ? value / maxValue : 0;
                return `rgba(255, 0, 0, ${intensity})`;
            })
        };
    });
    
    // Chart data (stacked bar chart to simulate heatmap)
    const chartData = {
        labels: viewsRanges.map(range => range.label),
        datasets: datasets
    };
    
    // Chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',  // Horizontal bar chart
        plugins: {
            title: {
                display: true,
                text: 'Price vs Views Heatmap'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const priceRange = context.dataset.label;
                        const viewsRange = context.label;
                        const count = context.raw;
                        return `${priceRange}, ${viewsRange}: ${count} listings`;
                    }
                }
            },
            legend: {
                position: 'right',
                title: {
                    display: true,
                    text: 'Price Ranges'
                }
            }
        },
        scales: {
            x: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Number of Listings'
                }
            },
            y: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Views Ranges'
                }
            }
        }
    };
    
    return [chartData, options];
}

/**
 * Export filtered data as CSV
 */
function exportCSV() {
    if (filteredData.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Get headers from first item
    const headers = Object.keys(filteredData[0]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    filteredData.forEach(item => {
        const row = headers.map(header => {
            // Handle commas and quotes in the data
            const value = item[header] !== undefined ? item[header] : '';
            const valueStr = String(value).replace(/"/g, '""');
            return `"${valueStr}"`;
        }).join(',');
        
        csvContent += row + '\n';
    });
    
    // Create download link
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'filtered_data.csv');
    document.body.appendChild(link);
    
    // Trigger download and clean up
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    if ($.toast) {
        $.toast({
            heading: 'Export Complete',
            text: `${filteredData.length} records exported to CSV`,
            showHideTransition: 'slide',
            icon: 'success',
            position: 'top-right',
            hideAfter: 3000
        });
    }
}

/**
 * Export current chart as image
 */
function exportImage() {
    if (!chart) {
        alert('No chart to export');
        return;
    }
    
    // Get chart canvas
    const canvas = document.getElementById('chart-canvas');
    
    // Create link element
    const link = document.createElement('a');
    link.download = 'chart_export.png';
    link.href = canvas.toDataURL('image/png');
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    if ($.toast) {
        $.toast({
            heading: 'Export Complete',
            text: 'Chart exported as PNG image',
            showHideTransition: 'slide',
            icon: 'success',
            position: 'top-right',
            hideAfter: 3000
        });
    }
}
