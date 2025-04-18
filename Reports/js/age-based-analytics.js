/**
 * Age-Based Analytics for Etsy Dashboard
 * Provides insights on trending vs evergreen listings based on listing age
 */

// Function to generate trending and evergreen items based on listing age
function generateAgeBasedAnalytics() {
    if (filteredData.length === 0) {
        $('#trending-items-list, #evergreen-items-list').html('<p class="text-muted">No data available for analysis</p>');
        return;
    }
    
    // Calculate age score metrics for analysis
    const dataWithScores = filteredData.map(item => {
        const age = parseFloat(item['Listing Age (Days)']) || 1;
        const dailyViews = parseFloat(item['Daily Views']) || 0;
        const totalViews = parseFloat(item['Total Views']) || 0;
        
        // Calculate trending score - prioritizes new listings with high daily views
        // Formula weights recent listings more heavily
        const trendingScore = (dailyViews * (1 + (100 / Math.max(age, 1))));
        
        // Calculate evergreen score - prioritizes older listings with consistent performance
        // Formula gives higher scores to older listings that maintain good daily view counts
        const evergreenScore = (dailyViews * Math.log10(Math.max(age, 10)));
        
        return {
            ...item,
            trendingScore,
            evergreenScore,
            listingTitle: item['Shop / Listing'] || 'Unknown Listing'
        };
    });
    
    // Get top trending items (newer listings with high daily views)
    const trendingItems = [...dataWithScores]
        .filter(item => parseFloat(item['Listing Age (Days)']) < 60) // Focus on newer listings
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, 5); // Get top 5
    
    // Get top evergreen items (older listings that still perform well)
    const evergreenItems = [...dataWithScores]
        .filter(item => parseFloat(item['Listing Age (Days)']) > 90) // Focus on older listings
        .sort((a, b) => b.evergreenScore - a.evergreenScore)
        .slice(0, 5); // Get top 5
    
    // Render trending items
    renderListingsList(trendingItems, 'trending-items-list');
    
    // Render evergreen items
    renderListingsList(evergreenItems, 'evergreen-items-list');
    
    // Generate the age performance chart
    generateAgePerformanceChart(dataWithScores);
}

// Helper function to render a list of items
function renderListingsList(items, containerId) {
    const container = $('#' + containerId);
    container.empty();
    
    if (items.length === 0) {
        container.html('<p class="text-muted">No matching listings found</p>');
        return;
    }
    
    items.forEach(item => {
        // Create a shortened version of the listing title
        const title = item.listingTitle;
        const shortTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
        
        // Format metrics for display
        const price = '$' + parseFloat(item['Price']).toFixed(2);
        const age = parseInt(item['Listing Age (Days)']) + ' days';
        const dailyViews = parseFloat(item['Daily Views']).toFixed(1) + ' views/day';
        
        // Create list item
        const listItem = $(`
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${shortTitle}</h6>
                    <small class="text-primary">${price}</small>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">Age: ${age}</small>
                    <small class="text-muted">Hearts: ${item['Hearts']}</small>
                    <small class="text-success fw-bold">${dailyViews}</small>
                </div>
            </div>
        `);
        
        container.append(listItem);
    });
}

// Function to generate the age performance chart
function generateAgePerformanceChart(data) {
    const ctx = document.getElementById('age-performance-chart').getContext('2d');
    
    // Define age brackets for analysis
    const ageBrackets = [
        { min: 0, max: 7, label: '0-7 days' },
        { min: 8, max: 30, label: '8-30 days' },
        { min: 31, max: 90, label: '31-90 days' },
        { min: 91, max: 180, label: '91-180 days' },
        { min: 181, max: 365, label: '181-365 days' },
        { min: 366, max: Infinity, label: '1+ year' }
    ];
    
    // Calculate metrics for each age bracket
    const bracketData = ageBrackets.map(bracket => {
        const itemsInBracket = data.filter(item => {
            const age = parseFloat(item['Listing Age (Days)']);
            return age >= bracket.min && age <= bracket.max;
        });
        
        if (itemsInBracket.length === 0) {
            return {
                label: bracket.label,
                count: 0,
                avgDailyViews: 0,
                avgHearts: 0,
                avgEngagement: 0
            };
        }
        
        // Calculate average metrics
        const avgDailyViews = itemsInBracket.reduce((sum, item) => sum + parseFloat(item['Daily Views'] || 0), 0) / itemsInBracket.length;
        const avgHearts = itemsInBracket.reduce((sum, item) => sum + parseFloat(item['Hearts'] || 0), 0) / itemsInBracket.length;
        const avgEngagement = itemsInBracket.reduce((sum, item) => sum + parseFloat(item['Engagement Rate'] || 0), 0) / itemsInBracket.length;
        
        return {
            label: bracket.label,
            count: itemsInBracket.length,
            avgDailyViews,
            avgHearts,
            avgEngagement
        };
    });
    
    // Create the chart
    if (window.ageChart) {
        window.ageChart.destroy();
    }
    
    window.ageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: bracketData.map(b => b.label),
            datasets: [
                {
                    label: 'Avg. Daily Views',
                    data: bracketData.map(b => b.avgDailyViews.toFixed(1)),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Avg. Engagement Rate (%)',
                    data: bracketData.map(b => b.avgEngagement.toFixed(1)),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    type: 'line',
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
                        text: 'Avg. Daily Views'
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
                        text: 'Engagement Rate (%)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        footer: function(tooltipItems) {
                            const dataIndex = tooltipItems[0].dataIndex;
                            return `Listings in group: ${bracketData[dataIndex].count}`;
                        }
                    }
                }
            }
        }
    });
}
