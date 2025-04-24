/**
 * CSV Export Functionality for Multi-File Dashboard
 * Enhanced version with all data columns and improved debugging
 */

document.addEventListener('DOMContentLoaded', function() {
    // Debug the data structure when the page is loaded
    setTimeout(() => {
        if (window.analysisResults && window.analysisResults.aList && window.analysisResults.aList.length > 0) {
            console.log('===== DEBUG: FIRST A-LIST ITEM STRUCTURE =====');
            console.log(window.analysisResults.aList[0]);
            console.log('Object keys:', Object.keys(window.analysisResults.aList[0]));
            console.log('======================================');
        }
    }, 3000);
    
    // A-List Export
    const exportAListBtn = document.getElementById('export-a-list');
    if (exportAListBtn) {
        exportAListBtn.addEventListener('click', function() {
            exportToCSV('a', 'A-List');
        });
    }
    
    // B-List Export
    const exportBListBtn = document.getElementById('export-b-list');
    if (exportBListBtn) {
        exportBListBtn.addEventListener('click', function() {
            exportToCSV('b', 'B-List');
        });
    }
    
    // C-List Export
    const exportCListBtn = document.getElementById('export-c-list');
    if (exportCListBtn) {
        exportCListBtn.addEventListener('click', function() {
            exportToCSV('c', 'C-List');
        });
    }
    
    // Full Report Export
    const exportReportBtn = document.getElementById('export-report');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', function() {
            exportToCSV('all', 'Full-Report');
        });
    }
    
    /**
     * Export listings data to CSV file with enhanced debugging and all columns
     * @param {string} listType - Type of list to export (a, b, c, or all)
     * @param {string} fileNamePrefix - Name for the exported file
     */
    function exportToCSV(listType, fileNamePrefix) {
        // Debug: Log the current state of the window.analysisResults
        console.log(`Exporting ${listType} data...`);
        console.log('Analysis Results Keys:', window.analysisResults ? Object.keys(window.analysisResults) : 'No results');
        
        // Ensure we have analysis results
        if (!window.analysisResults) {
            alert('No analysis results available. Please complete the analysis first.');
            return;
        }
        
        let dataToExport = [];
        
        // Helper function to extract all properties from an item
        function extractFullListing(item) {
            // Try to access potential properties in different formats
            if (item.rawData) {
                console.log('Found rawData property:', Object.keys(item.rawData));
                return item.rawData;
            }
            
            console.log('Item keys:', Object.keys(item));
            return item;
        }
        
        // Get the appropriate data based on list type
        if (listType === 'all') {
            // Combine all lists with a type indicator
            if (window.analysisResults.aList && window.analysisResults.aList.length > 0) {
                window.analysisResults.aList.forEach(item => {
                    const listing = extractFullListing(item);
                    listing.listType = 'A-List';
                    dataToExport.push(listing);
                });
            }
            
            if (window.analysisResults.bList && window.analysisResults.bList.length > 0) {
                window.analysisResults.bList.forEach(item => {
                    const listing = extractFullListing(item);
                    listing.listType = 'B-List';
                    dataToExport.push(listing);
                });
            }
            
            if (window.analysisResults.cList && window.analysisResults.cList.length > 0) {
                window.analysisResults.cList.forEach(item => {
                    const listing = extractFullListing(item);
                    listing.listType = 'C-List';
                    dataToExport.push(listing);
                });
            }
        } else if (listType === 'a' && window.analysisResults.aList) {
            dataToExport = window.analysisResults.aList.map(extractFullListing);
        } else if (listType === 'b' && window.analysisResults.bList) {
            dataToExport = window.analysisResults.bList.map(extractFullListing);
        } else if (listType === 'c' && window.analysisResults.cList) {
            dataToExport = window.analysisResults.cList.map(extractFullListing);
        }
        
        if (dataToExport.length === 0) {
            alert(`No data available to export for ${fileNamePrefix}.`);
            return;
        }
        
        // Debug first item in export data
        console.log('First item to export:', dataToExport[0]);
        
        // Comprehensive set of fields that might be present based on actual data structure
        const allPossibleFields = [
            'Listing Title',       // Title of the listing
            'Shop Name',           // Name of the shop
            'Listing Age (Days)',  // Age of the listing in days
            'Total Views',         // Total views
            'Daily Views',         // Daily views
            'Hearts',              // Hearts/favorites
            'Price',               // Price
            'Est. Sales',          // Estimated sales
            'Est. Revenue',        // Estimated revenue
            'Daily Views %',       // Daily views percentage
            'Views Per Sale',      // Views per sale
            'Sales Rate %',        // Sales rate percentage
            'keyword',             // Keyword
            'id',                  // ID
            'compositeScore',      // Composite score
            'performanceTiers',    // Performance tiers
            'opportunityScore',    // Opportunity score
            'rankIndex'           // Rank index
        ];
        
        // If we're exporting all, include list type
        if (listType === 'all') {
            allPossibleFields.push('listType');
        }
        
        // The field names are already in a good format for CSV headers, so we'll just use them directly
        // with a few modifications for better readability
        const headerMap = {
            'Listing Title': 'Listing Title',
            'Shop Name': 'Shop Name',
            'Listing Age (Days)': 'Listing Age (Days)',
            'Total Views': 'Total Views',
            'Daily Views': 'Daily Views',
            'Hearts': 'Hearts',
            'Price': 'Price',
            'Est. Sales': 'Est. Sales',
            'Est. Revenue': 'Est. Revenue',
            'Daily Views %': 'Daily Views %',
            'Views Per Sale': 'Views Per Sale',
            'Sales Rate %': 'Sales Rate %',
            'keyword': 'Keyword',
            'id': 'ID',
            'compositeScore': 'Composite Score',
            'performanceTiers': 'Performance Tiers',
            'opportunityScore': 'Opportunity Score',
            'rankIndex': 'Rank',
            'listType': 'List Type'
        };
        
        // Find which fields actually exist in our data
        const fieldsInData = allPossibleFields.filter(field => {
            return dataToExport.some(item => item[field] !== undefined);
        });
        
        console.log('Fields found in data:', fieldsInData);
        
        // Since we're using the exact field names from the data, no deduplication is needed
        const fields = fieldsInData;
        
        console.log('Final fields for CSV:', fields);
        
        // Create CSV header row with nice column names
        const headerRow = fields.map(field => headerMap[field] || field).join(',');
        
        // Create data rows
        const rows = dataToExport.map(item => {
            return fields.map(field => {
                let value = item[field];
                
                // No alternate field names to try since we're using the exact keys from the data
                
                // Skip undefined/null values
                if (value === undefined || value === null) {
                    return '';
                }
                
                // Format numbers with proper decimal places
                if (typeof value === 'number') {
                    if (field === 'revenue' || field === 'price') return value.toFixed(2);
                    if (field === 'dailyViews' || field === 'viewsPerSale' || field === 'opportunityScore' || field === 'compositeScore') return value.toFixed(1);
                }
                
                // Format arrays (like tags)
                if (Array.isArray(value)) {
                    value = value.join('; ');
                }
                
                // Handle strings with commas, quotes or newlines by escaping them
                if (typeof value === 'string') {
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        // Escape double quotes by doubling them
                        value = value.replace(/"/g, '""');
                        return `"${value}"`;
                    }
                }
                
                return value;
            }).join(',');
        });
        
        // Combine header and rows
        const csvContent = [headerRow, ...rows].join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Format date for filename
        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        // Create filename
        const fileName = `etsy-${fileNamePrefix.toLowerCase()}-${formattedDate}.csv`;
        
        // Create and trigger download link
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`Exported ${dataToExport.length} records to ${fileName} with ${fields.length} columns`);
    }
});
