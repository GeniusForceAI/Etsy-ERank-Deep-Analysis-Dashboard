/**
 * Data Processor for Etsy Analytics Dashboard
 * Handles loading, parsing, and processing CSV data from ERank exports
 */

class DataProcessor {
    constructor() {
        this.rawData = [];
        this.processedData = {
            listings: [],
            summary: {},
            sellers: [],
            keywords: []
        };
        this.defaultDataPath = './Erank_Raw_Data/Keyword_Tool - Top Listings.csv';
    }

    /**
     * Loads data from the default CSV file
     */
    loadDefaultData() {
        return this.loadDataFromUrl(this.defaultDataPath);
    }

    /**
     * Loads data from a specified CSV URL
     * @param {string} url - The URL of the CSV file to load
     */
    loadDataFromUrl(url) {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results) => {
                    this.rawData = results.data;
                    this.processData();
                    resolve(this.processedData);
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                    reject(error);
                }
            });
        });
    }

    /**
     * Loads data from a File object (for user uploads)
     * @param {File} file - The CSV file to process
     */
    loadDataFromFile(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results) => {
                    this.rawData = results.data;
                    this.processData();
                    resolve(this.processedData);
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                    reject(error);
                }
            });
        });
    }

    /**
     * Process the raw CSV data into useful formats for visualization
     */
    processData() {
        // Process each listing
        this.processedData.listings = this.rawData.map(row => {
            // Parse the Shop / Listing field to extract shop and listing
            let shopListing = row['Shop / Listing'] || '';
            let shop = '';
            let listing = shopListing;
            
            // Split by colon if it exists
            if (shopListing.includes(':')) {
                [shop, listing] = shopListing.split(':', 2);
                // Clean up quotes
                if (shop.startsWith('"')) shop = shop.substring(1);
                if (listing.endsWith('"')) listing = listing.substring(0, listing.length - 1);
            }
            
            // Clean up price format (remove $ and commas)
            let price = typeof row['Price'] === 'string' 
                ? parseFloat(row['Price'].replace(/[$,]/g, '')) 
                : row['Price'] || 0;
            
            // Clean up estimated revenue format
            let estRevenue = typeof row['Est. Revenue'] === 'string' 
                ? parseFloat(row['Est. Revenue'].replace(/[$,]/g, '')) 
                : row['Est. Revenue'] || 0;
            
            return {
                shop: shop,
                listing: listing,
                fullDescription: shopListing,
                age: row['Listing Age (Days)'] || 0,
                totalViews: row['Total Views'] || 0,
                dailyViews: row['Daily Views'] || 0,
                estSales: row['Est. Sales'] || 0,
                price: price,
                estRevenue: estRevenue,
                hearts: row['Hearts'] || 0
            };
        });

        // Remove any invalid entries
        this.processedData.listings = this.processedData.listings.filter(item => 
            item.shop !== undefined && item.listing !== undefined);

        // Calculate summary metrics
        this.calculateSummaryMetrics();
        
        // Process seller data
        this.processSellersData();
        
        // Extract keywords
        this.extractKeywords();
    }

    /**
     * Calculate summary metrics from the processed listings
     */
    calculateSummaryMetrics() {
        const listings = this.processedData.listings;
        
        // Basic counts
        this.processedData.summary = {
            totalListings: listings.length,
            totalViews: listings.reduce((sum, item) => sum + item.totalViews, 0),
            totalDailyViews: listings.reduce((sum, item) => sum + item.dailyViews, 0),
            totalSales: listings.reduce((sum, item) => sum + item.estSales, 0),
            totalRevenue: listings.reduce((sum, item) => sum + item.estRevenue, 0),
            totalHearts: listings.reduce((sum, item) => sum + item.hearts, 0),
            averagePrice: listings.reduce((sum, item) => sum + item.price, 0) / listings.length || 0,
            priceRange: {
                min: Math.min(...listings.map(item => item.price)),
                max: Math.max(...listings.map(item => item.price))
            },
            ageRange: {
                min: Math.min(...listings.map(item => item.age)),
                max: Math.max(...listings.map(item => item.age))
            }
        };
        
        // Calculate price brackets for distribution analysis
        this.calculatePriceBrackets();
        
        // Calculate age distribution
        this.calculateAgeDistribution();
    }
    
    /**
     * Calculate price brackets for analysis
     */
    calculatePriceBrackets() {
        const listings = this.processedData.listings;
        const maxPrice = Math.max(...listings.map(item => item.price));
        
        // Create price brackets (adjust the number of brackets as needed)
        const bracketCount = 8;
        const bracketSize = maxPrice / bracketCount;
        
        let priceBrackets = [];
        
        for (let i = 0; i < bracketCount; i++) {
            const lowerBound = i * bracketSize;
            const upperBound = (i + 1) * bracketSize;
            
            const count = listings.filter(item => 
                item.price >= lowerBound && item.price < upperBound
            ).length;
            
            const totalViews = listings.filter(item => 
                item.price >= lowerBound && item.price < upperBound
            ).reduce((sum, item) => sum + item.totalViews, 0);
            
            const totalSales = listings.filter(item => 
                item.price >= lowerBound && item.price < upperBound
            ).reduce((sum, item) => sum + item.estSales, 0);
            
            priceBrackets.push({
                range: `$${lowerBound.toFixed(2)} - $${upperBound.toFixed(2)}`,
                count: count,
                totalViews: totalViews,
                totalSales: totalSales,
                averageViews: count > 0 ? totalViews / count : 0,
                averageSales: count > 0 ? totalSales / count : 0
            });
        }
        
        this.processedData.summary.priceBrackets = priceBrackets;
    }
    
    /**
     * Calculate age distribution for analysis
     */
    calculateAgeDistribution() {
        const listings = this.processedData.listings;
        const maxAge = Math.max(...listings.map(item => item.age));
        
        // Create age brackets
        const bracketCount = 6;
        const bracketSize = Math.ceil(maxAge / bracketCount);
        
        let ageBrackets = [];
        
        for (let i = 0; i < bracketCount; i++) {
            const lowerBound = i * bracketSize;
            const upperBound = (i + 1) * bracketSize;
            
            const count = listings.filter(item => 
                item.age >= lowerBound && item.age < upperBound
            ).length;
            
            const totalViews = listings.filter(item => 
                item.age >= lowerBound && item.age < upperBound
            ).reduce((sum, item) => sum + item.totalViews, 0);
            
            const totalSales = listings.filter(item => 
                item.age >= lowerBound && item.age < upperBound
            ).reduce((sum, item) => sum + item.estSales, 0);
            
            ageBrackets.push({
                range: `${lowerBound} - ${upperBound} days`,
                count: count,
                totalViews: totalViews,
                totalSales: totalSales,
                averageViews: count > 0 ? totalViews / count : 0,
                averageSales: count > 0 ? totalSales / count : 0
            });
        }
        
        this.processedData.summary.ageBrackets = ageBrackets;
    }
    
    /**
     * Process seller data to identify top sellers and market share
     */
    processSellersData() {
        const listings = this.processedData.listings;
        
        // Group by seller
        const sellerMap = new Map();
        
        listings.forEach(item => {
            if (!item.shop) return;
            
            if (!sellerMap.has(item.shop)) {
                sellerMap.set(item.shop, {
                    name: item.shop,
                    listingCount: 0,
                    totalViews: 0,
                    totalSales: 0,
                    totalRevenue: 0,
                    totalHearts: 0,
                    averagePrice: 0
                });
            }
            
            const sellerData = sellerMap.get(item.shop);
            sellerData.listingCount++;
            sellerData.totalViews += item.totalViews;
            sellerData.totalSales += item.estSales;
            sellerData.totalRevenue += item.estRevenue;
            sellerData.totalHearts += item.hearts;
            sellerData.averagePrice = sellerData.averagePrice + 
                (item.price - sellerData.averagePrice) / sellerData.listingCount;
        });
        
        // Convert to array and sort by views
        this.processedData.sellers = Array.from(sellerMap.values())
            .sort((a, b) => b.totalViews - a.totalViews);
    }
    
    /**
     * Extract keywords from listing titles for analysis
     */
    extractKeywords() {
        const listings = this.processedData.listings;
        const keywordMap = new Map();
        
        // Common words to exclude (stop words)
        const stopWords = new Set(['svg', 'png', 'for', 'and', 'the', 'with', 'file', 'files', 'a', 'to', 'in', 'of', 'on', 'by', 'or', 'your', 'my', 'me', 'we', 'us', 'our', 'you']);
        
        listings.forEach(item => {
            if (!item.listing) return;
            
            // Combine the full description to analyze
            const fullText = item.fullDescription;
            
            // Split by common delimiters and clean up
            const words = fullText.toLowerCase()
                .split(/[\s,:|\-\/"]+/)
                .map(word => word.trim())
                .filter(word => 
                    word.length > 2 && // Skip very short words
                    !stopWords.has(word) && // Skip common stop words
                    !word.match(/^\d+$/) // Skip numbers
                );
            
            // Count occurrences and associate with metrics
            words.forEach(word => {
                if (!keywordMap.has(word)) {
                    keywordMap.set(word, {
                        text: word,
                        count: 0,
                        totalViews: 0,
                        totalSales: 0,
                        listings: []
                    });
                }
                
                const keywordData = keywordMap.get(word);
                keywordData.count++;
                keywordData.totalViews += item.totalViews;
                keywordData.totalSales += item.estSales;
                keywordData.listings.push(item);
            });
        });
        
        // Convert to array and calculate averages
        this.processedData.keywords = Array.from(keywordMap.values())
            .map(keyword => ({
                ...keyword,
                averageViews: keyword.totalViews / keyword.listings.length,
                averageSales: keyword.totalSales / keyword.listings.length
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 100); // Limit to top 100 keywords
    }
    
    /**
     * Filter listings based on user criteria
     * @param {Object} filters - The filter criteria
     * @returns {Array} Filtered listings
     */
    filterListings(filters = {}) {
        return this.processedData.listings.filter(item => {
            // Apply price filter if specified
            if (filters.minPrice !== undefined && item.price < filters.minPrice) {
                return false;
            }
            
            if (filters.maxPrice !== undefined && item.price > filters.maxPrice) {
                return false;
            }
            
            // Apply age filter if specified
            if (filters.minAge !== undefined && item.age < filters.minAge) {
                return false;
            }
            
            if (filters.maxAge !== undefined && item.age > filters.maxAge) {
                return false;
            }
            
            // Apply keyword filter if specified
            if (filters.keyword && !item.fullDescription.toLowerCase().includes(filters.keyword.toLowerCase())) {
                return false;
            }
            
            // Apply shop filter if specified
            if (filters.shop && item.shop !== filters.shop) {
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * Sort listings based on specified field
     * @param {Array} listings - The listings to sort
     * @param {string} field - The field to sort by
     * @param {boolean} ascending - Whether to sort in ascending order
     * @returns {Array} Sorted listings
     */
    sortListings(listings, field = 'totalViews', ascending = false) {
        // Create a copy to avoid modifying the original
        const sorted = [...listings];
        
        sorted.sort((a, b) => {
            if (ascending) {
                return a[field] - b[field];
            } else {
                return b[field] - a[field];
            }
        });
        
        return sorted;
    }
}
