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
// Use the full path to avoid CORS issues when running locally
const CSV_PATH = './Erank_Raw_Data/Keyword_Tool - Top Listings (1).csv';
const NUMERIC_COLUMNS = ['Listing Age (Days)', 'Total Views', 'Daily Views', 'Est. Sales', 'Hearts'];
const CURRENCY_COLUMNS = ['Price', 'Est. Revenue'];

// Initialize the dashboard when document is ready (jQuery ready function)
$(document).ready(function() {
    // File upload event listeners
    $('#csv-file-upload').on('change', handleFileUpload);
    $('#use-sample-data').on('click', loadSampleData);
    
    // Drag and drop functionality
    const dropArea = $('.upload-area');
    
    // Prevent default behaviors for drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.on(eventName, preventDefaults);
    });
    
    // Highlight drop area when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.on(eventName, () => {
            dropArea.addClass('highlight');
        });
    });
    
    // Remove highlight when dragging leaves drop area
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.on(eventName, () => {
            dropArea.removeClass('highlight');
        });
    });
    
    // Handle file drop
    dropArea.on('drop', handleDrop);
    
    // Filter form events
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
    
    // Dark mode toggle
    initDarkMode();
    $('#dark-mode-toggle').on('click', toggleDarkMode);
});

/**
 * Prevent default behavior for events
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Handle file drop event
 */
function handleDrop(e) {
    const dt = e.originalEvent.dataTransfer;
    const files = dt.files;
    
    if (files.length) {
        const file = files[0];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            $('#csv-file-upload')[0].files = files;
            handleFileUpload({ target: { files: files } });
        } else {
            alert('Please upload a CSV file');
        }
    }
}

/**
 * Loads data from the default CSV file - uses a synchronous request to work with local files
 */
function loadDefaultData() {
    showLoadingState();
    
    try {
        // Use synchronous XMLHttpRequest (works with local files in some browsers)
        const request = new XMLHttpRequest();
        request.open('GET', CSV_PATH, false);  // 'false' makes the request synchronous
        request.send(null);
        
        if (request.status === 200 || request.status === 0) { // Status 0 is used for local files
            const csvData = request.responseText;
            const results = Papa.parse(csvData, {
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
                }
            });
            
            // Update the data source display
            const fileName = CSV_PATH.split('/').pop();
            $('#data-source-name').text(fileName);
            
            // Process the data
            processData(results.data);
            showDataLoadedState();
            return;
        }
    } catch (error) {
        console.error('Error loading CSV via XHR:', error);
    }
    
    // If we got here, loading failed, so use sample data
    console.log('Using sample data instead');
    loadSampleData();
}

/**
 * Loads data from a specified CSV URL - Promise-based approach
 * @param {string} url - The URL of the CSV file to load
 * @returns {Promise} - A promise that resolves with the parsed data
 */
function loadDataFromUrl(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
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
            complete: (results) => {
                resolve(results.data);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}

/**
 * Load sample data when user clicks the sample data button or when CSV loading fails
 */
function loadSampleData() {
    // Hide upload container, show loading spinner
    $('#upload-container').hide();
    $('#loading-message').show();
    $('#data-source-name').text('Sample Data');
    
    const sampleData = [
        {
            'Shop / Listing': 'VelfCreationsDigital:7 Encouraging Keychains Glowforge Bundle SVG, AI File\nacrylic, acrylic earring, digital, engraving, design, laser, glowforge, svg, ai, illustrator, earring, for her, gift',
            'Listing Age (Days)': 1140,
            'Total Views': 868,
            'Daily Views': 0.8,
            'Est. Sales': 44,
            'Price': 4.99,
            'Est. Revenue': 220,
            'Hearts': 139
        },
        {
            'Shop / Listing': 'DuglyGraphics:Vector TEXAS SLAM, AI, eps, pdf, png, svg, dxf, jpg Image Graphic Digital Download Artwork, stylized, graphical tail, discount coupons\nai vector sea animal, ocean reef fish eps, tuna red fish draw, pdf shark silhouette, water animalia art, texas slam image, svg swimm lovers, fish fins drawings, funny fin picture, dxf png jpg print, printable swimmeret, fun cutting images, texas slam fishing',
            'Listing Age (Days)': 1926,
            'Total Views': 3983,
            'Daily Views': 2.1,
            'Est. Sales': 205,
            'Price': 3.25,
            'Est. Revenue': 666,
            'Hearts': 224
        },
        {
            'Shop / Listing': 'GrowthLabs:New Generate a complete eBook with AI, step-by-step Masterclass with videos, PLR and MRR Resell Rights, Ai Ebook Generator\nchatgpt prompts, ai prompts, chat gpt prompts, digital download, prompt guide, midjourney prompts, digital products, ai art, master resell rights, plr digital products, plr planner, digital art, sell on etsy',
            'Listing Age (Days)': 147,
            'Total Views': 815,
            'Daily Views': 5.5,
            'Est. Sales': 18,
            'Price': 17.06,
            'Est. Revenue': 307,
            'Hearts': 69
        },
        {
            'Shop / Listing': 'PaintboxprintablesCo:Cute KID Cartoon AI Art Prompt Guide[14 Pgs]5 prompts 15 (Example) images/Prompt/Canva prompts/Cartoon/Kid Prompts for Magic Media in Canva\nai prompts, canva prompts, AI images, Ai Christmas Prompts, Magic Media Prompts, canva image prompts, Cute Puppies, Cute Puppy Images, Cute Puppy Prompts, Puppy prompts AI, Cute Puppy, Prompts for AI, Magic Media Prompt',
            'Listing Age (Days)': 514,
            'Total Views': 85,
            'Daily Views': 0.2,
            'Est. Sales': 2,
            'Price': 5.31,
            'Est. Revenue': 11,
            'Hearts': 3
        },
        {
            'Shop / Listing': 'Dreamycraftershop:AI Art Prompts, Prompt for small Black businesswomen, Mom & Baby, Guidebook, Creative, Mother\'s Day, Chatgpt\nDall-e, Chat GPT Prompts, Cli part, Chat GPT, Ai Prompt, Promp t, daughter, birthday, gift for, Art Inspiration, black girl, African American',
            'Listing Age (Days)': 368,
            'Total Views': 25,
            'Daily Views': 0.1,
            'Est. Sales': 0,
            'Price': 8.99,
            'Est. Revenue': 0,
            'Hearts': 0
        }
    ];
    
    // Add more sample items to make the data more interesting
    // This is just for testing the dashboard features
    const additionalSamples = [];
    
    // Add some newer items with high daily views (trending)
    for (let i = 0; i < 15; i++) {
        additionalSamples.push({
            'Shop / Listing': `TrendingShop${i}:AI Generated Artwork Bundle ${i} - Multiple Styles and Formats\ndigital download, printable wall art, home decor, ai art, digital art, wall prints, poster prints, minimalist art, modern art`,
            'Listing Age (Days)': Math.floor(Math.random() * 30) + 1, // 1-30 days old
            'Total Views': Math.floor(Math.random() * 500) + 100, // 100-600 views
            'Daily Views': Math.floor(Math.random() * 40) + 10, // 10-50 daily views
            'Est. Sales': Math.floor(Math.random() * 10) + 1,
            'Price': (Math.random() * 15 + 5).toFixed(2), // $5-$20 price
            'Est. Revenue': Math.floor(Math.random() * 200) + 50,
            'Hearts': Math.floor(Math.random() * 50) + 10
        });
    }
    
    // Add some older items with consistent performance (evergreen)
    for (let i = 0; i < 15; i++) {
        additionalSamples.push({
            'Shop / Listing': `EvergreenShop${i}:Printable Planner Template ${i} - Yearly, Monthly, Weekly Pages\ndigital planner, printable planner, planner template, digital download, productivity, organization, daily planner, to do list`,
            'Listing Age (Days)': Math.floor(Math.random() * 300) + 200, // 200-500 days old
            'Total Views': Math.floor(Math.random() * 2000) + 1000, // 1000-3000 views
            'Daily Views': Math.floor(Math.random() * 5) + 2, // 2-7 daily views
            'Est. Sales': Math.floor(Math.random() * 50) + 20,
            'Price': (Math.random() * 10 + 3).toFixed(2), // $3-$13 price
            'Est. Revenue': Math.floor(Math.random() * 500) + 100,
            'Hearts': Math.floor(Math.random() * 100) + 50
        });
    }
    
    // Add some medium-aged listings with varying performance
    for (let i = 0; i < 20; i++) {
        additionalSamples.push({
            'Shop / Listing': `MidRangeShop${i}:Digital ${i < 10 ? 'Pattern' : 'Template'} for ${i < 10 ? 'Crafting' : 'Business'} - Multiple Formats\ndigital download, ${i < 10 ? 'craft pattern, sewing pattern, crochet pattern' : 'business template, invoice template, social media template'}, pdf, printable, instant download`,
            'Listing Age (Days)': Math.floor(Math.random() * 150) + 50, // 50-200 days old
            'Total Views': Math.floor(Math.random() * 800) + 200, // 200-1000 views
            'Daily Views': (Math.random() * 8 + 1).toFixed(1), // 1-9 daily views
            'Est. Sales': Math.floor(Math.random() * 20) + 5,
            'Price': (Math.random() * 12 + 4).toFixed(2), // $4-$16 price
            'Est. Revenue': Math.floor(Math.random() * 300) + 80,
            'Hearts': Math.floor(Math.random() * 70) + 20
        });
    }
    
    // Combine all sample data
    const fullSampleData = [...sampleData, ...additionalSamples];
    
    // Process the sample data
    processData(fullSampleData);
    showDataLoadedState();
}

/**
 * Handles file upload for custom CSV files
 */
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        // Hide upload container, show loading spinner
        $('#upload-container').hide();
        $('#loading-message').show();
        $('#data-source-name').text(file.name);
        
        // Parse file using a promise-based approach
        parseFile(file)
            .then(data => {
                processData(data);
                showDataLoadedState();
            })
            .catch(error => {
                console.error('Error parsing CSV:', error);
                alert('Error loading data. Please check the console for details.');
                // Show upload container again if there's an error
                $('#loading-message').hide();
                $('#upload-container').show();
            });
    }
}

/**
 * Parse a CSV file - Promise-based approach
 * @param {File} file - The file to parse
 * @returns {Promise} - A promise that resolves with the parsed data
 */
function parseFile(file) {
    return new Promise((resolve, reject) => {
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
            complete: (results) => {
                resolve(results.data);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
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
    
    // Calculate derived metrics for each listing
    rawData.forEach(item => {
        // Calculate daily views if not already present
        const listingAge = parseFloat(item['Listing Age (Days)']) || 1; // Avoid division by zero
        const totalViews = parseFloat(item['Total Views']) || 0;
        item['Daily Views'] = parseFloat((totalViews / listingAge).toFixed(2));
        
        // Calculate daily hearts for engagement rate
        const hearts = parseFloat(item['Hearts']) || 0;
        item['Daily Hearts'] = parseFloat((hearts / listingAge).toFixed(2));
        
        // Calculate engagement rate (hearts per 100 views)
        const views = parseFloat(item['Total Views']) || 1; // Avoid division by zero
        item['Engagement Rate'] = parseFloat(((hearts / views) * 100).toFixed(2));
        
        // Calculate listing freshness score (newer listings get higher scores)
        // Using exponential decay formula: 100 * e^(-age/180)
        // This gives newer listings higher scores that decay over time
        item['Freshness Score'] = parseInt((100 * Math.exp(-listingAge/180)).toFixed(0));
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
    const ageMin = parseFloat($('#age-min').val()) || 0;
    const ageMax = parseFloat($('#age-max').val()) || Infinity;
    const dailyViewsMin = parseFloat($('#daily-views-min').val()) || 0;
    const dailyViewsMax = parseFloat($('#daily-views-max').val()) || Infinity;
    
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
        
        // Listing age filter (new)
        if (item['Listing Age (Days)'] < ageMin || item['Listing Age (Days)'] > ageMax) return false;
        
        // Daily views filter (new)
        if (item['Daily Views'] < dailyViewsMin || item['Daily Views'] > dailyViewsMax) return false;
        
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
    const tableContainer = $('#table-view');
    const tableHead = $('#data-table thead');
    const tableBody = $('#results-table-body');
    
    // Clear existing content
    tableBody.empty();
    
    // Create sortable table headers if they don't exist yet
    if (!window.tableSortInitialized) {
        // Define columns that should be sortable
        const columns = [
            { field: 'Shop / Listing', label: 'Product', sortable: true },
            { field: 'Listing Age (Days)', label: 'Age (Days)', sortable: true },
            { field: 'Total Views', label: 'Views', sortable: true },
            { field: 'Daily Views', label: 'Daily Views', sortable: true },
            { field: 'Est. Sales', label: 'Sales', sortable: true },
            { field: 'Price', label: 'Price', sortable: true },
            { field: 'Est. Revenue', label: 'Revenue', sortable: true },
            { field: 'Hearts', label: 'Hearts', sortable: true }
        ];
        
        // Create header row with sort controls
        const headerRow = $('<tr></tr>');
        columns.forEach(column => {
            const th = $(`<th ${column.sortable ? 'class="sortable"' : ''}>${column.label}</th>`);
            
            if (column.sortable) {
                // Add sort indicators and click handler
                th.append('<span class="sort-indicator ml-1">⇅</span>');
                th.data('field', column.field);
                
                th.on('click', function() {
                    const field = $(this).data('field');
                    const currentSort = $(this).data('sort') || 'none';
                    
                    // Clear all other sort indicators
                    $('.sortable').removeClass('sort-asc sort-desc').data('sort', 'none')
                        .find('.sort-indicator').html('⇅');
                    
                    // Set new sort direction
                    let newSort = 'asc';
                    if (currentSort === 'asc') {
                        newSort = 'desc';
                        $(this).addClass('sort-desc').removeClass('sort-asc')
                            .find('.sort-indicator').html('↓');
                    } else {
                        $(this).addClass('sort-asc').removeClass('sort-desc')
                            .find('.sort-indicator').html('↑');
                    }
                    
                    $(this).data('sort', newSort);
                    
                    // Sort the data
                    sortTableData(field, newSort);
                });
            }
            
            headerRow.append(th);
        });
        
        // Replace existing header with new sortable header
        tableHead.empty().append(headerRow);
        window.tableSortInitialized = true;
    }
    
    // Get the current page data
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredData.slice(start, end);
    
    // No data message
    if (pageData.length === 0) {
        tableBody.html('<tr><td colspan="8" class="text-center">No results found. Try adjusting your filters.</td></tr>');
        return;
    }
    
    // Render data rows with alternating backgrounds and black text
    pageData.forEach((item, index) => {
        const backgroundColor = index % 2 === 0 ? '#ffffff' : '#f5f5f5';
        const row = `
            <tr class="data-row" style="background-color: ${backgroundColor} !important;">
                <td style="color: black !important;">${item['Shop / Listing'] || ''}</td>
                <td style="color: black !important;">${item['Listing Age (Days)'] || 0}</td>
                <td style="color: black !important;">${item['Total Views'] || 0}</td>
                <td style="color: black !important;">${parseFloat(item['Daily Views'] || 0).toFixed(1)}</td>
                <td style="color: black !important;">${item['Est. Sales'] || 0}</td>
                <td style="color: black !important;">$${parseFloat(item['Price'] || 0).toFixed(2)}</td>
                <td style="color: black !important;">$${parseFloat(item['Est. Revenue'] || 0).toFixed(2)}</td>
                <td style="color: black !important;">${item['Hearts'] || 0}</td>
            </tr>
        `;
        tableBody.append(row);
    });
    
    // Show table view and update pagination
    tableContainer.show();
    updatePagination();
}

/**
 * Sort table data by field and direction
 */
function sortTableData(field, direction) {
    // Create a copy of the filtered data to sort
    const sortedData = [...filteredData];
    
    // Sort the data
    sortedData.sort((a, b) => {
        let aValue = a[field];
        let bValue = b[field];
        
        // Special handling for the Shop / Listing field
        if (field === 'Shop / Listing') {
            // Extract just the product name part for sorting
            aValue = (aValue || '').toString().split('\n')[0] || '';
            bValue = (bValue || '').toString().split('\n')[0] || '';
        }
        
        // Handle numeric values
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // Handle string values
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
        
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Update the filtered data with the sorted data
    filteredData = sortedData;
    
    // Reset pagination to first page and re-render
    currentPage = 1;
    renderTableView();
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
    // First show success message briefly
    $('#loading-message').hide();
    $('#data-loaded').show();
    
    // After a short delay, replace loading section with results overview
    setTimeout(function() {
        // Hide loading section, show results overview section
        $('#loading-section').fadeOut(400, function() {
            $('#results-overview-section').fadeIn(600);
        });
        
        // Show dashboard content
        $('.dashboard-content').fadeIn(800);
        
        // Enable filter controls
        $('#filter-form').find('input, select, button').prop('disabled', false);
        $('.btn-viz').prop('disabled', false);
        
        // Generate insights and analytics
        generateProductInsights();
        generateProductTrendChart();
        generateFeatureRecommendations();
        generateMarketingStrategies();
        generateKeywordPerformanceChart();
        
        // Generate age-based analytics for trending and evergreen products
        generateAgeBasedAnalytics();
    }, 1500);
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

/**
 * Generate product creation insights based on the filtered data
 */
function generateProductInsights() {
    if (filteredData.length === 0) {
        $('#product-opportunities').html('<li class="list-group-item">No data available for insights</li>');
        return;
    }
    
    // Analyze the data to find patterns and opportunities
    const priceRanges = {
        'budget': { min: 0, max: 15, count: 0, revenue: 0, views: 0 },
        'mid-range': { min: 15, max: 50, count: 0, revenue: 0, views: 0 },
        'premium': { min: 50, max: 100, count: 0, revenue: 0, views: 0 },
        'luxury': { min: 100, max: Infinity, count: 0, revenue: 0, views: 0 }
    };
    
    // Categorize products and calculate metrics
    filteredData.forEach(item => {
        const price = item['Price'] || 0;
        const revenue = item['Est. Revenue'] || 0;
        const views = item['Total Views'] || 0;
        const hearts = item['Hearts'] || 0;
        const listingAge = item['Listing Age (Days)'] || 0;
        const dailyViews = item['Daily Views'] || 0;
        
        // Determine price category
        let category;
        if (price < priceRanges.budget.max) {
            category = 'budget';
        } else if (price < priceRanges['mid-range'].max) {
            category = 'mid-range';
        } else if (price < priceRanges.premium.max) {
            category = 'premium';
        } else {
            category = 'luxury';
        }
        
        // Update category stats
        priceRanges[category].count++;
        priceRanges[category].revenue += revenue;
        priceRanges[category].views += views;
    });
    
    // Calculate average revenue per product and view-to-revenue ratio for each category
    Object.keys(priceRanges).forEach(category => {
        const stats = priceRanges[category];
        stats.avgRevenue = stats.count > 0 ? stats.revenue / stats.count : 0;
        stats.viewToRevenueRatio = stats.views > 0 ? stats.revenue / stats.views : 0;
    });
    
    // Sort categories by average revenue and identify top performers
    const sortedCategories = Object.keys(priceRanges)
        .filter(category => priceRanges[category].count > 0)
        .sort((a, b) => priceRanges[b].avgRevenue - priceRanges[a].avgRevenue);
    
    // Generate insights based on the analysis
    let opportunities = '';
    
    if (sortedCategories.length > 0) {
        const topCategory = sortedCategories[0];
        const topCategoryFormatted = topCategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        opportunities += `<li class="list-group-item">
            <span><strong>${topCategoryFormatted}</strong> products ($${priceRanges[topCategory].min}-$${priceRanges[topCategory].max === Infinity ? '100+' : priceRanges[topCategory].max}) have the highest average revenue ($${priceRanges[topCategory].avgRevenue.toFixed(2)})</span>
        </li>`;
        
        // Find the category with best views-to-revenue conversion
        const bestConversion = Object.keys(priceRanges)
            .filter(category => priceRanges[category].count > 0 && priceRanges[category].views > 0)
            .sort((a, b) => priceRanges[b].viewToRevenueRatio - priceRanges[a].viewToRevenueRatio)[0];
        
        if (bestConversion) {
            const bestConversionFormatted = bestConversion.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            opportunities += `<li class="list-group-item">
                <span><strong>${bestConversionFormatted}</strong> products have the best view-to-revenue conversion rate</span>
            </li>`;
        }
        
        // Add general product creation recommendation
        opportunities += `<li class="list-group-item">
            <span>Consider creating more products in the <strong>${topCategoryFormatted}</strong> price range to maximize revenue</span>
        </li>`;
    } else {
        opportunities = '<li class="list-group-item">Insufficient data for product insights</li>';
    }
    
    // Update the product opportunities list
    $('#product-opportunities').html(opportunities);
    
    // Generate product trend chart
    generateProductTrendChart();
    
    // Generate feature recommendations
    generateFeatureRecommendations();
}

/**
 * Generate a chart showing product trends
 */
function generateProductTrendChart() {
    const ctx = document.getElementById('product-trends-chart').getContext('2d');
    
    // Calculate product metrics by price range
    const priceRanges = [
        { min: 0, max: 10, label: '$0-$10' },
        { min: 10, max: 25, label: '$10-$25' },
        { min: 25, max: 50, label: '$25-$50' },
        { min: 50, max: 100, label: '$50-$100' },
        { min: 100, max: Infinity, label: '$100+' }
    ];
    
    const metrics = {
        views: new Array(priceRanges.length).fill(0),
        hearts: new Array(priceRanges.length).fill(0),
        sales: new Array(priceRanges.length).fill(0),
        items: new Array(priceRanges.length).fill(0)
    };
    
    // Process data
    filteredData.forEach(item => {
        const price = item['Price'] || 0;
        const views = item['Total Views'] || 0;
        const hearts = item['Hearts'] || 0;
        const sales = item['Est. Sales'] || 0;
        
        // Find applicable price range
        const rangeIndex = priceRanges.findIndex(range => price >= range.min && price < range.max);
        
        if (rangeIndex !== -1) {
            metrics.views[rangeIndex] += views;
            metrics.hearts[rangeIndex] += hearts;
            metrics.sales[rangeIndex] += sales;
            metrics.items[rangeIndex]++;
        }
    });
    
    // Calculate averages for each range (to normalize data)
    const avgViews = metrics.items.map((count, i) => count > 0 ? metrics.views[i] / count : 0);
    const avgHearts = metrics.items.map((count, i) => count > 0 ? metrics.hearts[i] / count : 0);
    const avgSales = metrics.items.map((count, i) => count > 0 ? metrics.sales[i] / count : 0);
    
    // Create chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: priceRanges.map(range => range.label),
            datasets: [
                {
                    label: 'Avg. Views',
                    data: avgViews,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Avg. Hearts',
                    data: avgHearts,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Avg. Sales',
                    data: avgSales,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Views & Hearts'
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Sales'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Product Performance by Price Range'
                }
            }
        }
    });
}

/**
 * Generate feature recommendations for products
 */
function generateFeatureRecommendations() {
    // Simulating feature analysis from product data
    // In a real app, this would be based on deeper analysis of product attributes and performance
    
    const features = [
        {
            name: 'Customization Options',
            impact: 'High',
            adoption: '68%',
            competitiveness: 'Medium'
        },
        {
            name: 'Multiple Variations',
            impact: 'Medium',
            adoption: '82%',
            competitiveness: 'High'
        },
        {
            name: 'Digital Downloads',
            impact: 'High',
            adoption: '45%',
            competitiveness: 'Low'
        },
        {
            name: 'Bundle Offers',
            impact: 'Medium',
            adoption: '37%',
            competitiveness: 'Medium'
        },
        {
            name: 'Eco-Friendly Materials',
            impact: 'Medium',
            adoption: '29%',
            competitiveness: 'Medium'
        }
    ];
    
    // Create table rows
    let tableRows = '';
    features.forEach(feature => {
        // Determine impact class
        let impactClass = 'text-secondary';
        if (feature.impact === 'High') impactClass = 'text-success';
        else if (feature.impact === 'Medium') impactClass = 'text-primary';
        
        // Determine competitiveness class
        let compClass = 'text-secondary';
        if (feature.competitiveness === 'Low') compClass = 'text-success';
        else if (feature.competitiveness === 'Medium') compClass = 'text-primary';
        else if (feature.competitiveness === 'High') compClass = 'text-danger';
        
        tableRows += `
            <tr>
                <td>${feature.name}</td>
                <td class="${impactClass}">${feature.impact}</td>
                <td>${feature.adoption}</td>
                <td class="${compClass}">${feature.competitiveness}</td>
            </tr>
        `;
    });
    
    // Update table
    $('#features-table-body').html(tableRows);
}

/**
 * Generate marketing strategies based on the filtered data
 */
function generateMarketingStrategies() {
    if (filteredData.length === 0) {
        $('#traffic-recommendations').html('<li class="list-group-item">No data available for marketing strategies</li>');
        return;
    }
    
    // Generate keyword performance chart
    generateKeywordPerformanceChart();
    
    // Generate platform-specific marketing tips
    generateMarketingTips();
    
    // Analyze data to identify high-performing products
    const topPerformers = [...filteredData]
        .sort((a, b) => (b['Est. Revenue'] || 0) - (a['Est. Revenue'] || 0))
        .slice(0, 5);
    
    // Extract product names/titles
    const topProductNames = topPerformers.map(item => {
        const fullTitle = item['Shop / Listing'] || '';
        // Extract product name (assuming it's after the shop name and colon)
        const titleParts = fullTitle.split(':');
        return titleParts.length > 1 ? titleParts[1].trim().split(',')[0] : fullTitle;
    });
    
    // Generate traffic recommendations
    let recommendations = '';
    
    // Top product promotion recommendation
    if (topProductNames.length > 0) {
        recommendations += `
            <li class="list-group-item">
                <strong>Promote Top Performers:</strong> Focus advertising on your best-selling items like "${topProductNames[0]}"
            </li>
        `;
    }
    
    // Add general marketing recommendations
    recommendations += `
        <li class="list-group-item">
            <strong>Pinterest Marketing:</strong> Create pinnable images featuring your product in use
        </li>
        <li class="list-group-item">
            <strong>Instagram Strategy:</strong> Post process videos and behind-the-scenes content
        </li>
        <li class="list-group-item">
            <strong>SEO Improvement:</strong> Optimize titles and tags with high-traffic keywords
        </li>
    `;
    
    // Update traffic recommendations list
    $('#traffic-recommendations').html(recommendations);
    
    // Add Etsy-specific optimization tips
    $('#etsy-tips').html(`
        <ol class="mb-0">
            <li>Use all 13 available tags with relevant keywords</li>
            <li>Include your most important keywords in the first 40 characters of your title</li>
            <li>Add at least 5 high-quality photos showing your product from multiple angles</li>
            <li>Respond to customer messages within 24 hours to improve shop score</li>
            <li>Encourage reviews by including a thank you note with orders</li>
        </ol>
    `);
    
    // Add social media strategy tips
    $('#social-tips').html(`
        <ol class="mb-0">
            <li>Create a consistent posting schedule (3-5 times per week)</li>
            <li>Use trending hashtags relevant to your products</li>
            <li>Engage with potential customers by responding to comments</li>
            <li>Collaborate with micro-influencers in your niche</li>
            <li>Share user-generated content featuring your products</li>
        </ol>
    `);
    
    // Add email marketing plan tips
    $('#email-tips').html(`
        <ol class="mb-0">
            <li>Create a welcome sequence for new subscribers with a discount</li>
            <li>Send monthly newsletters featuring new products and shop updates</li>
            <li>Implement abandoned cart emails to recover lost sales</li>
            <li>Segment your email list based on purchase history</li>
            <li>Include lifestyle imagery and customer testimonials in emails</li>
        </ol>
    `);
}

/**
 * Generate a chart showing keyword performance
 */
function generateKeywordPerformanceChart() {
    const ctx = document.getElementById('keyword-performance-chart').getContext('2d');
    
    // For this demo, we'll simulate keyword performance data
    // In a real application, this would be extracted from the product data
    const keywords = ['digital download', 'personalized', 'handmade', 'custom', 'printable'];
    const searchVolume = [850, 1200, 950, 1500, 780];
    const competition = [0.65, 0.85, 0.55, 0.75, 0.45];
    const conversionRate = [2.8, 3.5, 1.9, 4.2, 3.1];
    
    // Create chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: keywords,
            datasets: [
                {
                    label: 'Search Volume (hundreds)',
                    data: searchVolume,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Competition (0-1)',
                    data: competition,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.3,
                    yAxisID: 'y1'
                },
                {
                    label: 'Conversion Rate (%)',
                    data: conversionRate,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.3,
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Search Volume'
                    }
                },
                y1: {
                    beginAtZero: true,
                    max: 1,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Competition'
                    }
                },
                y2: {
                    beginAtZero: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: false
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Keyword Performance Analysis'
                }
            }
        }
    });
}

/**
 * Generate platform-specific marketing tips
 */
function generateMarketingTips() {
    // This function exists as a placeholder - the actual content is generated
    // directly in the generateMarketingStrategies function for simplicity
}
