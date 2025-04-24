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
 * Update dashboard stats
 */
function updateDashboardStats(aList, bList, cList, allListings) {
    const fileCountEl = document.getElementById('files-count');
    const listingsCountEl = document.getElementById('listings-count');
    const avgSalesEl = document.getElementById('avg-sales');
    
    // Get files count from core module
    const keywordFiles = MultiFileCore.getKeywordFiles();
    
    if (fileCountEl) {
        fileCountEl.textContent = keywordFiles.length;
    }
    
    // Total listings count
    if (listingsCountEl) {
        listingsCountEl.textContent = allListings ? allListings.length : 0;
    }
    
    // Calculate average sales across all files
    if (avgSalesEl && allListings && allListings.length > 0) {
        const totalSales = allListings.reduce((sum, item) => sum + (item['Est. Sales'] || 0), 0);
        const avgSales = totalSales / allListings.length;
        avgSalesEl.textContent = avgSales.toFixed(1);
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
