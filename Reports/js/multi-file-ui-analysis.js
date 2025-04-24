/**
 * Multi-File UI Analysis Handler
 * Handles the analysis process and results visualization
 */

const MultiFileUIAnalysis = (function() {
    // Cache DOM elements
    const elements = {
        // Analysis Settings
        weightSliders: document.querySelectorAll('.weight-slider'),
        tierThresholdInputs: document.querySelectorAll('[id^="tier-"]'),
        normalizeMethod: document.getElementById('normalize-method'),
        selectionStrategy: document.getElementById('selection-strategy'),
        recalculateBtn: document.getElementById('recalculate-analysis'),
        resetSettingsBtn: document.getElementById('reset-settings'),
        
        // Results Tabs
        resultsTabs: document.getElementById('resultsTabs'),
        aListTab: document.getElementById('a-list-tab'),
        bListTab: document.getElementById('b-list-tab'),
        cListTab: document.getElementById('c-list-tab'),
        summaryTab: document.getElementById('summary-tab'),
        
        // List Containers
        aListContainer: document.getElementById('a-list-container'),
        bListContainer: document.getElementById('b-list-container'),
        cListContainer: document.getElementById('c-list-container'),
        
        // Export Buttons
        exportReport: document.getElementById('export-report'),
        exportAList: document.getElementById('export-a-list'),
        exportBList: document.getElementById('export-b-list'),
        exportCList: document.getElementById('export-c-list'),
        
        // Detail View Buttons
        viewADetails: document.getElementById('view-a-list-details'),
        viewBDetails: document.getElementById('view-b-list-details'),
        viewCDetails: document.getElementById('view-c-list-details'),
        
        // Charts
        keywordDistChart: document.getElementById('keyword-distribution-chart'),
        metricsComparisonChart: document.getElementById('metrics-comparison-chart'),
        performanceMatrixChart: document.getElementById('performance-matrix-chart'),
        xAxisMatrix: document.getElementById('x-axis-matrix'),
        yAxisMatrix: document.getElementById('y-axis-matrix'),
        
        // Insights
        analysisInsights: document.getElementById('analysis-insights')
    };
    
    // Store analysis results
    let analysisResults = {
        aList: [],
        bList: [],
        cList: [],
        stats: {}
    };
    
    // Store chart objects for updating
    let charts = {
        keywordDistribution: null,
        metricsComparison: null,
        performanceMatrix: null
    };
    
    /**
     * Initialize analysis UI handlers
     */
    function initAnalysisUI() {
        // Set up the weight sliders to update their labels
        elements.weightSliders.forEach(slider => {
            slider.addEventListener('input', updateWeightLabels);
        });
        
        // Recalculate button
        if (elements.recalculateBtn) {
            elements.recalculateBtn.addEventListener('click', recalculateAnalysis);
        }
        
        // Reset settings button
        if (elements.resetSettingsBtn) {
            elements.resetSettingsBtn.addEventListener('click', resetSettings);
        }
        
        // Matrix axis selectors
        if (elements.xAxisMatrix && elements.yAxisMatrix) {
            elements.xAxisMatrix.addEventListener('change', updatePerformanceMatrix);
            elements.yAxisMatrix.addEventListener('change', updatePerformanceMatrix);
        }
        
        // Export buttons
        if (elements.exportReport) {
            elements.exportReport.addEventListener('click', exportFullReport);
        }
        
        if (elements.exportAList) {
            elements.exportAList.addEventListener('click', () => exportList('a'));
        }
        
        if (elements.exportBList) {
            elements.exportBList.addEventListener('click', () => exportList('b'));
        }
        
        if (elements.exportCList) {
            elements.exportCList.addEventListener('click', () => exportList('c'));
        }
        
        // Detail view buttons
        if (elements.viewADetails) {
            elements.viewADetails.addEventListener('click', () => showListDetails('a'));
        }
        
        if (elements.viewBDetails) {
            elements.viewBDetails.addEventListener('click', () => showListDetails('b'));
        }
        
        if (elements.viewCDetails) {
            elements.viewCDetails.addEventListener('click', () => showListDetails('c'));
        }
    }
    
    /**
     * Update the weight labels when sliders change
     */
    function updateWeightLabels() {
        // Get all slider values
        const weights = {};
        let weightSum = 0;
        
        elements.weightSliders.forEach(slider => {
            const id = slider.id.replace('weight-', '');
            const value = parseInt(slider.value, 10);
            weights[id] = value;
            weightSum += value;
        });
        
        // Normalize weights
        elements.weightSliders.forEach(slider => {
            const id = slider.id.replace('weight-', '');
            const normalizedValue = weightSum > 0 ? Math.round((weights[id] / weightSum) * 100) : 0;
            
            // Update slider label
            const label = slider.previousElementSibling;
            if (label) {
                const baseLabelText = label.textContent.split('(')[0].trim();
                label.textContent = `${baseLabelText} (${normalizedValue}%)`;
            }
        });
    }
    
    /**
     * Process files for analysis
     */
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
        
        // Get settings
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
        
        // Store results
        analysisResults = {
            aList,
            bList,
            cList,
            allScored: scoredListings,
            stats: selectionStats
        };
        
        updateProgress(60, 'Rendering results...');
        
        // Display lists
        renderLists();
        
        updateProgress(80, 'Creating visualizations...');
        
        // Create visualizations
        createVisualizations();
        
        updateProgress(90, 'Generating insights...');
        
        // Generate insights
        generateInsights();
        
        // Complete
        updateProgress(100, 'Analysis complete!');
        
        // Show success and reveal dashboard
        setTimeout(() => {
            showSuccessMessage();
            showResultsDashboard();
        }, 500);
    }
    
    /**
     * Recalculate the analysis with current settings
     */
    function recalculateAnalysis() {
        // Show loading state on the button
        if (elements.recalculateBtn) {
            const originalText = elements.recalculateBtn.textContent;
            elements.recalculateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Recalculating...';
            elements.recalculateBtn.disabled = true;
            
            // Short delay to allow the UI to update
            setTimeout(() => {
                // Get all files data
                const allListings = MultiFileCore.getAllListings();
                
                // Get settings
                const settings = getUISettings();
                
                // Update the core settings
                MultiFileCore.updateSettings(settings);
                
                // Score and rank the listings
                const scoredListings = MultiFileRanking.scoreAndRankListings(allListings, settings);
                
                // Get listings by keyword
                const keywordFiles = MultiFileCore.getKeywordFiles();
                const listingsByKeyword = {};
                
                keywordFiles.forEach(kf => {
                    listingsByKeyword[kf.keyword] = MultiFileCore.getListingsByKeyword(kf.keyword);
                });
                
                // Generate A/B/C lists
                const { aList, bList, cList, selectionStats } = 
                    MultiFileRanking.generateABCLists(scoredListings, listingsByKeyword, settings);
                
                // Store results
                analysisResults = {
                    aList,
                    bList,
                    cList,
                    allScored: scoredListings,
                    stats: selectionStats
                };
                
                // Display lists
                renderLists();
                
                // Update visualizations
                updateVisualizations();
                
                // Generate new insights
                generateInsights();
                
                // Restore button
                elements.recalculateBtn.innerHTML = originalText;
                elements.recalculateBtn.disabled = false;
                
                // Show success notification
                showNotification('Analysis recalculated with new settings', 'success');
            }, 100);
        }
    }
    
    /**
     * Reset settings to default values
     */
    function resetSettings() {
        // Reset weight sliders
        elements.weightSliders.forEach(slider => {
            const id = slider.id.replace('weight-', '');
            switch (id) {
                case 'revenue': slider.value = 35; break;
                case 'sales': slider.value = 20; break;
                case 'views': slider.value = 15; break;
                case 'efficiency': slider.value = 15; break;
                case 'hearts': slider.value = 10; break;
                case 'age': slider.value = 5; break;
                default: slider.value = 0;
            }
        });
        
        // Reset tier thresholds
        elements.tierThresholdInputs.forEach(input => {
            const id = input.id.replace('tier-', '');
            switch (id) {
                case 'high-revenue': input.value = 15; break;
                case 'conversion': input.value = 50; break;
                case 'growth': input.value = 20; break;
                case 'visibility': input.value = 20; break;
                default: input.value = 0;
            }
        });
        
        // Reset normalization method
        if (elements.normalizeMethod) {
            elements.normalizeMethod.value = 'percentile';
        }
        
        // Reset selection strategy
        if (elements.selectionStrategy) {
            elements.selectionStrategy.value = 'balanced';
        }
        
        // Update weight labels
        updateWeightLabels();
        
        // Show notification
        showNotification('Settings reset to defaults', 'info');
    }
    
    /**
     * Get current settings from UI
     */
    function getUISettings() {
        // Get weights
        const weights = {};
        let weightSum = 0;
        
        elements.weightSliders.forEach(slider => {
            const id = slider.id.replace('weight-', '');
            const value = parseInt(slider.value, 10);
            weights[id] = value;
            weightSum += value;
        });
        
        // Normalize weights
        Object.keys(weights).forEach(key => {
            weights[key] = weightSum > 0 ? weights[key] / weightSum : 0;
        });
        
        // Get tier thresholds
        const tierThresholds = {};
        
        elements.tierThresholdInputs.forEach(input => {
            const id = input.id.replace('tier-', '');
            tierThresholds[id] = parseInt(input.value, 10);
        });
        
        // Get normalization method
        const normalization = elements.normalizeMethod ? 
            elements.normalizeMethod.value : 'percentile';
        
        // Get selection strategy
        const selectionStrategy = elements.selectionStrategy ? 
            elements.selectionStrategy.value : 'balanced';
        
        return {
            weights,
            tierThresholds,
            normalization,
            selectionStrategy
        };
    }
    
    /**
     * Render the A/B/C lists
     */
    function renderLists() {
        // Render A List
        renderListItems(elements.aListContainer, analysisResults.aList, 'a');
        
        // Render B List
        renderListItems(elements.bListContainer, analysisResults.bList, 'b');
        
        // Render C List
        renderListItems(elements.cListContainer, analysisResults.cList, 'c');
        
        // Update tab counters
        elements.aListTab.innerHTML = `<i class="fas fa-trophy text-success me-1"></i> A-List (${analysisResults.aList.length})`;
        elements.bListTab.innerHTML = `<i class="fas fa-star text-info me-1"></i> B-List (${analysisResults.bList.length})`;
        elements.cListTab.innerHTML = `<i class="fas fa-check-circle text-secondary me-1"></i> C-List (${analysisResults.cList.length})`;
    }
    
    /**
     * Render list items for a container
     */
    function renderListItems(container, items, listType) {
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        if (!items || items.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5"><p>No items to display</p></div>';
            return;
        }
        
        // Get badge class based on list type
        let badgeClass = 'bg-success';
        if (listType === 'b') badgeClass = 'bg-info';
        if (listType === 'c') badgeClass = 'bg-secondary';
        
        // Render each item as a card
        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'col-md-4 mb-4';
            
            // Format numbers
            const revenue = typeof item['Est. Revenue'] === 'string' ? 
                item['Est. Revenue'] : 
                `$${item['Est. Revenue'].toFixed(2)}`;
                
            const price = typeof item['Price'] === 'string' ? 
                item['Price'] : 
                `$${item['Price'].toFixed(2)}`;
            
            // Get tier badges
            const tierBadges = item.performanceTiers.map(tier => {
                let badgeText = '';
                let badgeType = 'secondary';
                
                switch (tier) {
                    case 'highRevenue': 
                        badgeText = 'High Revenue'; 
                        badgeType = 'success';
                        break;
                    case 'conversionChampion': 
                        badgeText = 'Conversion Champion'; 
                        badgeType = 'primary';
                        break;
                    case 'growthPerformer': 
                        badgeText = 'Growth'; 
                        badgeType = 'info';
                        break;
                    case 'visibilityChampion': 
                        badgeText = 'Visibility'; 
                        badgeType = 'warning';
                        break;
                    case 'priceOptimizer': 
                        badgeText = 'Price Optimizer'; 
                        badgeType = 'danger';
                        break;
                    case 'risingStar': 
                        badgeText = 'Rising Star'; 
                        badgeType = 'dark';
                        break;
                    default: 
                        badgeText = tier;
                }
                
                return `<span class="badge bg-${badgeType} me-1">${badgeText}</span>`;
            }).join('');
            
            card.innerHTML = `
                <div class="card h-100 ranking-card">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge ${badgeClass}">#${index + 1}</span>
                            <span class="badge bg-light text-dark">${item.keyword}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title text-truncate" title="${item['Listing Title']}">${item['Listing Title']}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${item['Shop Name']}</h6>
                        
                        <div class="row mt-3">
                            <div class="col-6">
                                <p class="card-text text-nowrap"><small>Revenue:</small> <strong>${revenue}</strong></p>
                            </div>
                            <div class="col-6">
                                <p class="card-text text-nowrap"><small>Sales:</small> <strong>${item['Est. Sales']}</strong></p>
                            </div>
                            <div class="col-6">
                                <p class="card-text text-nowrap"><small>Price:</small> <strong>${price}</strong></p>
                            </div>
                            <div class="col-6">
                                <p class="card-text text-nowrap"><small>Views:</small> <strong>${item['Total Views']}</strong></p>
                            </div>
                        </div>
                        
                        <div class="mt-3">
                            <p class="card-text"><small>Performance Tiers:</small></p>
                            <div class="tier-badges">
                                ${tierBadges || '<span class="badge bg-light text-dark">None</span>'}
                            </div>
                        </div>
                        
                        <div class="mt-3">
                            <p class="mb-1"><small>Composite Score:</small> <strong>${item.compositeScore.toFixed(1)}</strong></p>
                            <div class="score-indicator">
                                <div class="score-bar composite-score-bar" style="width: ${item.compositeScore}%"></div>
                            </div>
                            
                            <p class="mb-1 mt-2"><small>Opportunity Score:</small> <strong>${item.opportunityScore.toFixed(1)}</strong></p>
                            <div class="score-indicator">
                                <div class="score-bar opportunity-score-bar" style="width: ${item.opportunityScore}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
    }
    
    /**
     * Create visualizations for the analysis
     */
    function createVisualizations() {
        createKeywordDistributionChart();
        createMetricsComparisonChart();
        createPerformanceMatrixChart();
    }
    
    /**
     * Update all visualizations with current data
     */
    function updateVisualizations() {
        updateKeywordDistributionChart();
        updateMetricsComparisonChart();
        updatePerformanceMatrix();
    }
