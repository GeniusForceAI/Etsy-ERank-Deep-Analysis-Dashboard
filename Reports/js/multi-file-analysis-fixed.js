/**
 * Multi-File Analysis Dashboard Main Controller
 * Coordinates all modules for the multi-file analysis dashboard
 */

// Make processFiles global for access from the UI
window.processFiles = function() {
    // Show loading state
    showLoading('Processing files for analysis...');
    
    // Get all files data
    const allListings = MultiFileCore.getAllListings();
    
    // Update progress
    updateProgress(20, 'Analyzing listings...');
    
    // Get settings from UI
    const settings = MultiFileUIAnalysis.getUISettings();
    
    // Update the core settings
    MultiFileCore.updateSettings(settings);
    
    // Score and rank the listings
    const scoredListings = MultiFileRanking.scoreAndRankListings(allListings, settings);
    
    updateProgress(50, 'Generating lists...');
    
    // Get listings by keyword
    const keywordFiles = MultiFileCore.getKeywordFiles();
    const listingsByKeyword = {};
    
    keywordFiles.forEach(kf => {
        listingsByKeyword[kf.keyword] = MultiFileCore.getListingsByKeyword(kf.keyword);
    });
    
    // Generate A/B/C lists
    const { aList, bList, cList, selectionStats } = 
        MultiFileRanking.generateABCLists(scoredListings, listingsByKeyword, settings);
    
    updateProgress(70, 'Creating visualizations...');
    
    // Generate keyword distribution for charts
    const keywordDistribution = {};
    // Count occurrences of each keyword in the A list
    aList.forEach(item => {
        if (!keywordDistribution[item.keyword]) {
            keywordDistribution[item.keyword] = 0;
        }
        keywordDistribution[item.keyword]++;
    });
    
    // Enhanced stats with the data needed by the visualizations
    const enhancedStats = {
        ...selectionStats,
        keywordDistribution: keywordDistribution
    };
    
    // Store results in global variable for access by charts
    window.analysisResults = {
        aList,
        bList,
        cList,
        allScored: scoredListings,
        stats: enhancedStats
    };
    
    // Display lists through the UI module
    MultiFileUIAnalysis.renderLists();
    
    updateProgress(80, 'Updating dashboard...');
    
    // Update dashboard stats
    updateDashboardStats(aList, bList, cList, allListings);
    
    // Create visualizations
    MultiFileUIAnalysis.createVisualizations();
    
    updateProgress(90, 'Generating insights...');
    
    // Generate insights
    MultiFileUIAnalysis.generateInsights();
    
    updateProgress(100, 'Complete!');
    
    // Show success message
    setTimeout(() => {
        showSuccessMessage();
        showResultsDashboard();
    }, 500);
};

/**
 * Show loading state with optional message
 */
function showLoading(message) {
    const loadingMessage = document.getElementById('loading-message');
    const uploadContainer = document.getElementById('upload-container');
    
    if (uploadContainer) uploadContainer.style.display = 'none';
    
    if (loadingMessage) {
        loadingMessage.style.display = 'block';
        
        const loadingText = loadingMessage.querySelector('p');
        if (loadingText) loadingText.textContent = message || 'Loading...';
    }
}

/**
 * Hide loading state
 */
function hideLoading() {
    const loadingMessage = document.getElementById('loading-message');
    const uploadContainer = document.getElementById('upload-container');
    
    if (uploadContainer) uploadContainer.style.display = 'block';
    
    if (loadingMessage) loadingMessage.style.display = 'none';
}

/**
 * Update progress bar
 */
function updateProgress(percent, message) {
    const processProgress = document.getElementById('process-progress');
    const progressMessage = document.getElementById('progress-message');
    
    if (processProgress) {
        processProgress.style.width = `${percent}%`;
        processProgress.setAttribute('aria-valuenow', percent);
    }
    
    if (progressMessage) {
        progressMessage.textContent = message || '';
    }
}

/**
 * Show success message
 */
function showSuccessMessage() {
    const successMessage = document.getElementById('success-message');
    if (successMessage) successMessage.style.display = 'block';
}

/**
 * Show results dashboard
 */
function showResultsDashboard() {
    const loadingSection = document.getElementById('loading-section');
    const resultsDashboard = document.getElementById('results-dashboard');
    
    if (loadingSection) {
        loadingSection.style.display = 'none';
    }
    
    if (resultsDashboard) {
        resultsDashboard.style.display = 'block';
    }
    
    // Scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Update dashboard stats with market insights
 */
function updateDashboardStats(aList, bList, cList, allListings) {
    const dailyViewsEl = document.getElementById('daily-views');
    const viewsPerSaleEl = document.getElementById('views-per-sale');
    const marketRevenueEl = document.getElementById('market-revenue');
    
    // Get files count from core module
    const keywordFiles = MultiFileCore.getKeywordFiles();
    
    // Only proceed if we have listings data
    if (!allListings || allListings.length === 0) return;
    
    // Calculate daily market views
    if (dailyViewsEl) {
        const totalDailyViews = allListings.reduce((sum, item) => {
            // Some listings may have daily views stored in different fields
            const views = item['Daily Views'] || item['Views Daily'] || item['Daily Traffic'] || 0;
            return sum + (parseFloat(views) || 0);
        }, 0);
        
        // Format with commas for thousands
        dailyViewsEl.textContent = totalDailyViews.toLocaleString();
    }
    
    // Calculate average views per sale ratio
    if (viewsPerSaleEl) {
        // Two calculation approaches - method 1 is to calculate per-listing views/sale first, then average
        // Method 2 is to total all views and sales, then divide - we'll use method 1 for better accuracy
        
        // Method 1: Calculate views/sale for each listing, then average them
        let listingViewsPerSale = [];
        
        allListings.forEach(item => {
            // Get views and sales data, checking multiple possible field names
            const monthlyViews = parseFloat(item['Monthly Views'] || item['Views Monthly'] || item['Monthly Traffic'] || 0) || 0;
            const dailyViews = parseFloat(item['Daily Views'] || item['Views Daily'] || item['Daily Traffic'] || 0) || 0;
            
            // Use monthly views if available, otherwise multiply daily by 30
            const views = monthlyViews > 0 ? monthlyViews : (dailyViews * 30);
            
            const sales = parseFloat(item['Est. Sales'] || item['Monthly Sales'] || 0) || 0;
            
            // Only include listings that have both views and sales data
            if (views > 0 && sales > 0) {
                const ratio = views / sales;
                listingViewsPerSale.push(ratio);
            }
        });
        
        // Calculate the average views per sale across all listings
        if (listingViewsPerSale.length > 0) {
            const totalRatio = listingViewsPerSale.reduce((sum, ratio) => sum + ratio, 0);
            const avgViewsPerSale = totalRatio / listingViewsPerSale.length;
            viewsPerSaleEl.textContent = avgViewsPerSale.toFixed(1);
        } else {
            viewsPerSaleEl.textContent = 'N/A';
        }
    }
    
    // Calculate estimated market revenue
    if (marketRevenueEl) {
        const totalRevenue = allListings.reduce((sum, item) => {
            // Handle price safely - might be string, number, or undefined
            let price = 0;
            if (item['Price']) {
                // If price is a string (e.g. '$24.99'), clean it
                if (typeof item['Price'] === 'string') {
                    price = parseFloat(item['Price'].replace(/[^0-9.]/g, '')) || 0;
                } else {
                    // If price is already a number
                    price = parseFloat(item['Price']) || 0;
                }
            }
            
            const sales = parseFloat(item['Est. Sales'] || item['Monthly Sales'] || 0) || 0;
            return sum + (price * sales);
        }, 0);
        
        // Format as currency with $ sign and commas
        marketRevenueEl.textContent = '$' + totalRevenue.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
}

/**
 * Show a notification/toast
 */
window.showToast = function(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        // Create toast container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }
    
    // Create a new toast
    const toastId = `toast-${Date.now()}`;
    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center border-0 show`;
    toastElement.role = 'alert';
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    toastElement.id = toastId;
    
    // Set background color based on type
    let bgClass = 'bg-info';
    let iconClass = 'fa-info-circle';
    
    switch (type) {
        case 'success':
            bgClass = 'bg-success';
            iconClass = 'fa-check-circle';
            break;
        case 'error':
            bgClass = 'bg-danger';
            iconClass = 'fa-exclamation-circle';
            break;
        case 'warning':
            bgClass = 'bg-warning';
            iconClass = 'fa-exclamation-triangle';
            break;
    }
    
    toastElement.classList.add('text-white');
    toastElement.classList.add(bgClass);
    
    toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas ${iconClass} me-2"></i> ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // Add to container
    const containerElement = document.getElementById('toast-container');
    containerElement.appendChild(toastElement);
    
    // Initialize via Bootstrap's API
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 5000
    });
    
    // Show the toast
    toast.show();
    
    // Remove after hiding
    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
};

// Initialize when document is ready
$(document).ready(function() {
    // MultiFileUI is already initialized in its own file via DOMContentLoaded
    // No need to initialize it again here - this was causing duplicate event handlers
    console.log('MultiFileUI initialization skipped in multi-file-analysis-fixed.js to prevent duplicate event handlers');
    
    if (typeof MultiFileUIAnalysis !== 'undefined' && typeof MultiFileUIAnalysis.init === 'function') {
        MultiFileUIAnalysis.init();
    } else {
        console.error('MultiFileUIAnalysis module not found');
    }
    
    // Dark mode toggle
    if (typeof initDarkMode === 'function') {
        initDarkMode();
    }
    
    // Mobile dashboard enhancements
    if (typeof initMobileDashboard === 'function') {
        initMobileDashboard();
    }
    
    console.log('Multi-file analysis dashboard initialized');
});
