/**
 * Multi-File Ranking Module
 * Implements the three ranking models:
 * 1. Weighted Composite Score
 * 2. Performance Tier System
 * 3. Market Opportunity Score
 */

const MultiFileRanking = (function() {
    /**
     * Calculate the Weighted Composite Score for a listing
     * @param {Object} listing - The listing to score
     * @param {Object} weights - Weight values for different metrics
     * @param {Object} normValues - Normalized values (if pre-calculated)
     * @returns {number} - The composite score (0-100)
     */
    function calculateCompositeScore(listing, weights, normValues) {
        // If we have pre-normalized values, use those
        if (normValues) {
            return (
                (weights.revenue * normValues.revenue) + 
                (weights.sales * normValues.sales) + 
                (weights.dailyViews * normValues.dailyViews) + 
                (weights.efficiency * normValues.efficiency) + 
                (weights.hearts * normValues.hearts) + 
                (weights.age * normValues.age)
            ) * 100; // Scale to 0-100
        }
        
        // Otherwise calculate raw scores (less accurate without normalization)
        const revenueScore = listing['Est. Revenue'] || 0;
        const salesScore = listing['Est. Sales'] || 0;
        const dailyViewsScore = listing['Daily Views %'] || 0;
        const viewsPerSale = listing['Est. Sales'] > 0 ? 
            listing['Total Views'] / listing['Est. Sales'] : 0;
        const efficiencyScore = viewsPerSale > 0 ? 1 / viewsPerSale : 0; // Lower is better
        const heartsScore = listing['Hearts'] || 0;
        
        // Age factor - we reward middle-aged listings (not too new, not too old)
        const age = listing['Listing Age (Days)'] || 0;
        const ageScore = age > 0 ? Math.exp(-(Math.pow(Math.log(age) - 4, 2) / 2)) : 0;
        
        return (
            (weights.revenue * revenueScore) + 
            (weights.sales * salesScore) + 
            (weights.dailyViews * dailyViewsScore) + 
            (weights.efficiency * efficiencyScore) + 
            (weights.hearts * heartsScore) + 
            (weights.age * ageScore)
        );
    }
    
    /**
     * Determine the Performance Tiers for a listing
     * @param {Object} listing - The listing to categorize
     * @param {Object} thresholds - Threshold values for different tiers
     * @param {Object} stats - Statistics about the dataset
     * @returns {Object} - The tier assignments
     */
    function determinePerformanceTiers(listing, thresholds, stats) {
        const tiers = [];
        
        // High Revenue Generators (top X%)
        if (stats && stats.revenuePercentile && 
            (100 - stats.revenuePercentile[listing.id]) <= thresholds.highRevenue) {
            tiers.push('highRevenue');
        }
        
        // Conversion Champions (exceptional views/sale ratio)
        const viewsPerSale = listing['Est. Sales'] > 0 ? 
            listing['Total Views'] / listing['Est. Sales'] : Infinity;
        if (viewsPerSale < thresholds.conversion) {
            tiers.push('conversionChampion');
        }
        
        // Growth Performers (high daily views %)
        const dailyViewsPct = listing['Daily Views %'] || 
            (listing['Daily Views'] && listing['Total Views'] ? 
                (listing['Daily Views'] / listing['Total Views'] * 100) : 0);
        if (dailyViewsPct >= thresholds.growth) {
            tiers.push('growthPerformer');
        }
        
        // Visibility Champions (high total views relative to age)
        const visibilityRatio = listing['Listing Age (Days)'] > 0 ? 
            listing['Total Views'] / listing['Listing Age (Days)'] : 0;
        if (stats && stats.visibilityRatioPercentile && 
            (100 - stats.visibilityRatioPercentile[listing.id]) <= thresholds.visibility) {
            tiers.push('visibilityChampion');
        } else if (visibilityRatio >= thresholds.visibility) {
            // Fallback if we don't have percentiles
            tiers.push('visibilityChampion');
        }
        
        // Price Optimizers
        const priceToRevenueRatio = listing['Price'] > 0 ? 
            listing['Est. Revenue'] / listing['Price'] : 0;
        if (stats && stats.priceOptimizationPercentile && 
            (100 - stats.priceOptimizationPercentile[listing.id]) <= 10) { // Top 10%
            tiers.push('priceOptimizer');
        }
        
        // Rising Stars (newer listings with good performance)
        if (listing['Listing Age (Days)'] <= 60 && listing['Est. Sales'] >= 5) {
            tiers.push('risingStar');
        }
        
        return tiers;
    }
    
    /**
     * Calculate Market Opportunity Score
     * @param {Object} listing - The listing to score
     * @param {Object} averages - Average values for the metrics across listings
     * @returns {number} - The opportunity score
     */
    function calculateOpportunityScore(listing, averages) {
        if (!averages) return 0;
        
        // Revenue relative to average
        const relativeRevenue = averages.revenue > 0 ? 
            (listing['Est. Revenue'] || 0) / averages.revenue : 0;
        
        // Sales % relative to average
        const salesPct = listing['Est. Sales'] > 0 && listing['Total Views'] > 0 ? 
            (listing['Est. Sales'] / listing['Total Views'] * 100) : 0;
        const relativeSalesPct = averages.salesPct > 0 ? 
            salesPct / averages.salesPct : 0;
        
        // Price premium factor
        // Higher score if price is above average but still selling well
        const priceRatio = averages.price > 0 ? 
            (listing['Price'] || 0) / averages.price : 1;
        const pricePremiumFactor = priceRatio > 1 && relativeRevenue > 1 ? 
            priceRatio : 1;
        
        // Views per sale efficiency (inverse, lower is better)
        const viewsPerSale = listing['Est. Sales'] > 0 ? 
            listing['Total Views'] / listing['Est. Sales'] : Infinity;
        const avgViewsPerSale = averages.viewsPerSale || 1;
        const efficiencyFactor = viewsPerSale < Infinity && avgViewsPerSale < Infinity ? 
            avgViewsPerSale / viewsPerSale : 0;
        
        // Combine factors
        const opportunityScore = relativeRevenue * relativeSalesPct * pricePremiumFactor * efficiencyFactor;
        
        // Scale to 0-100 range using a sigmoid function
        return 100 / (1 + Math.exp(-opportunityScore + 3));
    }
    
    /**
     * Normalize metric values across a dataset
     * @param {Array} listings - Array of listing objects
     * @param {string} method - Normalization method ('percentile', 'minmax', 'zscore')
     * @returns {Object} - Normalized values for each listing and statistics
     */
    function normalizeMetrics(listings, method = 'percentile') {
        if (!listings || listings.length === 0) return { normalizedListings: [], stats: {} };
        
        // Assign IDs to listings if they don't have them
        listings.forEach((listing, index) => {
            if (!listing.id) listing.id = `listing_${index}`;
        });
        
        // Extract raw metrics
        const metrics = {
            revenue: listings.map(l => l['Est. Revenue'] || 0),
            sales: listings.map(l => l['Est. Sales'] || 0),
            dailyViews: listings.map(l => {
                if (l['Daily Views %']) return l['Daily Views %'];
                if (l['Daily Views'] && l['Total Views']) {
                    return (l['Daily Views'] / l['Total Views'] * 100);
                }
                return 0;
            }),
            efficiency: listings.map(l => {
                const viewsPerSale = l['Est. Sales'] > 0 ? 
                    l['Total Views'] / l['Est. Sales'] : Infinity;
                // Inverse for efficiency (lower views per sale is better)
                return viewsPerSale < Infinity ? 1 / viewsPerSale : 0;
            }),
            hearts: listings.map(l => l['Hearts'] || 0),
            age: listings.map(l => {
                const age = l['Listing Age (Days)'] || 0;
                // We reward middle-aged listings with a bell curve
                return age > 0 ? Math.exp(-(Math.pow(Math.log(age) - 4, 2) / 2)) : 0;
            }),
            price: listings.map(l => l['Price'] || 0),
            visibilityRatio: listings.map(l => {
                return l['Listing Age (Days)'] > 0 ? 
                    l['Total Views'] / l['Listing Age (Days)'] : 0;
            }),
            priceOptimization: listings.map(l => {
                return l['Price'] > 0 ? 
                    l['Est. Revenue'] / l['Price'] : 0;
            })
        };
        
        // Calculate statistics
        const stats = {};
        Object.keys(metrics).forEach(metric => {
            const values = metrics[metric].filter(v => v !== Infinity && !isNaN(v));
            
            if (values.length === 0) {
                stats[metric] = { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
                return;
            }
            
            const min = Math.min(...values);
            const max = Math.max(...values);
            const sum = values.reduce((a, b) => a + b, 0);
            const mean = sum / values.length;
            
            // Sort for percentiles and median
            const sorted = [...values].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            
            // Standard deviation
            const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
            const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
            const stdDev = Math.sqrt(variance);
            
            stats[metric] = { min, max, mean, median, stdDev };
        });
        
        // Calculate normalized values based on selected method
        const normalizedValues = {};
        const normalizedListings = listings.map(listing => {
            const normalized = { ...listing };
            normalized.normValues = {};
            
            Object.keys(metrics).forEach(metric => {
                let value = 0;
                const rawValue = metrics[metric][listings.indexOf(listing)];
                
                if (method === 'percentile') {
                    // Percentile ranking (0-1)
                    const sortedValues = [...metrics[metric]];
                    sortedValues.sort((a, b) => a - b);
                    const index = sortedValues.indexOf(rawValue);
                    value = index / (sortedValues.length - 1);
                    
                    // Add to percentile stats
                    if (!stats[`${metric}Percentile`]) {
                        stats[`${metric}Percentile`] = {};
                    }
                    stats[`${metric}Percentile`][listing.id] = value * 100;
                    
                } else if (method === 'minmax') {
                    // Min-max scaling (0-1)
                    const { min, max } = stats[metric];
                    value = max > min ? (rawValue - min) / (max - min) : 0;
                    
                } else if (method === 'zscore') {
                    // Z-score standardization
                    const { mean, stdDev } = stats[metric];
                    value = stdDev > 0 ? (rawValue - mean) / stdDev : 0;
                    // Convert to 0-1 range using a sigmoid function
                    value = 1 / (1 + Math.exp(-value));
                }
                
                normalized.normValues[metric] = value;
            });
            
            return normalized;
        });
        
        // Add averages to stats
        stats.averages = {
            revenue: stats.revenue.mean,
            sales: stats.sales.mean,
            dailyViews: stats.dailyViews.mean,
            price: stats.price.mean,
            viewsPerSale: listings.reduce((sum, l) => {
                const vps = l['Est. Sales'] > 0 ? l['Total Views'] / l['Est. Sales'] : null;
                return vps !== null ? sum + vps : sum;
            }, 0) / listings.filter(l => l['Est. Sales'] > 0).length,
            salesPct: listings.reduce((sum, l) => {
                const pct = l['Total Views'] > 0 ? (l['Est. Sales'] / l['Total Views'] * 100) : null;
                return pct !== null ? sum + pct : sum;
            }, 0) / listings.filter(l => l['Total Views'] > 0).length
        };
        
        return { normalizedListings, stats };
    }
    
    /**
     * Score and rank listings using all three models
     * @param {Array} listings - Array of listing objects
     * @param {Object} settings - Analysis settings
     * @returns {Array} - Scored and ranked listings
     */
    function scoreAndRankListings(listings, settings) {
        // Get normalized metrics
        const { normalizedListings, stats } = normalizeMetrics(listings, settings.normalization);
        
        // Apply all three scoring models
        const scoredListings = normalizedListings.map(listing => {
            // Clone to avoid modifying the original
            const scoredListing = { ...listing };
            
            // Model 1: Weighted Composite Score
            scoredListing.compositeScore = calculateCompositeScore(
                listing, 
                settings.weights, 
                listing.normValues
            );
            
            // Model 2: Performance Tier System
            scoredListing.performanceTiers = determinePerformanceTiers(
                listing, 
                settings.tierThresholds, 
                stats
            );
            
            // Model 3: Market Opportunity Score
            scoredListing.opportunityScore = calculateOpportunityScore(
                listing, 
                stats.averages
            );
            
            // Calculate final rank index (weighted combination of models)
            scoredListing.rankIndex = (
                (scoredListing.compositeScore * 0.6) + 
                (scoredListing.opportunityScore * 0.3) + 
                (scoredListing.performanceTiers.length * 5 * 0.1) // 5 points per tier
            );
            
            return scoredListing;
        });
        
        // Sort by rank index (descending)
        scoredListings.sort((a, b) => b.rankIndex - a.rankIndex);
        
        return scoredListings;
    }
    
    /**
     * Generate A/B/C lists from scored listings
     * @param {Array} scoredListings - Scored and ranked listings
     * @param {Object} keywordListings - Listings grouped by keyword
     * @param {Object} settings - Analysis settings
     * @returns {Object} - A/B/C lists and selection stats
     */
    function generateABCLists(scoredListings, keywordListings, settings) {
        // Lists to return
        const aList = [];
        const bList = [];
        const cList = [];
        
        // Keep track of selected listings and keywords for balanced selection
        const selectedListings = new Set();
        const keywordCounts = {};
        const keywords = Object.keys(keywordListings);
        
        // Initialize keyword counts
        keywords.forEach(keyword => {
            keywordCounts[keyword] = 0;
        });
        
        // Selection strategy
        const strategy = settings.selectionStrategy || 'balanced';
        
        if (strategy === 'macro') {
            // Macro strategy: Simply take the top listings across all keywords
            aList.push(...scoredListings.slice(0, 21));
            bList.push(...scoredListings.slice(21, 42));
            cList.push(...scoredListings.slice(42, 63));
        } 
        else if (strategy === 'micro') {
            // Micro strategy: Take top 10 from each keyword, then rank those
            let microTopListings = [];
            
            // Get top 10 listings from each keyword
            keywords.forEach(keyword => {
                const keywordListingObjects = keywordListings[keyword];
                const keywordScored = scoredListings.filter(listing => 
                    listing.keyword === keyword);
                
                // Take top 10 or less if not enough
                const topForKeyword = keywordScored.slice(0, 10);
                microTopListings.push(...topForKeyword);
            });
            
            // Sort by rank index
            microTopListings.sort((a, b) => b.rankIndex - a.rankIndex);
            
            // Assign to A/B/C lists
            aList.push(...microTopListings.slice(0, 21));
            bList.push(...microTopListings.slice(21, 42));
            cList.push(...microTopListings.slice(42, 63));
        }
        else {
            // Balanced strategy (default)
            // First pass: Get top 10 from each keyword (micro-market ranking)
            const topByKeyword = {};
            keywords.forEach(keyword => {
                const keywordScored = scoredListings.filter(listing => 
                    listing.keyword === keyword);
                topByKeyword[keyword] = keywordScored.slice(0, 10);
            });
            
            // Second pass: Create A list with balanced representation
            // Start with top 3 from each keyword
            keywords.forEach(keyword => {
                if (topByKeyword[keyword].length >= 3) {
                    const top3 = topByKeyword[keyword].slice(0, 3);
                    top3.forEach(listing => {
                        if (aList.length < 21 && !selectedListings.has(listing.id)) {
                            aList.push(listing);
                            selectedListings.add(listing.id);
                            keywordCounts[keyword]++;
                        }
                    });
                }
            });
            
            // Fill remaining spots with highest ranked listings across all keywords
            // but limit to max 5 per keyword
            for (let i = 0; i < scoredListings.length && aList.length < 21; i++) {
                const listing = scoredListings[i];
                if (!selectedListings.has(listing.id) && keywordCounts[listing.keyword] < 5) {
                    aList.push(listing);
                    selectedListings.add(listing.id);
                    keywordCounts[listing.keyword]++;
                }
            }
            
            // Create B list (next 21 best listings)
            for (let i = 0; i < scoredListings.length && bList.length < 21; i++) {
                const listing = scoredListings[i];
                if (!selectedListings.has(listing.id)) {
                    bList.push(listing);
                    selectedListings.add(listing.id);
                }
            }
            
            // Create C list (next 21 after B list)
            for (let i = 0; i < scoredListings.length && cList.length < 21; i++) {
                const listing = scoredListings[i];
                if (!selectedListings.has(listing.id)) {
                    cList.push(listing);
                    selectedListings.add(listing.id);
                }
            }
        }
        
        // Sort each list by rankIndex
        aList.sort((a, b) => b.rankIndex - a.rankIndex);
        bList.sort((a, b) => b.rankIndex - a.rankIndex);
        cList.sort((a, b) => b.rankIndex - a.rankIndex);
        
        // Collect selection statistics
        const selectionStats = {
            keywordDistribution: {}
        };
        
        // Calculate keyword distribution for A list
        keywords.forEach(keyword => {
            selectionStats.keywordDistribution[keyword] = aList.filter(l => 
                l.keyword === keyword).length;
        });
        
        return {
            aList,
            bList,
            cList,
            selectionStats
        };
    }
    
    // Public API
    return {
        scoreAndRankListings,
        generateABCLists,
        normalizeMetrics
    };
})();
