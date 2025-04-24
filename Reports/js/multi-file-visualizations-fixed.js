/**
 * Multi-File Visualizations Module
 * Handles chart creation and updates for the multi-file analysis dashboard
 */

const MultiFileVisualizations = (function() {
    // Store chart objects
    let charts = {
        keywordDistribution: null,
        metricsComparison: null,
        performanceMatrix: null
    };
    
    /**
     * Create the keyword distribution chart
     * @param {Array} aList - A-list items
     * @param {Object} stats - Analysis statistics
     */
    function createKeywordDistributionChart(aList, stats) {
        const canvas = document.getElementById('keyword-distribution-chart');
        if (!canvas) return;
        
        // Destroy existing chart if it exists
        if (charts.keywordDistribution) {
            charts.keywordDistribution.destroy();
        }
        
        if (!aList || !stats || !stats.keywordDistribution) {
            console.error('Missing data for keyword distribution chart');
            return;
        }
        
        // Prepare data
        const keywords = Object.keys(stats.keywordDistribution);
        const counts = Object.values(stats.keywordDistribution);
        
        // Create a color array
        const colors = keywords.map((_, i) => {
            const hue = (i * 137.5) % 360; // Spread colors evenly
            return `hsl(${hue}, 70%, 60%)`;
        });
        
        // Create the chart
        const ctx = canvas.getContext('2d');
        charts.keywordDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: keywords,
                datasets: [{
                    data: counts,
                    backgroundColor: colors,
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 11
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'A-List Keyword Distribution',
                        font: {
                            size: 14
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Update the keyword distribution chart
     * @param {Array} aList - A-list items
     * @param {Object} stats - Analysis statistics
     */
    function updateKeywordDistributionChart(aList, stats) {
        if (!charts.keywordDistribution) {
            createKeywordDistributionChart(aList, stats);
            return;
        }
        
        if (!aList || !stats || !stats.keywordDistribution) {
            return;
        }
        
        // Update data
        const keywords = Object.keys(stats.keywordDistribution);
        const counts = Object.values(stats.keywordDistribution);
        
        charts.keywordDistribution.data.labels = keywords;
        charts.keywordDistribution.data.datasets[0].data = counts;
        
        // Update colors if needed
        if (charts.keywordDistribution.data.datasets[0].backgroundColor.length !== keywords.length) {
            const colors = keywords.map((_, i) => {
                const hue = (i * 137.5) % 360;
                return `hsl(${hue}, 70%, 60%)`;
            });
            charts.keywordDistribution.data.datasets[0].backgroundColor = colors;
        }
        
        charts.keywordDistribution.update();
    }
    
    /**
     * Create the metrics comparison chart
     * @param {Array} aList - A-list items
     * @param {Array} bList - B-list items
     * @param {Array} cList - C-list items
     */
    function createMetricsComparisonChart(aList, bList, cList) {
        const canvas = document.getElementById('metrics-comparison-chart');
        if (!canvas) return;
        
        // Destroy existing chart if it exists
        if (charts.metricsComparison) {
            charts.metricsComparison.destroy();
        }
        
        if (!aList || !bList || !cList) {
            console.error('Missing data for metrics comparison chart');
            return;
        }
        
        // Calculate average metrics for each list
        const calculateAverages = (list) => {
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
        
        // Create the chart
        const ctx = canvas.getContext('2d');
        charts.metricsComparison = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Revenue', 'Sales', 'Views', 'Hearts', 'Views/Sale'],
                datasets: [
                    {
                        label: 'A-List',
                        data: [
                            normalizedA.revenue,
                            normalizedA.sales,
                            normalizedA.views,
                            normalizedA.hearts,
                            normalizedA.efficiency
                        ],
                        backgroundColor: 'rgba(40, 167, 69, 0.2)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        pointBackgroundColor: 'rgba(40, 167, 69, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(40, 167, 69, 1)'
                    },
                    {
                        label: 'B-List',
                        data: [
                            normalizedB.revenue,
                            normalizedB.sales,
                            normalizedB.views,
                            normalizedB.hearts,
                            normalizedB.efficiency
                        ],
                        backgroundColor: 'rgba(23, 162, 184, 0.2)',
                        borderColor: 'rgba(23, 162, 184, 1)',
                        pointBackgroundColor: 'rgba(23, 162, 184, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(23, 162, 184, 1)'
                    },
                    {
                        label: 'C-List',
                        data: [
                            normalizedC.revenue,
                            normalizedC.sales,
                            normalizedC.views,
                            normalizedC.hearts,
                            normalizedC.efficiency
                        ],
                        backgroundColor: 'rgba(108, 117, 125, 0.2)',
                        borderColor: 'rgba(108, 117, 125, 1)',
                        pointBackgroundColor: 'rgba(108, 117, 125, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(108, 117, 125, 1)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        ticks: {
                            display: false,
                            maxTicksLimit: 5
                        },
                        pointLabels: {
                            font: {
                                size: 12
                            }
                        },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Comparison (Normalized)',
                        font: {
                            size: 14
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw.toFixed(0);
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Public API
    return {
        charts,
        createKeywordDistributionChart,
        updateKeywordDistributionChart,
        createMetricsComparisonChart,
        // These will be implemented by the extension module
        createPerformanceMatrixChart: function() {},
        updatePerformanceMatrix: function() {},
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
        }
    };
})();
