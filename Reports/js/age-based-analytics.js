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

// Function to generate the age performance chart - simplified version to reduce RAM usage
function generateAgePerformanceChart(data) {
    // Get the canvas element
    const canvas = document.getElementById('age-performance-chart');
    if (!canvas) {
        console.error('Canvas element not found for age performance chart');
        return;
    }
    
    // First clean up any existing chart to free memory
    if (window.ageChart) {
        window.ageChart.destroy();
        window.ageChart = null;
    }
    
    // Instead of rendering a complex chart, create a simplified table-based visualization
    // that uses less RAM
    
    // Create a placeholder that explains we've disabled the heavy chart
    const container = $(canvas).parent();
    canvas.remove(); // Remove the canvas to prevent chart.js from using it
    
    // Add placeholder with explanation
    container.html(`
        <div class="alert alert-info mb-3">
            <h5>Age-Based Analytics Summary</h5>
            <p>The detailed chart has been replaced with a more efficient summary to reduce memory usage.</p>
        </div>
        <div class="table-responsive">
            <table class="table table-sm table-hover" id="age-analysis-table">
                <thead>
                    <tr>
                        <th>Age Group</th>
                        <th>Listings</th>
                        <th>Avg. Daily Views</th>
                        <th>Relative Performance</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `);
    
    // Define age brackets for analysis - using fewer brackets to reduce processing
    const ageBrackets = [
        { min: 0, max: 30, label: '0-30 days (New)' },
        { min: 31, max: 90, label: '31-90 days (Recent)' },
        { min: 91, max: 180, label: '91-180 days (Established)' },
        { min: 181, max: Infinity, label: 'Over 180 days (Mature)' }
    ];
    
    // Calculate simplified metrics with more efficient data processing
    const tableBody = $('#age-analysis-table tbody');
    let maxAvgViews = 0;
    
    // Process each bracket's data
    ageBrackets.forEach(bracket => {
        // Count items and calculate simple metrics
        let totalDailyViews = 0;
        let count = 0;
        
        // Use a more efficient single-pass approach
        for (let i = 0; i < Math.min(data.length, 100); i++) { // Limit to first 100 items for performance
            const item = data[i];
            const age = parseFloat(item['Listing Age (Days)']);
            
            if (age >= bracket.min && age <= bracket.max) {
                count++;
                totalDailyViews += parseFloat(item['Daily Views'] || 0);
            }
        }
        
        // Calculate average views
        const avgDailyViews = count > 0 ? totalDailyViews / count : 0;
        if (avgDailyViews > maxAvgViews) maxAvgViews = avgDailyViews;
        
        // Add row to table
        tableBody.append(`
            <tr>
                <td>${bracket.label}</td>
                <td>${count}</td>
                <td>${avgDailyViews.toFixed(1)}</td>
                <td class="age-performance-bar" data-value="${avgDailyViews}"></td>
            </tr>
        `);
    });
    
    // Add visual bar representations for performance
    if (maxAvgViews > 0) {
        $('.age-performance-bar').each(function() {
            const value = parseFloat($(this).data('value'));
            const percentage = Math.min(Math.round((value / maxAvgViews) * 100), 100);
            const color = percentage > 75 ? 'bg-success' : percentage > 50 ? 'bg-info' : percentage > 25 ? 'bg-warning' : 'bg-danger';
            
            $(this).html(`
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar ${color}" role="progressbar" style="width: ${percentage}%" 
                        aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            `);
        });
    }
}
