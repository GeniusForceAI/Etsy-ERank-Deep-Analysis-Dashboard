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
    
    /**
     * Set the analysis results from external data
     * This is crucial for syncing with data processed in other modules
     */
    function setAnalysisResults(results) {
        console.log('Setting analysis results from external source:', results);
        if (results) {
            analysisResults = results;
        } else if (window.analysisResults) {
            // Try to get from global scope if direct results not provided
            console.log('Using global analysisResults instead');
            analysisResults = window.analysisResults;
        }
    }
    
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
     * Sort a list of items by a specified field
     * @param {Array} items - List to sort
     * @param {string} field - Field to sort by
     * @param {string} direction - 'asc' or 'desc'
     * @returns {Array} - Sorted list
     */
    function sortItemsByField(items, field, direction = 'desc') {
        return [...items].sort((a, b) => {
            let valueA = a[field];
            let valueB = b[field];
            
            // Handle special fields
            if (field === 'compositeScore' || field === 'opportunityScore') {
                valueA = a[field] || 0;
                valueB = b[field] || 0;
            }
            // Handle currency fields
            else if (field === 'Price' || field === 'Est. Revenue') {
                valueA = typeof a[field] === 'string' ? parseFloat(a[field].replace(/[^0-9.]/g, '')) : a[field] || 0;
                valueB = typeof b[field] === 'string' ? parseFloat(b[field].replace(/[^0-9.]/g, '')) : b[field] || 0;
            }
            // Handle numeric fields
            else {
                valueA = Number(valueA) || 0;
                valueB = Number(valueB) || 0;
            }
            
            // Sort based on direction
            if (direction === 'asc') {
                return valueA - valueB;
            } else {
                return valueB - valueA;
            }
        });
    }

    /**
     * Render the A/B/C lists
     */
    function renderLists() {
        // Add sorting controls if they don't exist
        addSortingControls();
        
        // Get current sort settings
        const sortField = localStorage.getItem('listSortField') || 'compositeScore';
        const sortDirection = localStorage.getItem('listSortDirection') || 'desc';
        
        // Sort the lists
        const sortedAList = sortItemsByField(analysisResults.aList, sortField, sortDirection);
        const sortedBList = sortItemsByField(analysisResults.bList, sortField, sortDirection);
        const sortedCList = sortItemsByField(analysisResults.cList, sortField, sortDirection);
        
        // Render the sorted lists
        renderListItems(elements.aListContainer, sortedAList, 'a');
        renderListItems(elements.bListContainer, sortedBList, 'b');
        renderListItems(elements.cListContainer, sortedCList, 'c');
        
        // Update tab counters
        elements.aListTab.innerHTML = `<i class="fas fa-trophy text-success me-1"></i> A-List (${analysisResults.aList.length})`;
        elements.bListTab.innerHTML = `<i class="fas fa-star text-info me-1"></i> B-List (${analysisResults.bList.length})`;
        elements.cListTab.innerHTML = `<i class="fas fa-check-circle text-secondary me-1"></i> C-List (${analysisResults.cList.length})`;
        
        // Update the sort indicators
        updateSortIndicators(sortField, sortDirection);
    }
    
    /**
     * Add sorting controls to each list tab
     */
    function addSortingControls() {
        // Only add once
        if (document.getElementById('sort-controls')) return;
        
        // Create sort controls
        const sortControls = document.createElement('div');
        sortControls.id = 'sort-controls';
        sortControls.className = 'sort-controls mt-3 mb-2';
        sortControls.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="me-2">
                    <label for="sort-by" class="form-label mb-0"><small>Sort by:</small></label>
                </div>
                <div class="me-2">
                    <select id="sort-by" class="form-select form-select-sm">
                        <option value="compositeScore">Composite Score</option>
                        <option value="opportunityScore">Opportunity Score</option>
                        <option value="Est. Revenue">Revenue</option>
                        <option value="Est. Sales">Sales</option>
                        <option value="Total Views">Views</option>
                        <option value="Price">Price</option>
                        <option value="Hearts">Hearts</option>
                        <option value="Listing Age (Days)">Age</option>
                        <option value="Daily Views">Daily Views</option>
                        <option value="Views Per Sale">Views/Sale</option>
                    </select>
                </div>
                <div>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm btn-outline-secondary sort-direction" data-direction="desc" title="Descending (High to Low)">
                            <i class="fas fa-sort-amount-down"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary sort-direction" data-direction="asc" title="Ascending (Low to High)">
                            <i class="fas fa-sort-amount-up"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to each tab content
        const tabContents = document.querySelectorAll('.tab-pane');
        tabContents.forEach(tabContent => {
            const existingSortControls = tabContent.querySelector('.sort-controls');
            if (!existingSortControls) {
                tabContent.insertBefore(sortControls.cloneNode(true), tabContent.firstChild);
            }
        });
        
        // Add event listeners to sort controls
        document.querySelectorAll('#sort-by').forEach(select => {
            select.addEventListener('change', function() {
                localStorage.setItem('listSortField', this.value);
                renderLists();
            });
        });
        
        document.querySelectorAll('.sort-direction').forEach(button => {
            button.addEventListener('click', function() {
                localStorage.setItem('listSortDirection', this.dataset.direction);
                renderLists();
            });
        });
        
        // Set initial values from localStorage or defaults
        const sortField = localStorage.getItem('listSortField') || 'compositeScore';
        const sortDirection = localStorage.getItem('listSortDirection') || 'desc';
        
        document.querySelectorAll('#sort-by').forEach(select => {
            select.value = sortField;
        });
        
        updateSortIndicators(sortField, sortDirection);
    }
    
    /**
     * Update sort direction indicators
     */
    function updateSortIndicators(field, direction) {
        // Reset all buttons
        document.querySelectorAll('.sort-direction').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activate the correct buttons
        document.querySelectorAll(`.sort-direction[data-direction="${direction}"]`).forEach(btn => {
            btn.classList.add('active');
        });
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
                            <div class="col-6">
                                <p class="card-text text-nowrap"><small>Age (Days):</small> <strong>${item['Listing Age (Days)'] || 'N/A'}</strong></p>
                            </div>
                            <div class="col-6">
                                <p class="card-text text-nowrap"><small>Daily Views:</small> <strong>${item['Daily Views'] || 'N/A'}</strong></p>
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
        // Use the MultiFileVisualizations module
        if (typeof MultiFileVisualizations !== 'undefined') {
            // Create keyword distribution chart
            if (typeof MultiFileVisualizations.createKeywordDistributionChart === 'function') {
                MultiFileVisualizations.createKeywordDistributionChart(
                    analysisResults.aList, 
                    analysisResults.stats
                );
            }
            
            // Create metrics comparison chart
            if (typeof MultiFileVisualizations.createMetricsComparisonChart === 'function') {
                MultiFileVisualizations.createMetricsComparisonChart(
                    analysisResults.aList, 
                    analysisResults.bList, 
                    analysisResults.cList
                );
            }
            
            // Create performance matrix chart
            if (typeof MultiFileVisualizations.createPerformanceMatrixChart === 'function') {
                MultiFileVisualizations.createPerformanceMatrixChart(
                    analysisResults.allScored, 
                    analysisResults.aList, 
                    analysisResults.bList, 
                    analysisResults.cList
                );
            }
        }
    }
    
    /**
     * Update all visualizations with current data
     */
    function updateVisualizations() {
        // Use the MultiFileVisualizations module
        if (typeof MultiFileVisualizations !== 'undefined') {
            // Update keyword distribution chart
            if (typeof MultiFileVisualizations.updateKeywordDistributionChart === 'function') {
                MultiFileVisualizations.updateKeywordDistributionChart(
                    analysisResults.aList, 
                    analysisResults.stats
                );
            }
            
            // Update metrics comparison chart
            if (typeof MultiFileVisualizations.updateMetricsComparisonChart === 'function') {
                MultiFileVisualizations.updateMetricsComparisonChart(
                    analysisResults.aList, 
                    analysisResults.bList, 
                    analysisResults.cList
                );
            }
            
            // Update performance matrix chart
            if (typeof MultiFileVisualizations.updatePerformanceMatrix === 'function') {
                MultiFileVisualizations.updatePerformanceMatrix(
                    analysisResults.allScored, 
                    analysisResults.aList, 
                    analysisResults.bList, 
                    analysisResults.cList
                );
            }
        }
    }
    
    /**
     * Update the performance matrix chart
     */
    function updatePerformanceMatrix() {
        if (typeof MultiFileVisualizations !== 'undefined' && 
            typeof MultiFileVisualizations.updatePerformanceMatrix === 'function') {
            MultiFileVisualizations.updatePerformanceMatrix(
                analysisResults.allScored, 
                analysisResults.aList, 
                analysisResults.bList, 
                analysisResults.cList
            );
        }
    }
    
    /**
     * Generate insights based on analysis results
     */
    function generateInsights() {
        if (!elements.analysisInsights) return;
        
        // Clear existing insights
        elements.analysisInsights.innerHTML = '';
        
        // Add loading indicator
        elements.analysisInsights.innerHTML = '<div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div> Generating insights...';
        
        // Generate insights (placeholder for more complex logic)
        setTimeout(() => {
            // Calculate some basic insight metrics
            let topKeyword = 'Unknown';
            let keywordCount = 0;
            
            if (analysisResults.stats && analysisResults.stats.keywordDistribution) {
                const distribution = analysisResults.stats.keywordDistribution;
                let maxCount = 0;
                
                Object.keys(distribution).forEach(keyword => {
                    if (distribution[keyword] > maxCount) {
                        maxCount = distribution[keyword];
                        topKeyword = keyword;
                    }
                });
                
                keywordCount = Object.keys(distribution).length;
            }
            
            // Compare A List to B List metrics
            const aListAvg = calculateListMetrics(analysisResults.aList);
            const bListAvg = calculateListMetrics(analysisResults.bList);
            
            const viewsDiff = ((aListAvg.dailyViews - bListAvg.dailyViews) / bListAvg.dailyViews * 100).toFixed(0);
            const revenueDiff = ((aListAvg.revenue - bListAvg.revenue) / bListAvg.revenue * 100).toFixed(0);
            
            // Generate insights
            const insights = [
                `Analyzed data from ${keywordCount} different keywords, with "${topKeyword}" having the strongest representation in top listings.`,
                `A-list items have ${viewsDiff}% higher daily views percentage compared to B-list items.`,
                `Revenue from A-list items is ${revenueDiff}% higher than B-list items on average.`,
                'Top performing listings show strong correlation between price point and conversion efficiency.',
                'Consider focusing more marketing efforts on listings with both high revenue potential and visibility metrics.'
            ];
            
            // Clear loading indicator
            elements.analysisInsights.innerHTML = '';
            
            // Add insights
            const insightsList = document.createElement('ul');
            insightsList.className = 'insights-list';
            
            insights.forEach(insight => {
                const li = document.createElement('li');
                li.className = 'mb-2';
                li.innerHTML = `<i class="fas fa-lightbulb text-warning me-2"></i> ${insight}`;
                insightsList.appendChild(li);
            });
            
            elements.analysisInsights.appendChild(insightsList);
        }, 1000);
    }
    
    /**
     * Calculate average metrics for a list
     */
    function calculateListMetrics(list) {
        if (!list || list.length === 0) return {
            revenue: 0,
            sales: 0,
            views: 0,
            hearts: 0,
            dailyViews: 0
        };
        
        const revenue = list.reduce((sum, item) => {
            const rev = typeof item['Est. Revenue'] === 'string' ? 
                parseFloat(item['Est. Revenue'].replace(/[^0-9.]/g, '')) : 
                item['Est. Revenue'];
            return sum + (rev || 0);
        }, 0) / list.length;
        
        const sales = list.reduce((sum, item) => sum + (item['Est. Sales'] || 0), 0) / list.length;
        const views = list.reduce((sum, item) => sum + (item['Total Views'] || 0), 0) / list.length;
        const hearts = list.reduce((sum, item) => sum + (item['Hearts'] || 0), 0) / list.length;
        
        const dailyViews = list.reduce((sum, item) => {
            if (item['Daily Views %']) {
                return sum + parseFloat(item['Daily Views %']);
            } else if (item['Daily Views'] && item['Total Views']) {
                return sum + (item['Daily Views'] / item['Total Views'] * 100);
            }
            return sum;
        }, 0) / list.length;
        
        return { revenue, sales, views, hearts, dailyViews };
    }
    
    /**
     * Export the full analysis report
     */
    function exportFullReport() {
        alert('Full report export not implemented yet');
    }
    
    /**
     * Export a specific list (A, B, or C)
     */
    function exportList(listType) {
        alert(`${listType.toUpperCase()}-list export not implemented yet`);
    }
    
    /**
     * Show the details of a specific list in a modal or detailed view
     */
    function showListDetails(listType) {
        alert(`${listType.toUpperCase()}-list detailed view not implemented yet`);
    }
    
    /**
     * Show a notification
     */
    function showNotification(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    }
    
    // Initialize the module
    function init() {
        initAnalysisUI();
    }
    
    /**
     * Force render all lists and activate the A-list tab
     * This can be called from other modules to ensure lists appear immediately
     */
    function forceRenderLists() {
        console.log('Force rendering lists and activating tabs');
        
        // CRITICAL FIX: Sync with global analysisResults first!
        // This ensures we're using the data that was calculated in multi-file-analysis-fixed.js
        if (window.analysisResults) {
            console.log('Syncing with global analysisResults before rendering');
            setAnalysisResults(window.analysisResults);
        } else {
            console.warn('Global analysisResults not available - lists may be empty');
        }
        
        // Clear any loading placeholders
        if (elements.aListContainer) elements.aListContainer.innerHTML = '';
        if (elements.bListContainer) elements.bListContainer.innerHTML = '';
        if (elements.cListContainer) elements.cListContainer.innerHTML = '';
        
        // Render the lists
        renderLists();
        
        // Activate A-list tab explicitly using Bootstrap's tab API
        setTimeout(() => {
            try {
                if (elements.aListTab && typeof bootstrap !== 'undefined') {
                    console.log('Explicitly activating A-list tab via Bootstrap API');
                    const bsTab = new bootstrap.Tab(elements.aListTab);
                    bsTab.show();
                }
            } catch (e) {
                console.error('Error activating tab:', e);
            }
        }, 50);
    }
    
    // Public API
    return {
        init,
        recalculateAnalysis,
        resetSettings,
        getUISettings,
        renderLists,
        createVisualizations,
        updateVisualizations,
        generateInsights,
        showNotification,
        forceRenderLists,  // Method to force render lists
        setAnalysisResults   // Method to sync with global analysisResults
    };
})();

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    MultiFileUIAnalysis.init();
});
