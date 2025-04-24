/**
 * Multi-File Analysis Core Module
 * Handles fundamental data processing for cross-keyword analysis
 */

const MultiFileCore = (function() {
    // Private variables
    let allListingsData = [];
    let keywordFiles = [];
    let listingsByKeyword = {};
    
    // Settings with defaults
    const settings = {
        weights: {
            revenue: 0.35,
            sales: 0.20,
            dailyViews: 0.15,
            efficiency: 0.15,
            hearts: 0.10,
            age: 0.05
        },
        tierThresholds: {
            highRevenue: 15,  // Top 15%
            conversion: 50,   // Views per sale threshold (lower is better)
            growth: 20,       // Daily views percentage threshold
            visibility: 20    // Total views relative to age threshold
        },
        normalization: 'percentile', // 'percentile', 'minmax', or 'zscore'
        selectionStrategy: 'balanced' // 'balanced', 'micro', or 'macro'
    };
    
    /**
     * Process a single file and extract its data
     * @param {File|Object} file - The file object or data object
     * @param {string} keyword - The keyword associated with this file
     * @returns {Promise} - Resolves with processed data
     */
    function processFile(file, keyword) {
        return new Promise((resolve, reject) => {
            // If we're given raw data instead of a file
            if (file.data) {
                const processedData = processRawData(file.data, keyword);
                resolve(processedData);
                return;
            }
            
            // Otherwise parse the file
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: function(header) {
                    // Normalize header names to handle different CSV formats
                    return header.trim();
                },
                dynamicTyping: function(field) {
                    // This logic is from the advanced-dashboard
                    const numericColumns = ['Listing Age (Days)', 'Total Views', 'Daily Views', 'Est. Sales', 'Hearts'];
                    const currencyColumns = ['Price', 'Est. Revenue'];
                    
                    if (numericColumns.includes(field)) {
                        return true;
                    }
                    if (currencyColumns.includes(field)) {
                        return false;
                    }
                    return false;
                },
                complete: function(results) {
                    console.log('Parsed CSV data:', results);
                    // Ensure we have data
                    if (results.data && results.data.length > 0) {
                        const processedData = processRawData(results.data, keyword);
                        console.log('Processed data:', processedData);
                        resolve(processedData);
                    } else {
                        console.error('No data found in file or parsing error', results);
                        reject(new Error('No data found in file'));
                    }
                },
                error: function(error) {
                    console.error('CSV parsing error:', error);
                    reject(error);
                }
            });
        });
    }
    
    /**
     * Process raw data from a parsed CSV file
     * @param {Array} data - The parsed CSV data
     * @param {string} keyword - The keyword associated with this data
     * @returns {Array} - The processed listings
     */
    function processRawData(data, keyword) {
        console.log('Processing raw data for keyword:', keyword, 'Data sample:', data.slice(0, 2));
        
        // Log the available columns to help with debugging
        if (data.length > 0) {
            console.log('Available columns:', Object.keys(data[0]));
        }
        
        // Process the data - convert from ERank format if needed
        const processedListings = data.map(item => {
            const listing = {};
            
            // Check if this is ERank format with 'Shop / Listing' column
            const hasShopListingKey = Object.keys(item).some(key => 
                key === 'Shop / Listing' || key.includes('Shop / Listing')
            );
            
            if (hasShopListingKey) {
                console.log('Processing ERank format listing');
                // ERank format like in advanced-dashboard
                // Extract shop name and listing title from the 'Shop / Listing' field
                const shopListingKey = Object.keys(item).find(key => 
                    key === 'Shop / Listing' || key.includes('Shop / Listing')
                );
                
                const shopListingValue = item[shopListingKey] || '';
                const parts = shopListingValue.split(':');
                
                if (parts.length >= 2) {
                    listing['Shop Name'] = parts[0].trim();
                    // The rest is the listing title (possibly with tags after it)
                    const titleAndTags = parts.slice(1).join(':');
                    const titleParts = titleAndTags.split('\n');
                    listing['Listing Title'] = titleParts[0].trim();
                } else {
                    listing['Shop Name'] = 'Unknown Shop';
                    listing['Listing Title'] = shopListingValue || 'Unknown Listing';
                }
                
                // Copy over the direct mappable fields
                const fieldMappings = {
                    'Listing Age (Days)': 'Listing Age (Days)',
                    'Total Views': 'Total Views',
                    'Daily Views': 'Daily Views',
                    'Daily Views %': 'Daily Views %',
                    'Hearts': 'Hearts',
                    'Price': 'Price',
                    'Est. Sales': 'Est. Sales',
                    'Est. Revenue': 'Est. Revenue'
                };
                
                Object.entries(fieldMappings).forEach(([sourceName, targetName]) => {
                    if (item[sourceName] !== undefined) {
                        // Handle currency fields
                        if (sourceName === 'Price' || sourceName === 'Est. Revenue') {
                            if (typeof item[sourceName] === 'string') {
                                // Remove currency symbols and convert to number
                                listing[targetName] = parseFloat(item[sourceName].replace(/[^0-9.]/g, '')) || 0;
                            } else {
                                listing[targetName] = Number(item[sourceName]) || 0;
                            }
                        } else {
                            // For numeric fields, ensure they're numbers
                            listing[targetName] = Number(item[sourceName]) || 0;
                        }
                    }
                });
                
                // If Daily Views % is missing, calculate it if possible
                if (!listing['Daily Views %'] && listing['Daily Views'] && listing['Total Views']) {
                    listing['Daily Views %'] = (listing['Daily Views'] / listing['Total Views'] * 100).toFixed(2);
                }
                
                // If Est. Revenue is missing but we have Price and Sales, calculate it
                if ((!listing['Est. Revenue'] || listing['Est. Revenue'] === 0) && 
                    listing['Price'] > 0 && listing['Est. Sales'] > 0) {
                    listing['Est. Revenue'] = listing['Price'] * listing['Est. Sales'];
                }
            } else {
                // Standard format - copy over fields directly
                Object.keys(item).forEach(key => {
                    listing[key] = item[key];
                });
                
                // Check for required fields with alternative names
                if (!listing['Listing Title']) {
                    listing['Listing Title'] = item['Title'] || item['Product Title'] || item['Item Title'] || 'Unknown Title';
                }
                
                if (!listing['Shop Name']) {
                    listing['Shop Name'] = item['Shop'] || item['Store Name'] || item['Vendor'] || 'Unknown Shop';
                }
                
                // Ensure numeric fields are actually numbers
                ['Total Views', 'Daily Views', 'Est. Sales', 'Hearts', 'Listing Age (Days)'].forEach(field => {
                    if (listing[field] !== undefined) {
                        listing[field] = Number(listing[field]) || 0;
                    }
                });
                
                // Clean up currency fields
                ['Price', 'Est. Revenue'].forEach(field => {
                    if (typeof listing[field] === 'string') {
                        listing[field] = parseFloat(listing[field].replace(/[^0-9.]/g, '')) || 0;
                    } else if (listing[field] !== undefined) {
                        listing[field] = Number(listing[field]) || 0;
                    }
                });
            }
            
            // Add calculated fields
            
            // Calculate views per sale (efficiency)
            if (listing['Est. Sales'] && listing['Est. Sales'] > 0) {
                listing['Views Per Sale'] = listing['Total Views'] / listing['Est. Sales'];
            } else {
                listing['Views Per Sale'] = Infinity;
            }
            
            // Calculate view to sales rate (conversion rate as percentage)
            if (listing['Total Views'] && listing['Total Views'] > 0) {
                listing['Sales Rate %'] = (listing['Est. Sales'] / listing['Total Views'] * 100).toFixed(2);
            } else {
                listing['Sales Rate %'] = 0;
            }
            
            // Add keyword to listing for cross-keyword analysis
            listing.keyword = keyword;
            
            // Generate a unique ID for the listing
            listing.id = `${keyword}-${listing['Shop Name']}-${listing['Listing Title']}`.replace(/\s+/g, '-').toLowerCase();
            
            return listing;
        }).filter(listing => {
            // Check if listing has a title - this is the only required field
            // We'll be much more lenient to make sure all items are processed
            const hasTitle = listing['Listing Title'] && listing['Listing Title'] !== 'Unknown Title';
            
            // For ERank data, even if metrics are 0, we'll accept the listing
            // We're removing the check for Total Views > 0 || Est. Sales > 0
            
            if (!hasTitle) {
                console.log('Filtering out listing due to missing title:', listing);
                return false;
            }
            
            // Accept all listings that have a title
            return true;
        });
        
        console.log(`Processed ${processedListings.length} valid listings for keyword '${keyword}'`);
        return processedListings;
    }
    
    /**
     * Updates the analysis settings
     * @param {Object} newSettings - The new settings to apply
     */
    function updateSettings(newSettings) {
        // Deep merge the settings
        if (newSettings.weights) {
            Object.assign(settings.weights, newSettings.weights);
            
            // Normalize weights to ensure they sum to 1
            const weightSum = Object.values(settings.weights).reduce((sum, weight) => sum + weight, 0);
            if (weightSum > 0) {
                Object.keys(settings.weights).forEach(key => {
                    settings.weights[key] = settings.weights[key] / weightSum;
                });
            }
        }
        
        if (newSettings.tierThresholds) {
            Object.assign(settings.tierThresholds, newSettings.tierThresholds);
        }
        
        if (newSettings.normalization) {
            settings.normalization = newSettings.normalization;
        }
        
        if (newSettings.selectionStrategy) {
            settings.selectionStrategy = newSettings.selectionStrategy;
        }
    }
    
    /**
     * Get the current analysis settings
     * @returns {Object} - The current settings
     */
    function getSettings() {
        return { ...settings };
    }
    
    /**
     * Add a file to the analysis
     * @param {File|Object} file - The file to add
     * @param {string} keyword - The keyword associated with this file
     * @returns {Promise} - Resolves when the file is processed
     */
    function addFile(file, keyword) {
        return new Promise((resolve, reject) => {
            // Check if we already have this file (by name if it's a File object)
            const existingIndex = keywordFiles.findIndex(kf => {
                if (file.name && kf.file.name) {
                    return kf.file.name === file.name && kf.keyword === keyword;
                }
                return false;
            });
            
            if (existingIndex >= 0) {
                reject(new Error('File already added'));
                return;
            }
            
            processFile(file, keyword)
                .then(listings => {
                    // Store the file and its processed listings
                    keywordFiles.push({ file, keyword, count: listings.length });
                    
                    // Store listings by keyword
                    if (!listingsByKeyword[keyword]) {
                        listingsByKeyword[keyword] = [];
                    }
                    listingsByKeyword[keyword] = listings;
                    
                    // Add to all listings
                    allListingsData = allListingsData.concat(listings);
                    
                    resolve({ file, keyword, count: listings.length });
                })
                .catch(reject);
        });
    }
    
    /**
     * Remove a file from the analysis
     * @param {string} fileName - The name of the file to remove
     * @param {string} keyword - The keyword associated with the file
     */
    function removeFile(fileName, keyword) {
        const fileIndex = keywordFiles.findIndex(kf => 
            kf.file.name === fileName && kf.keyword === keyword);
        
        if (fileIndex >= 0) {
            // Remove from keyword files array
            keywordFiles.splice(fileIndex, 1);
            
            // Remove associated listings
            if (listingsByKeyword[keyword]) {
                delete listingsByKeyword[keyword];
            }
            
            // Rebuild all listings
            rebuildAllListings();
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Rebuild the allListingsData array from listingsByKeyword
     */
    function rebuildAllListings() {
        allListingsData = [];
        
        Object.values(listingsByKeyword).forEach(listings => {
            allListingsData = allListingsData.concat(listings);
        });
    }
    
    /**
     * Clear all data
     */
    function clearAll() {
        allListingsData = [];
        keywordFiles = [];
        listingsByKeyword = {};
    }
    
    /**
     * Get all processed listings
     * @returns {Array} - All processed listings
     */
    function getAllListings() {
        return [...allListingsData];
    }
    
    /**
     * Get listings for a specific keyword
     * @param {string} keyword - The keyword to get listings for
     * @returns {Array} - The listings for the keyword
     */
    function getListingsByKeyword(keyword) {
        return listingsByKeyword[keyword] ? [...listingsByKeyword[keyword]] : [];
    }
    
    /**
     * Get all keyword files info
     * @returns {Array} - The keyword files info
     */
    function getKeywordFiles() {
        return [...keywordFiles];
    }
    
    /**
     * Get stats about the current data
     * @returns {Object} - Stats about the current data
     */
    function getStats() {
        const fileCount = keywordFiles.length;
        const listingCount = allListingsData.length;
        
        // Calculate average sales
        let totalSales = 0;
        allListingsData.forEach(listing => {
            totalSales += listing['Est. Sales'] || 0;
        });
        
        const avgSales = listingCount > 0 ? totalSales / listingCount : 0;
        
        return {
            fileCount,
            listingCount,
            avgSales,
            keywordCount: Object.keys(listingsByKeyword).length
        };
    }
    
    // Public API
    return {
        addFile,
        removeFile,
        clearAll,
        getAllListings,
        getListingsByKeyword,
        getKeywordFiles,
        getStats,
        updateSettings,
        getSettings
    };
})();
