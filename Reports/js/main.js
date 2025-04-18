/**
 * Main Dashboard Controller for Etsy Analytics Dashboard
 * Initializes and coordinates all dashboard components
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize core components
    const dataProcessor = new DataProcessor();
    const visualizations = new Visualizations();
    const threeViz = new ThreeVisualization();
    
    // DOM elements
    const loadingMessage = document.getElementById('loading-message');
    const dataLoaded = document.getElementById('data-loaded');
    const dashboardContent = document.querySelector('.dashboard-content');
    const csvFileInput = document.getElementById('csv-file');
    const dataSourceName = document.getElementById('data-source-name');
    const keywordName = document.getElementById('keyword-name');
    
    // Controls
    const sortBySelect = document.getElementById('sort-by');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const applyFiltersButton = document.getElementById('apply-filters');
    
    // 3D Visualization controls
    const xAxisSelect = document.getElementById('x-axis');
    const yAxisSelect = document.getElementById('y-axis');
    const zAxisSelect = document.getElementById('z-axis');
    const pointSizeSelect = document.getElementById('point-size');
    const updateVizButton = document.getElementById('update-viz');
    
    // Store current data and state
    let currentData = null;
    let currentFilters = {
        minPrice: 0,
        maxPrice: 20
    };
    
    /**
     * Initialize the dashboard with default data
     */
    function initializeDashboard() {
        showLoading();
        
        // Load the default data file
        dataProcessor.loadDefaultData()
            .then(data => {
                currentData = data;
                updateDashboard(data);
                hideLoading();
            })
            .catch(error => {
                console.error('Error loading data:', error);
                showError('Failed to load data. Please check the console for details.');
            });
    }
    
    /**
     * Update the dashboard with new data
     * @param {Object} data - The processed data object
     */
    function updateDashboard(data) {
        // Update summary metrics
        visualizations.updateSummaryMetrics(data.summary);
        
        // Initialize or update charts
        visualizations.initializeCharts(data);
        
        // Update the listings table (sorted by views by default)
        updateListingsTable();
        
        // Initialize 3D visualization
        updateThreeVisualization();
        
        // Show the dashboard content
        dashboardContent.style.display = 'block';
    }
    
    /**
     * Update the listings table based on current filters and sort
     */
    function updateListingsTable() {
        if (!currentData) return;
        
        // Apply filters
        const filteredListings = dataProcessor.filterListings(currentFilters);
        
        // Sort by selected field
        const sortField = sortBySelect.value;
        const sortedListings = dataProcessor.sortListings(filteredListings, sortField);
        
        // Update the table
        visualizations.updateListingsTable(sortedListings);
    }
    
    /**
     * Update the 3D visualization with current data and options
     */
    function updateThreeVisualization() {
        if (!currentData) return;
        
        const options = {
            xAxis: xAxisSelect.value,
            yAxis: yAxisSelect.value,
            zAxis: zAxisSelect.value,
            sizeField: pointSizeSelect.value
        };
        
        threeViz.updateVisualization(currentData, options);
    }
    
    /**
     * Show loading indicator and hide content
     */
    function showLoading() {
        loadingMessage.style.display = 'block';
        dataLoaded.style.display = 'none';
        dashboardContent.style.display = 'none';
    }
    
    /**
     * Hide loading indicator and show success message
     */
    function hideLoading() {
        loadingMessage.style.display = 'none';
        dataLoaded.style.display = 'block';
    }
    
    /**
     * Show an error message
     * @param {string} message - The error message to display
     */
    function showError(message) {
        loadingMessage.style.display = 'none';
        dataLoaded.style.display = 'block';
        dataLoaded.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    }
    
    /**
     * Extract keyword name from file name
     * @param {string} fileName - The name of the file
     * @returns {string} The extracted keyword or default value
     */
    function extractKeywordFromFileName(fileName) {
        // Try to extract keyword from file name
        // Format is expected to be like "Keyword_Tool - Top Listings - [KEYWORD].csv"
        if (fileName.includes('-')) {
            const parts = fileName.split('-');
            if (parts.length > 1) {
                const lastPart = parts[parts.length - 1].trim();
                if (lastPart.toLowerCase().endsWith('.csv')) {
                    return lastPart.substring(0, lastPart.length - 4).trim();
                }
                return lastPart;
            }
        }
        return 'SVG'; // Default keyword
    }
    
    // Event listeners
    
    // File upload handler
    csvFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        showLoading();
        
        // Update displayed file name
        dataSourceName.textContent = file.name;
        keywordName.textContent = extractKeywordFromFileName(file.name);
        
        // Load and process the file
        dataProcessor.loadDataFromFile(file)
            .then(data => {
                currentData = data;
                updateDashboard(data);
                hideLoading();
            })
            .catch(error => {
                console.error('Error loading file:', error);
                showError('Failed to load file. Please check if the format matches the expected CSV format.');
            });
    });
    
    // Apply filters button
    applyFiltersButton.addEventListener('click', function() {
        // Update filters
        currentFilters.minPrice = parseFloat(minPriceInput.value) || 0;
        currentFilters.maxPrice = parseFloat(maxPriceInput.value) || 100;
        
        // Update table
        updateListingsTable();
    });
    
    // Sort by selection change
    sortBySelect.addEventListener('change', function() {
        updateListingsTable();
    });
    
    // Update 3D visualization button
    updateVizButton.addEventListener('click', function() {
        updateThreeVisualization();
    });
    
    // Initialize the dashboard
    initializeDashboard();
});
