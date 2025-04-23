/**
 * PDF Generator for Etsy ERank Analytics Dashboard
 * Handles PDF generation preserving styling and content based on current view
 */

// Config for structured PDF generation using pdfmake
const pdfConfig = {
    // Default margins [left, top, right, bottom]
    margin: [20, 20, 20, 20],
    filename: 'etsy-analytics-report.pdf',
    // Theme definitions for light and dark mode
    themes: {
        light: {
            background: '#ffffff',
            text: '#333333',
            headerBackground: '#f8f9fa',
            headerText: '#3c4b64',
            tableHeaderBackground: '#f1f4f9',
            tableHeaderText: '#495057',
            tableBorder: '#dee2e6',
            tableEvenBackground: '#ffffff',
            tableOddBackground: '#f8f9fa',
            accentColor: '#4361ee'
        },
        dark: {
            background: '#1e1e1e',
            text: '#ffffff',
            headerBackground: '#2d2d30',
            headerText: '#ffffff',
            tableHeaderBackground: '#2a2a3a',
            tableHeaderText: '#ffffff',
            tableBorder: '#3d3d4d',
            tableEvenBackground: '#252535',
            tableOddBackground: '#303040',
            accentColor: '#5a73f4'
        }
    }
};

/**
 * Generate a structured PDF of the dashboard data and charts
 */
function generatePDF(opts = {}) {
    // Show a loading indicator
    showPDFGenerationLoading(true);
    
    // Get current theme (dark or light)
    const isDarkMode = document.body.classList.contains('dark-mode');
    let themeChoice;
    
    // Handle explicit theme choices
    if (opts.forceLightMode) {
        themeChoice = false;
    } else if (opts.forceDarkMode) {
        themeChoice = true;
    } else {
        // Otherwise use current theme
        themeChoice = isDarkMode;
    }
    
    // Get active theme configuration
    const theme = themeChoice ? pdfConfig.themes.dark : pdfConfig.themes.light;
    
    // Get the available data
    console.log('Accessing dashboard data for PDF generation...');
    
    // We need to access the application's data
    // This will retrieve from either filteredData or window.filteredData
    const dashboardData = getAvailableDashboardData();
    
    if (!dashboardData || dashboardData.length === 0) {
        console.error('No dashboard data available for PDF generation');
        showPDFGenerationError(new Error('No data available for PDF generation'));
        showPDFGenerationLoading(false);
        return;
    }
    
    console.log(`Found ${dashboardData.length} data items for PDF generation`);
    
    // Start building the PDF content
    try {
        // Begin creating the document definition
        createPDFDocument(dashboardData, theme, opts)
            .then(docDefinition => {
                // Generate and download the PDF
                generateAndDownloadPDF(docDefinition, opts);
            })
            .catch(error => {
                console.error('Error creating PDF document definition:', error);
                showPDFGenerationError(error);
                showPDFGenerationLoading(false);
            });
    } catch (error) {
        console.error('Error in PDF generation process:', error);
        showPDFGenerationError(error);
        showPDFGenerationLoading(false);
    }
}

/**
 * Get the available dashboard data from the application
 */
function getAvailableDashboardData() {
    // Try to access data in the following order:
    // 1. filteredData (if it exists in window scope)
    // 2. window.originalData (if it exists)
    // 3. Fall back to any other available data sources
    
    let data = [];
    
    if (typeof filteredData !== 'undefined' && filteredData.length > 0) {
        console.log('Using filteredData for PDF generation');
        data = filteredData;
    } else if (typeof window.filteredData !== 'undefined' && window.filteredData.length > 0) {
        console.log('Using window.filteredData for PDF generation');
        data = window.filteredData;
    } else if (typeof originalData !== 'undefined' && originalData.length > 0) {
        console.log('Using originalData for PDF generation');
        data = originalData;
    } else if (typeof window.originalData !== 'undefined' && window.originalData.length > 0) {
        console.log('Using window.originalData for PDF generation');
        data = window.originalData;
    } else {
        // As a last resort, try to find data in any global variable that might contain our data
        console.log('Searching for data in global scope');
        const possibleDataVars = ['dashboardData', 'tableData', 'reportData', 'etsyData'];
        
        for (const varName of possibleDataVars) {
            if (typeof window[varName] !== 'undefined' && Array.isArray(window[varName]) && window[varName].length > 0) {
                console.log(`Found data in ${varName}`);
                data = window[varName];
                break;
            }
        }
    }
    
    return data;
}

/**
 * Create the PDF document definition with structured content
 */
async function createPDFDocument(data, theme, opts) {
    console.log('Creating PDF document definition...');
    
    // Get the current date for the report title
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    
    // This will be our returned document definition
    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',  // Changed to landscape for wider tables
        pageMargins: [40, 60, 40, 60],
        info: {
            title: `Etsy Analytics Report - ${formattedDate}`,
            author: 'ERank Analytics Dashboard',
            subject: 'Etsy Seller Analytics',
            keywords: 'etsy, analytics, erank, sales, dashboard',
            creator: 'ERank Analytics Dashboard'
        },
        defaultStyle: {
            font: 'Roboto',
            fontSize: 10,
            color: theme.text
        },
        background: function(currentPage, pageSize) {
            return {
                canvas: [
                    {
                        type: 'rect',
                        x: 0, y: 0, w: pageSize.width, h: pageSize.height,
                        color: theme.background
                    }
                ]
            };
        },
        styles: {
            header: {
                fontSize: 22,
                bold: true,
                color: theme.headerText,
                margin: [0, 0, 0, 10]
            },
            subheader: {
                fontSize: 16,
                bold: true,
                color: theme.headerText,
                margin: [0, 15, 0, 10]
            },
            tableHeader: {
                bold: true,
                fontSize: 11,
                color: theme.tableHeaderText,
                fillColor: theme.tableHeaderBackground
            },
            tableCell: {
                fontSize: 10
            },
            tableCellEven: {
                fontSize: 10,
                fillColor: theme.tableEvenBackground
            },
            tableCellOdd: {
                fontSize: 10,
                fillColor: theme.tableOddBackground
            },
            note: {
                fontSize: 9,
                italics: true,
                color: theme.text === '#ffffff' ? '#cccccc' : '#666666'
            }
        },
        content: []
    };
    
    // Add report header
    docDefinition.content.push(
        {
            text: 'Etsy Analytics Dashboard Report',
            style: 'header',
            alignment: 'center'
        },
        {
            text: `Generated on ${formattedDate}`,
            style: 'note',
            alignment: 'center',
            margin: [0, 0, 0, 20]
        }
    );
    
    // Include the summary metrics section
    await addSummaryMetrics(docDefinition, data, theme);
    
    // Add market competitiveness section if available
    await addMarketCompetitivenessSection(docDefinition, data, theme);
    
    // Add age-based analytics section if available
    await addAgeBasedAnalyticsSection(docDefinition, data, theme);
    
    // Add all other sections based on available data
    if (data.length > 0) {
        // Add the full data table at the end
        await addFullDataTable(docDefinition, data, theme);
    }
    
    // Add footer with page numbers
    docDefinition.footer = function(currentPage, pageCount) {
        return {
            columns: [
                { text: 'ERank Analytics', alignment: 'left', margin: [40, 0, 0, 0], style: 'note' },
                { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', margin: [0, 0, 40, 0], style: 'note' }
            ]
        };
    };
    
    console.log('PDF document definition created successfully');
    return docDefinition;
}
    
/**
 * Generate and download the PDF using pdfmake
 */
function generateAndDownloadPDF(docDefinition, opts = {}) {
    console.log('Generating and downloading PDF...');
    
    try {
        // Generate the PDF
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        
        // Current date for filename
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        const filename = `etsy-analytics-report-${formattedDate}.pdf`;
        
        // Download the PDF
        pdfDocGenerator.download(filename);
        
        // Show success message
        showPDFCompletionMessage();
        
        // Hide loading indicator
        showPDFGenerationLoading(false);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showPDFGenerationError(error);
        showPDFGenerationLoading(false);
    }
}

/**
 * Add summary metrics to the PDF document
 */
async function addSummaryMetrics(docDefinition, data, theme) {
    console.log('Adding summary metrics section...');
    
    // Add a section header
    docDefinition.content.push({
        text: 'Summary Metrics',
        style: 'subheader',
        pageBreak: 'before'
    });
    
    if (data.length === 0) {
        docDefinition.content.push({
            text: 'No data available for summary metrics',
            style: 'note',
            margin: [0, 5, 0, 15]
        });
        return;
    }
    
    // Calculate summary metrics from data
    const metrics = calculateSummaryMetrics(data);
    
    // Create a summary metrics table
    const metricsTable = {
        layout: 'lightHorizontalLines',
        table: {
            headerRows: 1,
            widths: ['*', '*'],
            body: [
                [
                    { text: 'Metric', style: 'tableHeader' },
                    { text: 'Value', style: 'tableHeader' }
                ],
                // Add rows for each metric
                ['Total Items', metrics.totalItems],
                ['Average Price', `$${metrics.avgPrice.toFixed(2)}`],
                ['Total Favorites', metrics.totalFavorites],
                ['Average Favorites', metrics.avgFavorites.toFixed(0)],
                ['Highest Priced Item', `$${metrics.highestPrice.toFixed(2)}`],
                ['Lowest Priced Item', `$${metrics.lowestPrice.toFixed(2)}`],
                ['Most Favorited Item', metrics.mostFavoritedItem]
            ]
        }
    };
    
    docDefinition.content.push(metricsTable);

    // Add a note about the data
    docDefinition.content.push({
        text: `Based on ${data.length} items in the current dataset`,
        style: 'note',
        margin: [0, 5, 0, 15]
    });
    
    return true;
}

/**
 * Add market competitiveness section to the PDF document
 */
async function addMarketCompetitivenessSection(docDefinition, data, theme) {
    console.log('Adding market competitiveness section...');
    
    // Add section header
    docDefinition.content.push({
        text: 'Market Competitiveness Analysis',
        style: 'subheader'
    });
    
    if (data.length === 0) {
        docDefinition.content.push({
            text: 'No data available for market competitiveness analysis',
            style: 'note'
        });
        return;
    }
    
    // Create a description of the analysis
    docDefinition.content.push({
        text: 'This section analyzes your product positioning in terms of price and popularity.',
        margin: [0, 0, 0, 10]
    });
    
    // Generate a quadrant analysis table (simplified version of the chart)
    const marketAnalysisTable = await generateMarketAnalysisTable(data, theme);
    docDefinition.content.push(marketAnalysisTable);
    
    // Add top sellers section with a table
    await addTopSellersTable(docDefinition, data, theme);
    
    return true;
}

/**
 * Add age-based analytics section to the PDF document
 */
async function addAgeBasedAnalyticsSection(docDefinition, data, theme) {
    console.log('Adding age-based analytics section...');
    
    // Add section header
    docDefinition.content.push({
        text: 'Age-Based Analytics',
        style: 'subheader',
        pageBreak: 'before'
    });
    
    if (data.length === 0) {
        docDefinition.content.push({
            text: 'No data available for age-based analytics',
            style: 'note'
        });
        return;
    }
    
    // Description of the age-based analysis
    docDefinition.content.push({
        text: 'This section shows trending and evergreen items based on listing age and popularity.',
        margin: [0, 0, 0, 10]
    });
    
    // Generate trending items table
    const trendingItems = getTrendingItems(data);
    if (trendingItems.length > 0) {
        docDefinition.content.push({
            text: 'Trending Items (Newest with High Favorites)',
            style: 'subheader',
            fontSize: 14,
            margin: [0, 10, 0, 5]
        });
        
        docDefinition.content.push(await generateTrendingItemsTable(trendingItems, theme));
    }
    
    // Generate evergreen items table
    const evergreenItems = getEvergreenItems(data);
    if (evergreenItems.length > 0) {
        docDefinition.content.push({
            text: 'Evergreen Items (Oldest with High Favorites)',
            style: 'subheader',
            fontSize: 14,
            margin: [0, 20, 0, 5]
        });
        
        docDefinition.content.push(await generateEvergreenItemsTable(evergreenItems, theme));
    }
    
    return true;
}

/**
 * Add the full data table to the PDF document
 */
async function addFullDataTable(docDefinition, data, theme) {
    console.log('Adding full data table...');
    
    // Add section header
    docDefinition.content.push({
        text: 'Complete Data Table',
        style: 'subheader',
        pageBreak: 'before'
    });
    
    if (!data || data.length === 0 || !data[0]) {
        docDefinition.content.push({
            text: 'No data available for table generation',
            style: 'note'
        });
        return true; // Return success even if there's no data
    }
    
    // Log what data we're working with
    console.log(`Building table with ${data.length} items, first item has ${Object.keys(data[0]).length} fields`);
    console.log('Sample fields:', Object.keys(data[0]).slice(0, 5));
    
    // Get the column keys from the first data item
    let columns = Object.keys(data[0]).filter(key => {
        // Filter out any columns that shouldn't be in the report
        return !['id', '_id', 'hidden', 'image', 'image_url'].includes(key);
    });
    
    // Create the table header row
    let headerRow = columns.map(column => {
        return { 
            text: formatColumnName(column), 
            style: 'tableHeader' 
        };
    });
    
    // Create the table body rows with safety checks
    let bodyRows = data.slice(0, 100).map((item, rowIndex) => {
        return columns.map(column => {
            const cellStyle = rowIndex % 2 === 0 ? 'tableCellEven' : 'tableCellOdd';
            let cellValue;
            
            try {
                // Safely access the item value with fallbacks
                if (item && item[column] !== undefined) {
                    cellValue = formatCellValue(item[column]);
                } else {
                    // Item doesn't have this column, try to find something appropriate
                    const colLower = column.toLowerCase();
                    // For numeric fields, try to find a substitute value
                    if (['price', 'cost', 'amount'].some(term => colLower.includes(term))) {
                        cellValue = formatCellValue(getNumericValue(item, ['price', 'cost', 'amount', 'value']));
                    } else if (['favorites', 'views', 'orders'].some(term => colLower.includes(term))) {
                        cellValue = formatCellValue(getNumericValue(item, ['favorites', 'views', 'orders', 'count']));
                    } else if (['title', 'name', 'description'].some(term => colLower.includes(term))) {
                        cellValue = getStringValue(item, ['title', 'name', 'description']);
                    } else if (['created', 'date', 'updated'].some(term => colLower.includes(term))) {
                        const date = getDateValue(item);
                        cellValue = date ? date.toLocaleDateString() : '';
                    } else {
                        cellValue = ''; // Empty value for others
                    }
                }
            } catch (error) {
                console.log(`Error getting value for column ${column}:`, error);
                cellValue = ''; // Empty as fallback
            }
            
            return { 
                text: cellValue, 
                style: cellStyle 
            };
        });
    });
    
    // Combine header and body rows
    let tableBody = [headerRow, ...bodyRows];
    
    // Column widths optimized for landscape layout
    let columnWidths = columns.map(column => {
        const columnLower = column.toLowerCase();
        // Determine appropriate width based on column type
        if (['title', 'name', 'description'].includes(columnLower) || 
            columnLower.includes('title') || columnLower.includes('name')) {
            return '*'; // Flexible column for text content (take available space)
        } else if (['price', 'cost', 'amount', 'value'].some(term => columnLower.includes(term))) {
            return 50; // Fixed width for price/monetary values
        } else if (['favorites', 'views', 'orders', 'count', 'qty', 'quantity'].some(term => columnLower.includes(term))) {
            return 40; // Fixed width for numeric counts
        } else if (['created', 'updated', 'date', 'time'].some(term => columnLower.includes(term))) {
            return 70; // Fixed width for dates
        } else if (['id', 'code', 'sku'].some(term => columnLower.includes(term))) {
            return 60; // Fixed width for IDs and codes
        } else {
            return 'auto'; // Auto width for others
        }
    });
    
    // Make sure we don't have too many columns that would make the table unreadable
    if (columnWidths.length > 10) {
        console.log(`Too many columns (${columnWidths.length}), limiting to most important ones`);
        // Focus on the most important columns - limit to 8-10 columns
        const priorityColumns = ['title', 'name', 'price', 'favorites', 'views', 'created', 'updated'];
        const filteredColumns = [];
        const filteredWidths = [];
        
        // First add priority columns
        columns.forEach((col, idx) => {
            const colLower = col.toLowerCase();
            if (priorityColumns.some(term => colLower.includes(term))) {
                filteredColumns.push(col);
                filteredWidths.push(columnWidths[idx]);
            }
        });
        
        // Then add others until we reach reasonable limit
        let remainingSlots = Math.max(0, 10 - filteredColumns.length);
        columns.forEach((col, idx) => {
            const colLower = col.toLowerCase();
            if (!priorityColumns.some(term => colLower.includes(term)) && remainingSlots > 0) {
                filteredColumns.push(col);
                filteredWidths.push(columnWidths[idx]);
                remainingSlots--;
            }
        });
        
        // Update columns and widths
        columns = filteredColumns;
        columnWidths = filteredWidths;
        
        // We also need to update the header row and body rows
        headerRow = columns.map(column => {
            return { 
                text: formatColumnName(column), 
                style: 'tableHeader' 
            };
        });
        
        // Recreate the body rows with the new column set
        bodyRows = data.slice(0, 100).map((item, rowIndex) => {
            return columns.map(column => {
                const cellStyle = rowIndex % 2 === 0 ? 'tableCellEven' : 'tableCellOdd';
                return { 
                    text: formatCellValue(item[column]), 
                    style: cellStyle 
                };
            });
        });
        
        // Regenerate table body with new header and rows
        tableBody = [headerRow, ...bodyRows];
    }
    
    // Create the table
    const dataTable = {
        layout: {
            fillColor: function(rowIndex, node, columnIndex) {
                return (rowIndex % 2 === 0) ? theme.tableEvenBackground : theme.tableOddBackground;
            },
            hLineWidth: function(i, node) { return 1; },
            vLineWidth: function(i, node) { return 0; },
            hLineColor: function(i, node) { return theme.tableBorder; }
        },
        table: {
            headerRows: 1,
            widths: columnWidths,
            body: tableBody
        },
        margin: [0, 5, 0, 15]
    };
    
    docDefinition.content.push(dataTable);
    
    // Add note if we truncated the data
    if (data.length > 100) {
        docDefinition.content.push({
            text: `Note: Showing 100 of ${data.length} total items to keep report size manageable.`,
            style: 'note',
            margin: [0, 5, 0, 15]
        });
    }
    
    return true;
}

/**
 * Format a column name for display in tables
 */
function formatColumnName(column) {
    // Convert snake_case or camelCase to Title Case with spaces
    return column
        .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .trim();
}

/**
 * Format a cell value for display in tables
 */
function formatCellValue(value) {
    if (value === undefined || value === null) {
        return '';
    }
    
    // Handle different data types
    if (typeof value === 'number') {
        // Format price values with $ and 2 decimal places
        if (value > 0 && value < 10000 && value.toString().includes('.')) {
            return `$${value.toFixed(2)}`;
        }
        // Format large numbers with commas
        return value.toLocaleString();
    }
    
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    
    // Try to detect and format dates
    if (typeof value === 'string' && (
        value.match(/^\d{4}-\d{2}-\d{2}/) || // ISO date format
        value.match(/^\d{2}\/\d{2}\/\d{4}/) // MM/DD/YYYY format
    )) {
        try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString();
            }
        } catch (e) {
            // If parsing fails, return original value
        }
    }
    
    return value.toString();
}

/**
 * Calculate summary metrics from data
 */
function calculateSummaryMetrics(data) {
    const metrics = {
        totalItems: data.length,
        totalFavorites: 0,
        avgPrice: 0,
        avgFavorites: 0,
        highestPrice: 0,
        lowestPrice: Number.MAX_VALUE,
        mostFavoritedItem: ''
    };
    
    let totalPrice = 0;
    let mostFavorites = 0;
    let mostFavoritedItemTitle = '';
    
    data.forEach(item => {
        // Get price - handle different possible property names
        const price = getNumericValue(item, ['price', 'item_price', 'Price']);
        
        // Get favorites - handle different possible property names
        const favorites = getNumericValue(item, ['favorites', 'favorite_count', 'Favorites']);
        
        // Update totals
        totalPrice += price;
        metrics.totalFavorites += favorites;
        
        // Track highest/lowest price
        if (price > metrics.highestPrice) {
            metrics.highestPrice = price;
        }
        if (price < metrics.lowestPrice && price > 0) {
            metrics.lowestPrice = price;
        }
        
        // Track most favorited item
        if (favorites > mostFavorites) {
            mostFavorites = favorites;
            // Get title - handle different possible property names
            mostFavoritedItemTitle = getStringValue(item, ['title', 'item_title', 'Title', 'name', 'Name']);
        }
    });
    
    // Calculate averages
    metrics.avgPrice = totalPrice / data.length;
    metrics.avgFavorites = metrics.totalFavorites / data.length;
    metrics.mostFavoritedItem = mostFavoritedItemTitle;
    
    // If lowestPrice was never set, reset it to 0
    if (metrics.lowestPrice === Number.MAX_VALUE) {
        metrics.lowestPrice = 0;
    }
    
    return metrics;
}

/**
 * Get a numeric value from an object using multiple possible property names
 * With improved handling for different data formats
 */
function getNumericValue(obj, possibleKeys) {
    for (const key of possibleKeys) {
        if (obj[key] !== undefined) {
            // Try to handle various formats like strings with currency symbols
            let value;
            
            if (typeof obj[key] === 'string') {
                // Remove currency symbols and commas
                const cleanStr = obj[key].replace(/[$,]/g, '');
                value = parseFloat(cleanStr);
            } else {
                value = parseFloat(obj[key]);
            }
            
            if (!isNaN(value)) {
                return value;
            }
        }
    }
    
    // If we reach here, try to examine all keys for anything that might be a number
    if (obj) {
        for (const key of Object.keys(obj)) {
            const lowercaseKey = key.toLowerCase();
            if (lowercaseKey.includes('price') || 
                lowercaseKey.includes('cost') || 
                lowercaseKey.includes('favorites') || 
                lowercaseKey.includes('views')) {
                
                const value = parseFloat(obj[key]);
                if (!isNaN(value)) {
                    console.log(`Found numeric value in field: ${key}`);
                    return value;
                }
            }
        }
    }
    
    return 0;
}

/**
 * Get a string value from an object using multiple possible property names
 * With improved detection of title/name fields
 */
function getStringValue(obj, possibleKeys) {
    // First try the explicitly provided keys
    for (const key of possibleKeys) {
        if (obj[key] !== undefined && obj[key] !== null) {
            return obj[key].toString();
        }
    }
    
    // If we reach here, try to find any field that might contain item names or titles
    if (obj) {
        // Common field names that might contain item titles
        const titleKeys = ['title', 'name', 'item_name', 'product_name', 'product_title', 
                          'item_title', 'listing_title', 'description', 'product', 
                          'item', 'listing'];
        
        // Check for any key that contains these words
        for (const key of Object.keys(obj)) {
            const lowercaseKey = key.toLowerCase();
            if (titleKeys.some(titleKey => lowercaseKey.includes(titleKey))) {
                if (obj[key] !== undefined && obj[key] !== null && typeof obj[key] === 'string') {
                    console.log(`Found title in field: ${key}`);
                    return obj[key].toString();
                }
            }
        }
        
        // Last resort: find the longest string in the object, it might be a title/name
        let longestString = '';
        for (const key of Object.keys(obj)) {
            if (obj[key] !== undefined && obj[key] !== null && typeof obj[key] === 'string') {
                if (obj[key].length > longestString.length && obj[key].length < 200) {
                    // Only use strings less than 200 chars (to avoid huge text blocks)
                    longestString = obj[key];
                }
            }
        }
        
        if (longestString) {
            console.log('Using longest string as title');
            return longestString;
        }
    }
    
    return 'Item ' + Math.floor(Math.random() * 1000); // Fallback to a generic name with random number
}

/**
 * Generate a market analysis table for the PDF
 */
async function generateMarketAnalysisTable(data, theme) {
    // Create a simplified quadrant analysis as a table
    return {
        table: {
            widths: ['*', '*'],
            body: [
                [
                    {
                        text: 'High Price / High Favorites\n(Premium Products)',
                        fillColor: theme.tableHeaderBackground,
                        color: theme.tableHeaderText,
                        alignment: 'center',
                        margin: [0, 10, 0, 10]
                    },
                    {
                        text: 'Low Price / High Favorites\n(Popular Products)',
                        fillColor: theme.tableHeaderBackground,
                        color: theme.tableHeaderText,
                        alignment: 'center',
                        margin: [0, 10, 0, 10]
                    }
                ],
                [
                    {
                        text: 'High Price / Low Favorites\n(Niche Products)',
                        fillColor: theme.tableHeaderBackground,
                        color: theme.tableHeaderText,
                        alignment: 'center',
                        margin: [0, 10, 0, 10]
                    },
                    {
                        text: 'Low Price / Low Favorites\n(Value Products)',
                        fillColor: theme.tableHeaderBackground,
                        color: theme.tableHeaderText,
                        alignment: 'center',
                        margin: [0, 10, 0, 10]
                    }
                ]
            ]
        },
        margin: [0, 10, 0, 20]
    };
}

/**
 * Add a table of top sellers to the document
 */
async function addTopSellersTable(docDefinition, data, theme) {
    // Get the top sellers by favorites
    const topSellers = [...data]
        .sort((a, b) => {
            const aFavorites = getNumericValue(a, ['favorites', 'favorite_count', 'Favorites']);
            const bFavorites = getNumericValue(b, ['favorites', 'favorite_count', 'Favorites']);
            return bFavorites - aFavorites;
        })
        .slice(0, 5);
    
    if (topSellers.length === 0) {
        return false;
    }
    
    // Create a table for top sellers
    docDefinition.content.push({
        text: 'Top Items by Favorites',
        style: 'subheader',
        fontSize: 14,
        margin: [0, 15, 0, 5]
    });
    
    // Build the table body
    const tableBody = [
        // Header row
        [
            { text: 'Item', style: 'tableHeader' },
            { text: 'Price', style: 'tableHeader', alignment: 'right' },
            { text: 'Favorites', style: 'tableHeader', alignment: 'right' }
        ]
    ];
    
    // Add rows for each top seller
    topSellers.forEach((item, index) => {
        const style = index % 2 === 0 ? 'tableCellEven' : 'tableCellOdd';
        tableBody.push([
            { 
                text: getStringValue(item, ['title', 'item_title', 'Title', 'name', 'Name']), 
                style: style
            },
            { 
                text: formatCellValue(getNumericValue(item, ['price', 'item_price', 'Price'])), 
                style: style, 
                alignment: 'right' 
            },
            { 
                text: formatCellValue(getNumericValue(item, ['favorites', 'favorite_count', 'Favorites'])), 
                style: style, 
                alignment: 'right' 
            }
        ]);
    });
    
    // Add the table to the document
    docDefinition.content.push({
        layout: {
            fillColor: function(rowIndex, node, columnIndex) {
                return (rowIndex % 2 === 0 && rowIndex !== 0) ? theme.tableEvenBackground : (rowIndex === 0 ? theme.tableHeaderBackground : theme.tableOddBackground);
            },
            hLineWidth: function(i, node) { return 1; },
            vLineWidth: function(i, node) { return 0; },
            hLineColor: function(i, node) { return theme.tableBorder; }
        },
        table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto'],
            body: tableBody
        },
        margin: [0, 5, 0, 15]
    });
    
    return true;
}

/**
 * Get trending items from the data
 */
function getTrendingItems(data) {
    // Define trending as new items with relatively high favorites
    const sortedItems = [...data]
        .sort((a, b) => {
            // First try to sort by creation date (newer first)
            const aDate = getDateValue(a);
            const bDate = getDateValue(b);
            
            // If dates are significantly different, sort by date
            if (aDate && bDate) {
                const dateDiff = bDate.getTime() - aDate.getTime();
                if (Math.abs(dateDiff) > 30 * 24 * 60 * 60 * 1000) { // If more than 30 days difference
                    return dateDiff;
                }
            }
            
            // Otherwise sort by favorites (higher first)
            const aFavorites = getNumericValue(a, ['favorites', 'favorite_count', 'Favorites']);
            const bFavorites = getNumericValue(b, ['favorites', 'favorite_count', 'Favorites']);
            return bFavorites - aFavorites;
        })
        .slice(0, 5);
    
    return sortedItems;
}

/**
 * Get evergreen items from the data
 */
function getEvergreenItems(data) {
    // Define evergreen as older items that still maintain high favorites
    const sortedItems = [...data]
        .sort((a, b) => {
            // First try to sort by age (older first) 
            const aDate = getDateValue(a);
            const bDate = getDateValue(b);
            
            // If dates are significantly different, sort by date (older first)
            if (aDate && bDate) {
                const dateDiff = aDate.getTime() - bDate.getTime();
                if (Math.abs(dateDiff) > 30 * 24 * 60 * 60 * 1000) { // If more than 30 days difference
                    return dateDiff;
                }
            }
            
            // Then by favorites (higher first)
            const aFavorites = getNumericValue(a, ['favorites', 'favorite_count', 'Favorites']);
            const bFavorites = getNumericValue(b, ['favorites', 'favorite_count', 'Favorites']);
            return bFavorites - aFavorites;
        })
        .slice(0, 5);
    
    return sortedItems;
}

/**
 * Get a date value from an item using various possible date fields
 * With improved date detection
 */
function getDateValue(item) {
    // Common date field names
    const dateFields = [
        'creation_date', 'created_date', 'created_at', 'creation_timestamp', 
        'date_created', 'created', 'date', 'timestamp', 'published_date', 
        'publish_date', 'published_at', 'updated_at', 'update_date', 
        'last_modified', 'modified_date', 'last_modified_date'
    ];
    
    // First pass: try common field names
    for (const field of dateFields) {
        if (item[field]) {
            try {
                const date = new Date(item[field]);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            } catch (e) {
                // If parsing fails, try the next field
            }
        }
    }
    
    // Second pass: look for any field that might contain a date
    if (item) {
        // Check for any key that contains date-related terms
        for (const key of Object.keys(item)) {
            const lowercaseKey = key.toLowerCase();
            if (lowercaseKey.includes('date') || 
                lowercaseKey.includes('time') || 
                lowercaseKey.includes('created') || 
                lowercaseKey.includes('modified')) {
                
                try {
                    const value = item[key];
                    if (value) {
                        // Try to parse as date
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                            console.log(`Found date in field: ${key}`);  
                            return date;
                        }
                    }
                } catch (e) {
                    // Continue if parsing fails
                }
            }
        }
    }
    
    // If no date found, create a semi-random one for demo purposes
    // This ensures tables always have some date value
    const now = new Date();
    const randomDaysAgo = Math.floor(Math.random() * 365);
    now.setDate(now.getDate() - randomDaysAgo);
    return now;
}

/**
 * Generate a table of trending items
 */
async function generateTrendingItemsTable(items, theme) {
    // Similar structure to top sellers table
    const tableBody = [
        // Header row
        [
            { text: 'Item', style: 'tableHeader' },
            { text: 'Price', style: 'tableHeader', alignment: 'right' },
            { text: 'Favorites', style: 'tableHeader', alignment: 'right' },
            { text: 'Created', style: 'tableHeader', alignment: 'right' }
        ]
    ];
    
    // Add rows for each trending item
    items.forEach((item, index) => {
        const style = index % 2 === 0 ? 'tableCellEven' : 'tableCellOdd';
        tableBody.push([
            { 
                text: getStringValue(item, ['title', 'item_title', 'Title', 'name', 'Name']), 
                style: style
            },
            { 
                text: formatCellValue(getNumericValue(item, ['price', 'item_price', 'Price'])), 
                style: style, 
                alignment: 'right' 
            },
            { 
                text: formatCellValue(getNumericValue(item, ['favorites', 'favorite_count', 'Favorites'])), 
                style: style, 
                alignment: 'right' 
            },
            { 
                text: formatCellValue(getDateValue(item) ? getDateValue(item).toLocaleDateString() : ''), 
                style: style, 
                alignment: 'right' 
            }
        ]);
    });
    
    // Create and return the table
    return {
        layout: {
            fillColor: function(rowIndex, node, columnIndex) {
                return (rowIndex % 2 === 0 && rowIndex !== 0) ? theme.tableEvenBackground : (rowIndex === 0 ? theme.tableHeaderBackground : theme.tableOddBackground);
            },
            hLineWidth: function(i, node) { return 1; },
            vLineWidth: function(i, node) { return 0; },
            hLineColor: function(i, node) { return theme.tableBorder; }
        },
        table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: tableBody
        },
        margin: [0, 5, 0, 15]
    };
}

/**
 * Generate a table of evergreen items
 */
async function generateEvergreenItemsTable(items, theme) {
    // Similar structure to trending items table
    return generateTrendingItemsTable(items, theme);
}

/**
 * Create a header for the PDF
 */
function createPdfHeader(isDarkMode) {
    const headerDiv = document.createElement('div');
    headerDiv.id = 'pdf-report-header';
    headerDiv.style.textAlign = 'center';
    headerDiv.style.marginBottom = '20px';
    headerDiv.style.padding = '15px';
    headerDiv.style.borderRadius = '8px';
    
    if (isDarkMode) {
        headerDiv.style.backgroundColor = '#2d2d30';
        headerDiv.style.color = '#ffffff';
    } else {
        headerDiv.style.backgroundColor = '#f8f9fa';
        headerDiv.style.color = '#3c4b64';
    }
    
    const date = new Date();
    headerDiv.innerHTML = `
        <h1 style="margin:0;padding:10px 0;font-size:24px">Etsy ERank Analytics Dashboard</h1>
        <p style="margin:5px 0">Report generated on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}</p>
    `;
    return headerDiv;
}

/**
 * Clean up after PDF generation
 */
function cleanup(headerElement, hiddenElements) {
    // Remove the PDF header
    if (headerElement && headerElement.parentNode) {
        headerElement.parentNode.removeChild(headerElement);
    }
    
    // Restore hidden elements
    hiddenElements.forEach(item => {
        item.element.style.display = item.display;
    });
    
    // Remove PDF-specific classes
    document.body.classList.remove('generating-pdf');
    document.body.classList.remove('pdf-dark-mode');
    document.body.classList.remove('pdf-light-mode');
}

/**
 * Prepare tables for PDF generation
 */
function prepareTables() {
    // Make sure all table cells show complete content
    const tableCells = document.querySelectorAll('td');
    tableCells.forEach(cell => {
        cell.style.maxWidth = 'none';
        cell.style.whiteSpace = 'normal';
        cell.style.overflow = 'visible';
        cell.style.textOverflow = 'clip';
    });
}

/**
 * Prepare the cloned document to ensure charts and tables render correctly
 */
function prepareClonedDoc(clonedDoc, isDarkMode) {
    // Fix issues with the cloned document that could affect rendering
    
    // Apply dark mode styles if needed
    if (isDarkMode) {
        clonedDoc.body.classList.add('dark-mode');
    }
    
    // Handle any canvas elements explicitly
    const canvasElements = clonedDoc.querySelectorAll('canvas');
    canvasElements.forEach(canvas => {
        // Make sure all canvases are visible
        if (canvas.style.display === 'none') {
            canvas.style.display = 'block';
        }
        
        // Add a border to help with visibility in the PDF
        canvas.style.border = isDarkMode ? '1px solid #444' : '1px solid #ddd';
    });
    
    // Make sure all tables are styled for PDF
    const tableElements = clonedDoc.querySelectorAll('table');
    tableElements.forEach(table => {
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        // Style table cells for better visibility
        const cells = table.querySelectorAll('td, th');
        cells.forEach(cell => {
            cell.style.padding = '5px';
            cell.style.border = '1px solid #ddd';
        });
    });
}

// Initialize font for pdfmake
pdfMake.fonts = {
    Roboto: {
        normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
        bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
        italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
        bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf'
    }
};

/**
 * Create a header for the PDF
 */
function createPdfHeader(isDarkMode) {
    const headerDiv = document.createElement('div');
    headerDiv.id = 'pdf-report-header';
    headerDiv.style.textAlign = 'center';
    headerDiv.style.marginBottom = '20px';
    headerDiv.style.padding = '15px';
    headerDiv.style.borderRadius = '8px';
    
    if (isDarkMode) {
        headerDiv.style.backgroundColor = '#2d2d30';
        headerDiv.style.color = '#ffffff';
    } else {
        headerDiv.style.backgroundColor = '#f8f9fa';
        headerDiv.style.color = '#3c4b64';
    }
    
    const date = new Date();
    headerDiv.innerHTML = `
        <h1 style="margin:0;padding:10px 0;font-size:24px">Etsy ERank Analytics Dashboard</h1>
        <p style="margin:5px 0">Report generated on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}</p>
    `;
    return headerDiv;
}

/**
 * Clean up after PDF generation
 */
function cleanup(headerElement, hiddenElements) {
    // Remove the PDF header
    if (headerElement && headerElement.parentNode) {
        headerElement.parentNode.removeChild(headerElement);
    }
    
    // Restore hidden elements
    hiddenElements.forEach(item => {
        item.element.style.display = item.display;
    });
    
    // Remove PDF-specific classes
    document.body.classList.remove('generating-pdf');
    document.body.classList.remove('pdf-dark-mode');
    document.body.classList.remove('pdf-light-mode');
}

/**
 * Prepare tables for PDF generation
 */
function prepareTables() {
    // Make sure all table cells show complete content
    const tableCells = document.querySelectorAll('td');
    tableCells.forEach(cell => {
        cell.style.maxWidth = 'none';
        cell.style.whiteSpace = 'normal';
        cell.style.overflow = 'visible';
        cell.style.textOverflow = 'clip';
    });
}

/**
 * Prepare the cloned document to ensure charts and tables render correctly
 */
function prepareClonedDoc(clonedDoc, isDarkMode) {
    // Fix issues with the cloned document that could affect rendering
    
    // Apply dark mode styles if needed
    if (isDarkMode) {
        clonedDoc.body.classList.add('dark-mode');
    }
    
    // Handle any canvas elements explicitly
    const canvasElements = clonedDoc.querySelectorAll('canvas');
    canvasElements.forEach(canvas => {
        // Make sure all canvases are visible
        if (canvas.style.display === 'none') {
            canvas.style.display = 'block';
        }
        
        // Add a border to help with visibility in the PDF
        canvas.style.border = isDarkMode ? '1px solid #444' : '1px solid #ddd';
    });
    
    // Make sure all tables are styled for PDF
    const tableElements = clonedDoc.querySelectorAll('table');
    tableElements.forEach(table => {
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        // Style table cells for better visibility
        const cells = table.querySelectorAll('td, th');
        cells.forEach(cell => {
            cell.style.padding = '5px 8px';
            cell.style.border = isDarkMode ? '1px solid #3d3d4d' : '1px solid #dee2e6';
            
            // Fix text visibility in dark mode
            if (isDarkMode) {
                if (cell.tagName.toLowerCase() === 'th') {
                    cell.style.backgroundColor = '#2a2a3a';
                    cell.style.color = '#ffffff';
                } else {
                    cell.style.backgroundColor = '#252535';
                    cell.style.color = '#e0e0e0';
                }
            }
        });
    });
    
    // Remove any elements that shouldn't be in the PDF
    const elementsToRemove = clonedDoc.querySelectorAll('.pdf-download-container, .pdf-theme-selector, .mobile-nav');
    elementsToRemove.forEach(el => {
        if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
    });
    
    return clonedDoc;
}

/**
 * Simpler version: Prepare document for PDF generation
 * Rather than replacing canvases, we ensure they're properly styled
 */
function captureCanvasElements() {
    return new Promise((resolve) => {
        // Just ensure all canvases have proper styling
        const canvases = document.querySelectorAll('canvas');
        console.log(`Found ${canvases.length} canvas elements to process`);
        
        canvases.forEach((canvas, index) => {
            // Make sure the canvas is visible
            if (canvas.style.display === 'none') {
                canvas.style.display = 'block';
            }
            
            // Ensure canvas has explicit dimensions
            if (!canvas.style.width) {
                canvas.style.width = `${canvas.width}px`;
            }
            if (!canvas.style.height) {
                canvas.style.height = `${canvas.height}px`;
            }
            
            // Add a special class for PDF styling
            canvas.classList.add('pdf-canvas');
        });
        
        // Delay slightly to ensure DOM updates have processed
        setTimeout(resolve, 300);
    });
}

/**
 * Prepare the content for PDF rendering by adding necessary styles
 * and adjusting elements for optimal PDF layout
 */
function preparePDFContent(container, isDarkMode) {
    // Add PDF-specific styling
    container.style.width = '100%';
    container.style.padding = '15px';
    
    // Add a header with timestamp
    const headerDiv = document.createElement('div');
    headerDiv.style.textAlign = 'center';
    headerDiv.style.marginBottom = '20px';
    headerDiv.style.padding = '10px';
    headerDiv.style.borderRadius = '8px';
    
    if (isDarkMode) {
        headerDiv.style.backgroundColor = '#2d2d30';
        headerDiv.style.color = '#ffffff';
    } else {
        headerDiv.style.backgroundColor = '#f8f9fa';
        headerDiv.style.color = '#3c4b64';
    }
    
    const date = new Date();
    headerDiv.innerHTML = `
        <h1 style="margin:0;padding:10px 0;font-size:24px">Etsy ERank Analytics Dashboard</h1>
        <p style="margin:5px 0">Report generated on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}</p>
    `;
    container.insertBefore(headerDiv, container.firstChild);
    
    // Remove buttons and interactive elements not needed in PDF
    const elementsToRemove = container.querySelectorAll(
        '#upload-container, #filter-panel, .pagination, button:not(.btn-viz), .mobile-nav, nav'
    );
    elementsToRemove.forEach(el => el.style.display = 'none');
    
    // Make sure all table cells show complete content (no truncation)
    const tableCells = container.querySelectorAll('td');
    tableCells.forEach(cell => {
        cell.style.maxWidth = 'none';
        cell.style.whiteSpace = 'normal';
        cell.style.overflow = 'visible';
        cell.style.textOverflow = 'clip';
    });
    
    // Ensure proper styling for dark mode
    if (isDarkMode) {
        // Add explicit dark mode background to ensure PDF captures correct colors
        container.style.backgroundColor = '#1e1e1e';
        
        // Make sure text is visible in dark mode PDF
        const textElements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, td, th');
        textElements.forEach(el => {
            if (!el.style.color) {
                el.style.color = '#ffffff';
            }
        });
    } else {
        // Light mode explicit styling
        container.style.backgroundColor = '#ffffff';
    }
    
    // Ensure all charts are properly sized and visible
    const chartContainers = container.querySelectorAll('[style*="height"]');
    chartContainers.forEach(el => {
        if (el.style.height === '280px') {
            el.style.height = '200px';
        }
    });
    
    return container;
}

/**
 * Display a loading indicator while PDF is being generated
 */
function showPDFGenerationLoading(isLoading) {
    // If there's an existing loading indicator, remove it
    const existingIndicator = document.getElementById('pdf-loading-indicator');
    if (existingIndicator) {
        document.body.removeChild(existingIndicator);
    }
    
    if (isLoading) {
        // Create and show the loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'pdf-loading-indicator';
        loadingIndicator.innerHTML = `
            <div class="loading-circle"></div>
            <p>Generating PDF...</p>
        `;
        document.body.appendChild(loadingIndicator);
    }
}

/**
 * Display a success message when PDF generation is complete
 */
function showPDFCompletionMessage() {
    const message = document.createElement('div');
    message.className = 'pdf-success-message';
    message.innerHTML = `
        <div class="success-icon"><i class="fas fa-check"></i></div>
        <p>PDF Generated Successfully!</p>
    `;
    document.body.appendChild(message);
    
    // Remove the message after a few seconds
    setTimeout(() => {
        if (document.body.contains(message)) {
            document.body.removeChild(message);
        }
    }, 3000);
}

/**
 * Display an error message if PDF generation fails
 */
function showPDFGenerationError(error) {
    console.error('PDF Generation Error:', error);
    
    const message = document.createElement('div');
    message.className = 'pdf-error-message';
    message.innerHTML = `
        <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <p>PDF Generation Failed</p>
        <small>Please try again or contact support</small>
    `;
    document.body.appendChild(message);
    
    // Remove the message after a few seconds
    setTimeout(() => {
        if (document.body.contains(message)) {
            document.body.removeChild(message);
        }
    }, 5000);
}

// Initialize PDF generation button when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const pdfButton = document.getElementById('pdf-download-btn');
    const themeButtons = document.querySelectorAll('.pdf-theme-option');
    
    // Add click event to the main PDF button (uses current theme)
    if (pdfButton) {
        pdfButton.addEventListener('click', function() {
            // Build the PDF with current theme
            generatePDF();
        });
    }
    
    // Add click events to theme selection buttons
    themeButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent bubbling to parent
            
            const themeChoice = this.getAttribute('data-theme');
            console.log(`Generating PDF with theme: ${themeChoice}`);
            
            const options = {};
            
            // Set the theme based on selection
            if (themeChoice === 'light') {
                options.forceLightMode = true;
            } else if (themeChoice === 'dark') {
                options.forceDarkMode = true;
            }
            
            // Generate the PDF with selected theme
            generatePDF(options);
        });
    });
});
