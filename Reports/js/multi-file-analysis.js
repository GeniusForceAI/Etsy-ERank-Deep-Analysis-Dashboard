/**
 * Multi-File Analysis Dashboard Main Controller
 * Initializes and coordinates all components
 */

// Initialize when document is ready
$(document).ready(function() {
    // Initialize UI handlers
    initMultiFileAnalysis();
});

/**
 * Initialize the multi-file analysis dashboard
 */
function initMultiFileAnalysis() {
    // Setup UI event handlers
    setupUIHandlers();
    
    // Initialize UI components
    initUIComponents();
    
    // Load additional modules
    loadAdditionalModules();
}

/**
 * Setup UI event handlers
 */
function setupUIHandlers() {
    // File upload handling
    const uploadArea = document.getElementById('multi-upload-area');
    const fileInput = document.getElementById('csv-files-upload');
    const selectFilesBtn = document.getElementById('select-files-btn');
    const filesList = document.getElementById('files-list');
    const filesContainer = document.getElementById('files-container');
    const clearFilesBtn = document.getElementById('clear-files');
    const processFilesBtn = document.getElementById('process-files');
    const useSampleDataBtn = document.getElementById('use-sample-multi-data');
    
    // Click handler for file select button
    if (selectFilesBtn && fileInput) {
        selectFilesBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    // File input change handler
    if (fileInput) {
        fileInput.addEventListener('change', handleFilesSelected);
    }
    
    // Drag and drop functionality
    if (uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults);
        });
        
        // Highlight drop area when dragging over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('highlight');
            });
        });
        
        // Remove highlight when dragging leaves drop area
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('highlight');
            });
        });
        
        // Handle file drop
        uploadArea.addEventListener('drop', handleFileDrop);
    }
    
    // Process files button
    if (processFilesBtn) {
        processFilesBtn.addEventListener('click', processFiles);
    }
    
    // Clear files button
    if (clearFilesBtn) {
        clearFilesBtn.addEventListener('click', clearFiles);
    }
    
    // Sample data button
    if (useSampleDataBtn) {
        useSampleDataBtn.addEventListener('click', loadSampleData);
    }
    
    // Analysis settings related event handlers will be initialized by the UI Analysis module
}

/**
 * Initialize UI components
 */
function initUIComponents() {
    // Dark mode toggle
    if (typeof initDarkMode === 'function') {
        initDarkMode();
    }
    
    // Mobile dashboard enhancements
    if (typeof initMobileDashboard === 'function') {
        initMobileDashboard();
    }
}

/**
 * Load additional modules
 */
function loadAdditionalModules() {
    // This function is a placeholder for any additional modules that might need to be loaded dynamically
}

// Prevent default behavior for events
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Handle files selected via the file input
function handleFilesSelected(e) {
    const files = e.target.files;
    addFilesToList(files);
}

// Handle files dropped onto the drop area
function handleFileDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    addFilesToList(files);
}

// Add files to the files list UI and storage
function addFilesToList(files) {
    if (!files || files.length === 0) return;
    
    const filesList = document.getElementById('files-list');
    const filesContainer = document.getElementById('files-container');
    
    // Show the files list
    if (filesList) {
        filesList.style.display = 'block';
    }
    
    // Process each file
    Array.from(files).forEach(file => {
        // Check if it's a CSV file
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            showNotification('Please upload only CSV files', 'error');
            return;
        }
        
        // Extract the keyword from the file name (before the extension)
        const fileName = file.name;
        const keyword = fileName.replace(/\.csv$/i, '').trim();
        
        // Create a file item element
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileName = fileName;
        fileItem.dataset.keyword = keyword;
        
        fileItem.innerHTML = `
            <span class="file-name">${fileName}</span>
            <span class="keyword-tag">${keyword}</span>
            <span class="remove-file" title="Remove file"><i class="fas fa-times"></i></span>
        `;
        
        // Add remove handler
        const removeButton = fileItem.querySelector('.remove-file');
        removeButton.addEventListener('click', () => {
            removeFile(fileItem, fileName, keyword);
        });
        
        // Add to UI
        if (filesContainer) {
            filesContainer.appendChild(fileItem);
        }
        
        // Add to data store
        MultiFileCore.addFile(file, keyword)
            .then(info => {
                console.log(`Added file: ${info.file.name} with ${info.count} listings`);
            })
            .catch(err => {
                console.error(`Error adding file: ${err.message}`);
                showNotification(`Error adding file: ${err.message}`, 'error');
                removeFile(fileItem, fileName, keyword);
            });
    });
    
    // Reset the file input
    const fileInput = document.getElementById('csv-files-upload');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Update the process button state
    updateProcessButtonState();
}

// Remove a file from the list and data store
function removeFile(fileItem, fileName, keyword) {
    // Remove from data store
    MultiFileCore.removeFile(fileName, keyword);
    
    // Remove from UI
    if (fileItem && fileItem.parentNode) {
        fileItem.parentNode.removeChild(fileItem);
    }
    
    // Hide the list if empty
    const filesList = document.getElementById('files-list');
    const filesContainer = document.getElementById('files-container');
    
    if (filesList && filesContainer && filesContainer.children.length === 0) {
        filesList.style.display = 'none';
    }
    
    // Update the process button state
    updateProcessButtonState();
}

// Clear all files
function clearFiles() {
    // Clear data store
    MultiFileCore.clearAll();
    
    // Clear UI
    const filesList = document.getElementById('files-list');
    const filesContainer = document.getElementById('files-container');
    
    if (filesContainer) {
        filesContainer.innerHTML = '';
    }
    
    if (filesList) {
        filesList.style.display = 'none';
    }
    
    // Update the process button state
    updateProcessButtonState();
}

// Update the state of the process button based on file count
function updateProcessButtonState() {
    const filesContainer = document.getElementById('files-container');
    const processFilesBtn = document.getElementById('process-files');
    
    if (processFilesBtn && filesContainer) {
        const fileCount = filesContainer.children.length;
        processFilesBtn.disabled = fileCount === 0;
    }
}

// Process files for analysis
function processFiles() {
    // Show loading state
    showLoading('Processing files for analysis...');
    
    // Get all files data
    const allListings = MultiFileCore.getAllListings();
    
    // Check if we have listings
    if (!allListings || allListings.length === 0) {
        hideLoading();
        showNotification('No data to analyze. Please add files first.', 'error');
        return;
    }
    
    // Update progress
    updateProgress(20, 'Scoring listings...');
    
    // Get UI settings
    const settings = getUISettings();
    
    // Update the core settings
    MultiFileCore.updateSettings(settings);
    
    // Score and rank the listings
    const scoredListings = MultiFileRanking.scoreAndRankListings(allListings, settings);
    
    updateProgress(40, 'Generating ABC lists...');
    
    // Get listings by keyword
    const keywordFiles = MultiFileCore.getKeywordFiles();
    const listingsByKeyword = {};
    
    keywordFiles.forEach(kf => {
        listingsByKeyword[kf.keyword] = MultiFileCore.getListingsByKeyword(kf.keyword);
    });
    
    // Generate A/B/C lists
    const { aList, bList, cList, selectionStats } = 
        MultiFileRanking.generateABCLists(scoredListings, listingsByKeyword, settings);
    
    // Store results in window object for access by other components
    window.analysisResults = {
        aList,
        bList,
        cList,
        allScored: scoredListings,
        stats: selectionStats
    };
    
    updateProgress(60, 'Rendering results...');
    
    // Display lists
    renderLists(aList, bList, cList);
    
    updateProgress(80, 'Creating visualizations...');
    
    // Create visualizations
    createVisualizations(aList, bList, cList, scoredListings, selectionStats);
    
    updateProgress(90, 'Generating insights...');
    
    // Generate insights
    generateInsights(aList, bList, cList, scoredListings, selectionStats);
    
    // Complete
    updateProgress(100, 'Analysis complete!');
    
    // Show success and reveal dashboard
    setTimeout(() => {
        showSuccessMessage();
        showResultsDashboard();
    }, 500);
}

// Show loading state
function showLoading(message) {
    const loadingSection = document.getElementById('loading-section');
    const loadingMessage = document.getElementById('loading-message');
    const uploadContainer = document.getElementById('upload-container');
    
    if (loadingMessage) {
        const loadingText = loadingMessage.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message || 'Loading...';
        }
    }
    
    if (uploadContainer) {
        uploadContainer.style.display = 'none';
    }
    
    if (loadingMessage) {
        loadingMessage.style.display = 'block';
    }
}

// Hide loading state
function hideLoading() {
    const loadingMessage = document.getElementById('loading-message');
    const uploadContainer = document.getElementById('upload-container');
    
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
    
    if (uploadContainer) {
        uploadContainer.style.display = 'block';
    }
}

// Update progress bar
function updateProgress(percent, message) {
    const progressBar = document.getElementById('process-progress');
    const loadingText = document.querySelector('#loading-message p');
    
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.setAttribute('aria-valuenow', percent);
    }
    
    if (loadingText && message) {
        loadingText.textContent = message;
    }
}

// Show success message
function showSuccessMessage() {
    const successMessage = document.getElementById('success-message');
    if (successMessage) {
        successMessage.style.display = 'block';
    }
}

// Show results dashboard
function showResultsDashboard() {
    const loadingSection = document.getElementById('loading-section');
    const resultsDashboard = document.getElementById('results-dashboard');
    
    // Update stats
    updateDashboardStats();
    
    if (loadingSection) {
        loadingSection.style.display = 'none';
    }
    
    if (resultsDashboard) {
        resultsDashboard.style.display = 'block';
    }
}

// Update dashboard stats
function updateDashboardStats() {
    const stats = MultiFileCore.getStats();
    
    const fileCount = document.getElementById('files-count');
    const listingsCount = document.getElementById('listings-count');
    const avgSales = document.getElementById('avg-sales');
    
    if (fileCount) {
        fileCount.textContent = stats.fileCount;
    }
    
    if (listingsCount) {
        listingsCount.textContent = stats.listingCount.toLocaleString();
    }
    
    if (avgSales) {
        avgSales.textContent = stats.avgSales.toFixed(0);
    }
}

// Render the A/B/C lists
function renderLists(aList, bList, cList) {
    const aListContainer = document.getElementById('a-list-container');
    const bListContainer = document.getElementById('b-list-container');
    const cListContainer = document.getElementById('c-list-container');
    
    const aListTab = document.getElementById('a-list-tab');
    const bListTab = document.getElementById('b-list-tab');
    const cListTab = document.getElementById('c-list-tab');
    
    // Render lists (implementation will depend on UI design)
    // This is just a placeholder - the actual rendering will be done by specialized functions
    
    // Update tab counters
    if (aListTab) {
        aListTab.innerHTML = `<i class="fas fa-trophy text-success me-1"></i> A-List (${aList.length})`;
    }
    
    if (bListTab) {
        bListTab.innerHTML = `<i class="fas fa-star text-info me-1"></i> B-List (${bList.length})`;
    }
    
    if (cListTab) {
        cListTab.innerHTML = `<i class="fas fa-check-circle text-secondary me-1"></i> C-List (${cList.length})`;
    }
}

// Create visualizations for the analysis
function createVisualizations(aList, bList, cList, allScored, stats) {
    // Create keyword distribution chart
    if (typeof MultiFileVisualizations !== 'undefined' && 
        typeof MultiFileVisualizations.createKeywordDistributionChart === 'function') {
        MultiFileVisualizations.createKeywordDistributionChart(aList, stats);
    }
    
    // Create metrics comparison chart
    if (typeof MultiFileVisualizations !== 'undefined' && 
        typeof MultiFileVisualizations.createMetricsComparisonChart === 'function') {
        MultiFileVisualizations.createMetricsComparisonChart(aList, bList, cList);
    }
    
    // Create performance matrix chart
    if (typeof MultiFileVisualizations !== 'undefined' && 
        typeof MultiFileVisualizations.createPerformanceMatrixChart === 'function') {
        MultiFileVisualizations.createPerformanceMatrixChart(allScored, aList, bList, cList);
    }
}

// Generate insights based on analysis results
function generateInsights(aList, bList, cList, allScored, stats) {
    const insightsContainer = document.getElementById('analysis-insights');
    if (!insightsContainer) return;
    
    // Clear existing insights
    insightsContainer.innerHTML = '';
    
    // Add loading indicator
    insightsContainer.innerHTML = '<div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div> Generating insights...';
    
    // Generate insights (placeholder for now)
    setTimeout(() => {
        // This is a placeholder for actual insight generation logic
        const insights = [
            'Top performing listings show strong correlation between price and conversion rate',
            `${stats.keywordDistribution ? Object.keys(stats.keywordDistribution)[0] : 'Leading keyword'} has the highest representation in A-list items`,
            'A-list items have 35% higher daily views percentage compared to B-list items',
            'Consider focusing on listings with both high revenue and visibility metrics',
            'Most successful listings feature high-quality imagery and detailed descriptions'
        ];
        
        // Clear loading indicator
        insightsContainer.innerHTML = '';
        
        // Add insights
        const insightsList = document.createElement('ul');
        insightsList.className = 'insights-list';
        
        insights.forEach(insight => {
            const li = document.createElement('li');
            li.className = 'mb-2';
            li.innerHTML = `<i class="fas fa-lightbulb text-warning me-2"></i> ${insight}`;
            insightsList.appendChild(li);
        });
        
        insightsContainer.appendChild(insightsList);
    }, 1000);
}

// Get UI settings
function getUISettings() {
    // Get weights
    const weights = {
        revenue: 0.35,
        sales: 0.20,
        dailyViews: 0.15,
        efficiency: 0.15,
        hearts: 0.10,
        age: 0.05
    };
    
    // Get weight elements
    const weightRevenue = document.getElementById('weight-revenue');
    const weightSales = document.getElementById('weight-sales');
    const weightViews = document.getElementById('weight-views');
    const weightEfficiency = document.getElementById('weight-efficiency');
    const weightHearts = document.getElementById('weight-hearts');
    const weightAge = document.getElementById('weight-age');
    
    // Update weights if elements exist
    if (weightRevenue) weights.revenue = parseInt(weightRevenue.value) / 100;
    if (weightSales) weights.sales = parseInt(weightSales.value) / 100;
    if (weightViews) weights.dailyViews = parseInt(weightViews.value) / 100;
    if (weightEfficiency) weights.efficiency = parseInt(weightEfficiency.value) / 100;
    if (weightHearts) weights.hearts = parseInt(weightHearts.value) / 100;
    if (weightAge) weights.age = parseInt(weightAge.value) / 100;
    
    // Normalize weights to ensure they sum to 1
    const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (weightSum > 0) {
        Object.keys(weights).forEach(key => {
            weights[key] = weights[key] / weightSum;
        });
    }
    
    // Get tier thresholds
    const tierThresholds = {
        highRevenue: 15,
        conversion: 50,
        growth: 20,
        visibility: 20
    };
    
    // Get threshold elements
    const tierHighRevenue = document.getElementById('tier-high-revenue');
    const tierConversion = document.getElementById('tier-conversion');
    const tierGrowth = document.getElementById('tier-growth');
    const tierVisibility = document.getElementById('tier-visibility');
    
    // Update thresholds if elements exist
    if (tierHighRevenue) tierThresholds.highRevenue = parseInt(tierHighRevenue.value);
    if (tierConversion) tierThresholds.conversion = parseInt(tierConversion.value);
    if (tierGrowth) tierThresholds.growth = parseInt(tierGrowth.value);
    if (tierVisibility) tierThresholds.visibility = parseInt(tierVisibility.value);
    
    // Get normalization method
    let normalization = 'percentile';
    const normalizeMethod = document.getElementById('normalize-method');
    if (normalizeMethod) {
        normalization = normalizeMethod.value;
    }
    
    // Get selection strategy
    let selectionStrategy = 'balanced';
    const strategySelect = document.getElementById('selection-strategy');
    if (strategySelect) {
        selectionStrategy = strategySelect.value;
    }
    
    return {
        weights,
        tierThresholds,
        normalization,
        selectionStrategy
    };
}

// Load sample data for testing
function loadSampleData() {
    // Sample data files with keywords
    const sampleKeywords = [
        'digital download',
        'personalized gift',
        'wall art',
        'printable planner',
        'handmade jewelry'
    ];
    
    // Show loading
    showLoading('Loading sample data...');
    
    // Clear any existing files
    clearFiles();
    
    // Generate sample data for each keyword
    const promises = sampleKeywords.map(keyword => {
        // Create sample data
        const sampleData = generateSampleDataForKeyword(keyword);
        
        // Create a sample file object
        const sampleFile = {
            name: `${keyword}.csv`,
            data: sampleData
        };
        
        // Add to data store
        return MultiFileCore.addFile(sampleFile, keyword);
    });
    
    // When all sample data is loaded
    Promise.all(promises)
        .then(results => {
            // Show the files in the UI
            results.forEach(info => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.dataset.fileName = info.file.name;
                fileItem.dataset.keyword = info.keyword;
                
                fileItem.innerHTML = `
                    <span class="file-name">${info.file.name}</span>
                    <span class="keyword-tag">${info.keyword}</span>
                    <span class="badge bg-info ms-2">${info.count} listings</span>
                    <span class="remove-file" title="Remove file"><i class="fas fa-times"></i></span>
                `;
                
                // Add remove handler
                const removeButton = fileItem.querySelector('.remove-file');
                removeButton.addEventListener('click', () => {
                    removeFile(fileItem, info.file.name, info.keyword);
                });
                
                // Add to UI
                const filesContainer = document.getElementById('files-container');
                if (filesContainer) {
                    filesContainer.appendChild(fileItem);
                }
            });
            
            // Show the files list
            const filesList = document.getElementById('files-list');
            if (filesList) {
                filesList.style.display = 'block';
            }
            
            // Update the process button state
            updateProcessButtonState();
            
            // Hide loading
            hideLoading();
            
            // Show success notification
            showNotification('Sample data loaded successfully!', 'success');
        })
        .catch(err => {
            console.error('Error loading sample data:', err);
            hideLoading();
            showNotification('Error loading sample data', 'error');
        });
}

// Generate sample data for a keyword
function generateSampleDataForKeyword(keyword) {
    // Number of listings to generate
    const listingCount = 50 + Math.floor(Math.random() * 50); // 50-100 listings
    
    // Generate listings
    const listings = [];
    
    for (let i = 0; i < listingCount; i++) {
        // Create shop name
        const shopName = `Shop${Math.floor(Math.random() * 1000)}${keyword.replace(/\s+/g, '')}`;
        
        // Create listing title with keyword
        const adjectives = ['Beautiful', 'Amazing', 'Premium', 'Custom', 'Unique', 'Handmade', 'High-Quality'];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const title = `${adjective} ${keyword} for ${['Home', 'Gift', 'Office', 'Wedding', 'Birthday'][Math.floor(Math.random() * 5)]}`;
        
        // Generate random metrics
        const listingAge = Math.floor(Math.random() * 365) + 1; // 1-365 days
        const totalViews = Math.floor(Math.random() * 10000) + 100; // 100-10000 views
        const dailyViews = Math.max(1, Math.floor(totalViews / listingAge)); // Calculate reasonable daily views
        const dailyViewsPct = (dailyViews / totalViews * 100).toFixed(2);
        const hearts = Math.floor(Math.random() * 500); // 0-500 hearts
        
        // Generate realistic price and sales data
        const price = (Math.random() * 100 + 5).toFixed(2); // $5-$105
        let sales = Math.floor(Math.random() * 100); // 0-100 sales
        
        // For some listings, make them high performers
        if (Math.random() < 0.2) { // 20% chance of being a high performer
            sales = Math.floor(Math.random() * 400) + 100; // 100-500 sales
        }
        
        // Calculate revenue
        const revenue = (price * sales).toFixed(2);
        
        // Create the listing object
        const listing = {
            'Shop Name': shopName,
            'Listing Title': title,
            'Listing Age (Days)': listingAge,
            'Total Views': totalViews,
            'Daily Views': dailyViews,
            'Daily Views %': dailyViewsPct,
            'Hearts': hearts,
            'Price': `$${price}`,
            'Est. Sales': sales,
            'Est. Revenue': `$${revenue}`
        };
        
        listings.push(listing);
    }
    
    return listings;
}

// Show a notification
function showNotification(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    
    // Fallback if showToast isn't available
    alert(message);
}
