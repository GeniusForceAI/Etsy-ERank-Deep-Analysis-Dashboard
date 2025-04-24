/**
 * Multi-File Visualizations (Part 2)
 * Additional chart functionality for performance matrix and utilities
 */

// Make sure MultiFileVisualizations exists before extending it
if (typeof MultiFileVisualizations === 'undefined') {
    console.error('MultiFileVisualizations is not defined. Make sure it is loaded before this file.');
    // Create an empty object to prevent errors
    window.MultiFileVisualizations = {};
}

// Extend the MultiFileVisualizations module with additional functions
(function() {
    // Add methods to the existing object
    Object.assign(MultiFileVisualizations, {
        /**
         * Create the performance matrix chart
         * @param {Array} allScored - All scored listings
         */
        createPerformanceMatrixChart: function(allScored) {
            const canvas = document.getElementById('performance-matrix-chart');
            if (!canvas) return;
            
            // Destroy existing chart if it exists
            if (this.charts && this.charts.performanceMatrix) {
                this.charts.performanceMatrix.destroy();
            }
            
            if (!allScored || allScored.length === 0) {
                console.error('Missing data for performance matrix chart');
                return;
            }
            
            // Get axis selections
            const xAxisSelect = document.getElementById('x-axis-matrix');
            const yAxisSelect = document.getElementById('y-axis-matrix');
            
            const xAxis = xAxisSelect ? xAxisSelect.value : 'revenue';
            const yAxis = yAxisSelect ? yAxisSelect.value : 'viewsPerSale';
            
            // Prepare data points
            const dataPoints = this.prepareMatrixDataPoints(allScored, xAxis, yAxis);
            
            // Create the chart
            const ctx = canvas.getContext('2d');
            this.charts.performanceMatrix = new Chart(ctx, {
                type: 'bubble',
                data: {
                    datasets: [
                        {
                            label: 'A-List',
                            data: dataPoints.aList,
                            backgroundColor: 'rgba(40, 167, 69, 0.6)',
                            borderColor: 'rgba(40, 167, 69, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'B-List',
                            data: dataPoints.bList,
                            backgroundColor: 'rgba(23, 162, 184, 0.6)',
                            borderColor: 'rgba(23, 162, 184, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'C-List',
                            data: dataPoints.cList,
                            backgroundColor: 'rgba(108, 117, 125, 0.6)',
                            borderColor: 'rgba(108, 117, 125, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Other Listings',
                            data: dataPoints.others,
                            backgroundColor: 'rgba(200, 200, 200, 0.3)',
                            borderColor: 'rgba(200, 200, 200, 0.8)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: this.getAxisLabel(xAxis)
                            },
                            ticks: {
                                callback: function(value) {
                                    if (xAxis === 'revenue' || xAxis === 'price') {
                                        return '$' + value;
                                    }
                                    return value;
                                }
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: this.getAxisLabel(yAxis)
                            },
                            ticks: {
                                callback: function(value) {
                                    if (yAxis === 'viewsPerSale') {
                                        return value.toFixed(0);
                                    }
                                    if (yAxis === 'dailyViews') {
                                        return value.toFixed(1) + '%';
                                    }
                                    return value;
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const item = context.raw.item;
                                    if (!item) return '';
                                    
                                    let label = item['Listing Title'] || '';
                                    if (label.length > 30) {
                                        label = label.substring(0, 27) + '...';
                                    }
                                    
                                    let xValue = context.raw.x;
                                    if (xAxis === 'revenue' || xAxis === 'price') {
                                        xValue = '$' + xValue.toFixed(2);
                                    } else {
                                        xValue = xValue.toFixed(0);
                                    }
                                    
                                    let yValue = context.raw.y;
                                    if (yAxis === 'dailyViews') {
                                        yValue = yValue.toFixed(2) + '%';
                                    } else {
                                        yValue = yValue.toFixed(0);
                                    }
                                    
                                    return [
                                        label,
                                        `${MultiFileVisualizations.getAxisLabel(xAxis)}: ${xValue}`,
                                        `${MultiFileVisualizations.getAxisLabel(yAxis)}: ${yValue}`,
                                        `Shop: ${item['Shop Name']}`,
                                        `Keyword: ${item.keyword}`
                                    ];
                                }
                            }
                        }
                    }
                }
            });
        },
        
        /**
         * Update the performance matrix chart with new axis selections
         */
        updatePerformanceMatrix: function(allScored, aList, bList, cList) {
            // Get all scored listings if not provided
            if (!allScored && window.analysisResults) {
                allScored = window.analysisResults.allScored;
                aList = window.analysisResults.aList;
                bList = window.analysisResults.bList;
                cList = window.analysisResults.cList;
            }
            
            if (!allScored) return;
            
            // If chart doesn't exist, create it
            if (!this.charts || !this.charts.performanceMatrix) {
                this.createPerformanceMatrixChart(allScored, aList, bList, cList);
                return;
            }
            
            // Get axis selections
            const xAxisSelect = document.getElementById('x-axis-matrix');
            const yAxisSelect = document.getElementById('y-axis-matrix');
            
            const xAxis = xAxisSelect ? xAxisSelect.value : 'revenue';
            const yAxis = yAxisSelect ? yAxisSelect.value : 'viewsPerSale';
            
            // Prepare new data points
            const dataPoints = this.prepareMatrixDataPoints(allScored, xAxis, yAxis, aList, bList, cList);
            
            // Update chart data
            this.charts.performanceMatrix.data.datasets[0].data = dataPoints.aList;
            this.charts.performanceMatrix.data.datasets[1].data = dataPoints.bList;
            this.charts.performanceMatrix.data.datasets[2].data = dataPoints.cList;
            this.charts.performanceMatrix.data.datasets[3].data = dataPoints.others;
            
            // Update axis labels
            this.charts.performanceMatrix.options.scales.x.title.text = this.getAxisLabel(xAxis);
            this.charts.performanceMatrix.options.scales.y.title.text = this.getAxisLabel(yAxis);
            
            // Update
            this.charts.performanceMatrix.update();
        },
        
        /**
         * Prepare data points for the performance matrix chart
         */
        prepareMatrixDataPoints: function(allScored, xAxis, yAxis, aList, bList, cList) {
            // Create sets of IDs for quick lookup
            const aListIds = new Set(aList ? aList.map(item => item.id) : []);
            const bListIds = new Set(bList ? bList.map(item => item.id) : []);
            const cListIds = new Set(cList ? cList.map(item => item.id) : []);
            
            // Organize the data points
            const aListPoints = [];
            const bListPoints = [];
            const cListPoints = [];
            const otherPoints = [];
            
            allScored.forEach(item => {
                // Get x and y values based on selected axes
                const point = this.getDataPointForAxes(item, xAxis, yAxis);
                
                // Skip if point has null values
                if (point.x === null || point.y === null) return;
                
                // Add to appropriate array based on list membership
                if (aListIds.has(item.id)) {
                    aListPoints.push({
                        ...point,
                        item: item
                    });
                } else if (bListIds.has(item.id)) {
                    bListPoints.push({
                        ...point,
                        item: item
                    });
                } else if (cListIds.has(item.id)) {
                    cListPoints.push({
                        ...point,
                        item: item
                    });
                } else {
                    otherPoints.push({
                        ...point,
                        item: item
                    });
                }
            });
            
            return {
                aList: aListPoints,
                bList: bListPoints,
                cList: cListPoints,
                others: otherPoints
            };
        },
        
        /**
         * Get data point coordinates for specific axes
         */
        getDataPointForAxes: function(item, xAxis, yAxis) {
            // Get x-axis value
            let x = null;
            switch (xAxis) {
                case 'revenue':
                    x = typeof item['Est. Revenue'] === 'string' ?
                        parseFloat(item['Est. Revenue'].replace(/[^0-9.]/g, '')) :
                        item['Est. Revenue'];
                    break;
                case 'sales':
                    x = item['Est. Sales'];
                    break;
                case 'price':
                    x = typeof item['Price'] === 'string' ?
                        parseFloat(item['Price'].replace(/[^0-9.]/g, '')) :
                        item['Price'];
                    break;
                case 'views':
                    x = item['Total Views'];
                    break;
                case 'hearts':
                    x = item['Hearts'];
                    break;
                default:
                    x = 0;
            }
            
            // Get y-axis value
            let y = null;
            switch (yAxis) {
                case 'viewsPerSale':
                    y = item['Est. Sales'] > 0 ?
                        item['Total Views'] / item['Est. Sales'] : null;
                    break;
                case 'dailyViews':
                    if (item['Daily Views %']) {
                        y = parseFloat(item['Daily Views %']);
                    } else if (item['Daily Views'] && item['Total Views']) {
                        y = (item['Daily Views'] / item['Total Views'] * 100);
                    } else {
                        y = null;
                    }
                    break;
                case 'salesRate':
                    y = item['Total Views'] > 0 ?
                        (item['Est. Sales'] / item['Total Views'] * 100) : null;
                    break;
                case 'listingAge':
                    y = item['Listing Age (Days)'];
                    break;
                default:
                    y = 0;
            }
            
            // Get bubble size based on composite score
            const r = item.compositeScore ? Math.max(5, item.compositeScore / 10) : 5;
            
            return { x, y, r };
        },
        
        /**
         * Get human-readable axis label
         */
        getAxisLabel: function(axis) {
            switch (axis) {
                case 'revenue': return 'Estimated Revenue';
                case 'sales': return 'Estimated Sales';
                case 'price': return 'Price';
                case 'views': return 'Total Views';
                case 'hearts': return 'Hearts';
                case 'viewsPerSale': return 'Views per Sale';
                case 'dailyViews': return 'Daily Views %';
                case 'salesRate': return 'Sales Rate %';
                case 'listingAge': return 'Listing Age (Days)';
                default: return axis;
            }
        },
        
        /**
         * Update metrics comparison chart
         */
        updateMetricsComparisonChart: function(aList, bList, cList) {
            if (!this.charts || !this.charts.metricsComparison) {
                this.createMetricsComparisonChart(aList, bList, cList);
                return;
            }
            
            if (!aList || !bList || !cList) return;
            
            // Calculate average metrics for each list (reusing function from createMetricsComparisonChart)
            const calculateAverages = (list) => {
                // Same implementation as in createMetricsComparisonChart
                if (!list || list.length === 0) return {
                    revenue: 0,
                    sales: 0,
                    views: 0,
                    hearts: 0,
                    efficiency: 0
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
                
                const efficiency = list.reduce((sum, item) => {
                    const viewsPerSale = item['Est. Sales'] > 0 ? 
                        item['Total Views'] / item['Est. Sales'] : 0;
                    return sum + (viewsPerSale || 0);
                }, 0) / list.length;
                
                return { revenue, sales, views, hearts, efficiency };
            };
            
            const aListAvg = calculateAverages(aList);
            const bListAvg = calculateAverages(bList);
            const cListAvg = calculateAverages(cList);
            
            // Normalize values for better display
            const normalize = (data) => {
                const maxRevenue = Math.max(aListAvg.revenue, bListAvg.revenue, cListAvg.revenue);
                const maxSales = Math.max(aListAvg.sales, bListAvg.sales, cListAvg.sales);
                const maxViews = Math.max(aListAvg.views, bListAvg.views, cListAvg.views);
                const maxHearts = Math.max(aListAvg.hearts, bListAvg.hearts, cListAvg.hearts);
                const maxEfficiency = Math.max(aListAvg.efficiency, bListAvg.efficiency, cListAvg.efficiency);
                
                return {
                    revenue: maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0,
                    sales: maxSales > 0 ? (data.sales / maxSales) * 100 : 0,
                    views: maxViews > 0 ? (data.views / maxViews) * 100 : 0,
                    hearts: maxHearts > 0 ? (data.hearts / maxHearts) * 100 : 0,
                    efficiency: maxEfficiency > 0 ? (data.efficiency / maxEfficiency) * 100 : 0
                };
            };
            
            const normalizedA = normalize(aListAvg);
            const normalizedB = normalize(bListAvg);
            const normalizedC = normalize(cListAvg);
            
            // Update chart data
            this.charts.metricsComparison.data.datasets[0].data = [
                normalizedA.revenue,
                normalizedA.sales,
                normalizedA.views,
                normalizedA.hearts,
                normalizedA.efficiency
            ];
            
            this.charts.metricsComparison.data.datasets[1].data = [
                normalizedB.revenue,
                normalizedB.sales,
                normalizedB.views,
                normalizedB.hearts,
                normalizedB.efficiency
            ];
            
            this.charts.metricsComparison.data.datasets[2].data = [
                normalizedC.revenue,
                normalizedC.sales,
                normalizedC.views,
                normalizedC.hearts,
                normalizedC.efficiency
            ];
            
            this.charts.metricsComparison.update();
        }
    });
})();
