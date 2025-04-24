/**
 * Multi-File UI Handler
 * Manages the user interface for the multi-file analysis dashboard
 */

const MultiFileUI = (function() {
    // Flag to track initialization
    let isInitialized = false;
    
    // Cache DOM elements
    const elements = {
        // File Upload Section
        uploadArea: document.getElementById('multi-upload-area'),
        fileInput: document.getElementById('csv-files-upload'),
        selectFilesBtn: document.getElementById('select-files-btn-unique'),
        filesList: document.getElementById('files-list'),
        filesContainer: document.getElementById('files-container'),
        clearFilesBtn: document.getElementById('clear-files'),
        processFilesBtn: document.getElementById('process-files'),
        useSampleDataBtn: document.getElementById('use-sample-multi-data'),
        
        // Loading Section
        loadingSection: document.getElementById('loading-section'),
        loadingMessage: document.getElementById('loading-message'),
        processProgress: document.getElementById('process-progress'),
        successMessage: document.getElementById('success-message'),
        
        // Results Dashboard
        resultsDashboard: document.getElementById('results-dashboard'),
        dailyViews: document.getElementById('daily-views'),
        viewsPerSale: document.getElementById('views-per-sale'),
        marketRevenue: document.getElementById('market-revenue'),
        
        // Lists Containers
        aListContainer: document.getElementById('a-list-container'),
        bListContainer: document.getElementById('b-list-container'),
        cListContainer: document.getElementById('c-list-container')
    };
    
    // File upload handling
    function initFileHandling() {
        // Global flag to track dialog state
        let fileDialogRecentlyOpened = false;
        let dialogOpenCounter = 0;
        
        // Install global click tracker
        document.addEventListener('click', function(e) {
            console.log('DEBUG - Document click detected on:', e.target.tagName, e.target.id || e.target.className);
        }, true);
        
        // Monitor file input
        const originalClick = HTMLInputElement.prototype.click;
        HTMLInputElement.prototype.click = function() {
            if (this.type === 'file') {
                dialogOpenCounter++;
                console.log('=== FILE DIALOG OPEN #' + dialogOpenCounter + ' ===');
                console.log('Caller:', new Error().stack);
                console.trace('Dialog open trace');
            }
            return originalClick.apply(this, arguments);
        };

        // Select files button - with one-time flag hack
        elements.selectFilesBtn.addEventListener('click', function(e) {
            console.log('DEBUG - Button click handler - ID:', e.currentTarget.id);
            // Prevent event from propagating to avoid double-click issues
            e.preventDefault();
            e.stopPropagation();
            
            // Check if dialog was recently opened - prevents immediate reopening
            if (fileDialogRecentlyOpened) {
                console.log('DEBUG - Preventing dialog reopen - was recently opened');
                return;
            }
            
            // Set flag to prevent reopening
            fileDialogRecentlyOpened = true;
            console.log('DEBUG - Setting file dialog opened flag - preventing reopens');
            
            // Clear flag after a short delay
            setTimeout(function() {
                fileDialogRecentlyOpened = false;
                console.log('DEBUG - File dialog flag cleared - can open again');
            }, 1500); // Longer delay to be safer
            
            // Reset file input value to ensure change event fires even if same files are selected
            elements.fileInput.value = '';
            
            console.log('DEBUG - About to trigger file dialog from button handler');
            // Manually trigger file dialog
            elements.fileInput.click();
        });

        // File input change handler
        elements.fileInput.addEventListener('change', function(e) {
            console.log(`File input change detected with ${this.files.length} files`);
            
            // Only process if we have files and input hasn't been processed already
            if (this.files && this.files.length > 0) {
                const filesArray = Array.from(this.files);
                console.log('Processing files:', filesArray.map(f => f.name).join(', '));
                
                // Process the files with our multi-file handler
                addFilesToList(this.files);
            }
        });
        
        // Drag and drop functionality
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            elements.uploadArea.addEventListener(eventName, preventDefaults);
        });
        
        // Highlight drop area when dragging over it
        ['dragenter', 'dragover'].forEach(eventName => {
            elements.uploadArea.addEventListener(eventName, () => {
                elements.uploadArea.classList.add('highlight');
            });
        });
        
        // Remove highlight when dragging leaves drop area
        ['dragleave', 'drop'].forEach(eventName => {
            elements.uploadArea.addEventListener(eventName, () => {
                elements.uploadArea.classList.remove('highlight');
            });
        });
        
        // Handle file drop - with one-time flag protection
        elements.uploadArea.addEventListener('drop', function(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            // Check if dialog was recently opened - prevents weird interactions
            if (fileDialogRecentlyOpened) {
                console.log('File dialog was recently opened, waiting before processing drop');
                // Still prevent defaults but delay processing
                setTimeout(function() {
                    if (files && files.length > 0) {
                        console.log(`Drop detected with ${files.length} files (delayed processing)`);
                        addFilesToList(files);
                    }
                }, 500);
                return;
            }
            
            if (files && files.length > 0) {
                console.log(`Drop detected with ${files.length} files`);
                // Set flag to prevent reopening
                fileDialogRecentlyOpened = true;
                setTimeout(function() { fileDialogRecentlyOpened = false; }, 1000);
                
                addFilesToList(files);
            }
        });
        
        // Clear files button
        elements.clearFilesBtn.addEventListener('click', clearFiles);
        
        // Process files button
        elements.processFilesBtn.addEventListener('click', processFiles);
        
        // Sample data button
        elements.useSampleDataBtn.addEventListener('click', loadSampleData);
    }
    
    /**
     * Prevent default behavior for events
     */
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    /**
     * Handle files selected via the file input
     */
    function handleFilesSelected(e) {
        const files = e.target.files;
        addFilesToList(files);
    }
    
    /**
     * Handle files dropped onto the drop area
     */
    function handleFileDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        addFilesToList(files);
    }
    
    /**
     * Add files to the files list UI and storage
     * @returns {Promise} Promise that resolves when all files are processed
     */
    function addFilesToList(files) {
        if (!files || files.length === 0) {
            console.log('No files to add');
            return Promise.resolve();
        }
        
        console.log(`Adding ${files.length} files to list`);
        
        // Show the files list
        elements.filesList.style.display = 'block';
        
        // Create an array to store all the file processing promises
        const filePromises = [];
        const validFiles = [];
        
        // First validate all files
        Array.from(files).forEach(file => {
            // Check if it's a CSV file
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                showNotification(`File ${file.name} is not a CSV file. Please upload only CSV files.`, 'error');
            } else {
                validFiles.push(file);
            }
        });
        
        if (validFiles.length === 0) {
            return Promise.resolve();
        }
        
        // Show a notification for multiple files
        if (validFiles.length > 1) {
            showNotification(`Processing ${validFiles.length} CSV files...`, 'info');
        }
        
        // Process each valid file
        validFiles.forEach(file => {
            // Extract the keyword from the file name (before the extension)
            const fileName = file.name;
            const keyword = fileName.replace(/\.csv$/i, '').trim();
            
            // Check if file already exists in the list
            const existingItem = Array.from(elements.filesContainer.children).find(
                item => item.dataset.fileName === fileName && item.dataset.keyword === keyword
            );
            
            if (existingItem) {
                console.log(`File ${fileName} already added, skipping`);
                return; // Skip this file
            }
            
            // Create a file item element
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.dataset.fileName = fileName;
            fileItem.dataset.keyword = keyword;
            
            fileItem.innerHTML = `
                <span class="file-name">${fileName}</span>
                <span class="keyword-tag">${keyword}</span>
                <span class="remove-file" title="Remove file"><i class="fas fa-times"></i></span>
            `;
            
            // Add remove handler
            const removeButton = fileItem.querySelector('.remove-file');
            removeButton.addEventListener('click', () => {
                removeFile(fileItem, fileName, keyword);
            });
            
            // Add to UI
            elements.filesContainer.appendChild(fileItem);
            
            // Add to data store - log file info for debugging
            console.log(`Adding file: ${file.name}, Size: ${file.size}, Type: ${file.type}, Keyword: ${keyword}`);
            
            // Store the promise for this file
            const filePromise = MultiFileCore.addFile(file, keyword)
                .then(info => {
                    console.log(`Added file: ${info.file.name} with ${info.count} listings`);
                    if (validFiles.length === 1) {
                        // Only show individual notifications for single file uploads
                        showNotification(`Added file: ${info.file.name} with ${info.count} listings`, 'success');
                    }
                    return info;
                })
                .catch(err => {
                    console.error(`Error adding file: ${err.message}`);
                    showNotification(`Error adding file: ${file.name} - ${err.message}`, 'error');
                    removeFile(fileItem, fileName, keyword);
                    throw err; // Propagate the error
                });
            
            filePromises.push(filePromise);
        });
        
        // Update the process button state
        updateProcessButtonState();
        
        // Return a promise that resolves when all files have been processed
        return Promise.all(filePromises)
            .then(results => {
                console.log(`All ${filePromises.length} files processed successfully`);
                if (filePromises.length > 1) {
                    showNotification(`Successfully added ${filePromises.length} files`, 'success');
                }
                return results;
            })
            .catch(err => {
                console.error('Error processing one or more files:', err);
                // We don't need to show an error notification here since individual errors are already shown
                return []; // Return empty array instead of re-throwing to allow partial successes
            });
    }
    
    /**
     * Remove a file from the list and data store
     */
    function removeFile(fileItem, fileName, keyword) {
        // Remove from data store
        MultiFileCore.removeFile(fileName, keyword);
        
        // Remove from UI
        if (fileItem && fileItem.parentNode) {
            fileItem.parentNode.removeChild(fileItem);
        }
        
        // Hide the list if empty
        if (elements.filesContainer.children.length === 0) {
            elements.filesList.style.display = 'none';
        }
        
        // Update the process button state
        updateProcessButtonState();
    }
    
    /**
     * Clear all files
     */
    function clearFiles() {
        // Clear data store
        MultiFileCore.clearAll();
        
        // Clear UI
        elements.filesContainer.innerHTML = '';
        elements.filesList.style.display = 'none';
        
        // Update the process button state
        updateProcessButtonState();
    }
    
    /**
     * Update the state of the process button based on file count
     */
    function updateProcessButtonState() {
        const fileCount = elements.filesContainer.children.length;
        elements.processFilesBtn.disabled = fileCount === 0;
    }
    
    /**
     * Load sample data for testing
     */
    function loadSampleData() {
        // Sample data files with keywords
        const sampleKeywords = [
            'digital download',
            'personalized gift',
            'wall art',
            'printable planner',
            'handmade jewelry'
        ];
        
        // Show loading
        showLoading('Loading sample data...');
        
        // Clear any existing files
        clearFiles();
        
        // Generate sample data for each keyword
        const promises = sampleKeywords.map(keyword => {
            // Create sample data
            const sampleData = generateSampleDataForKeyword(keyword);
            
            // Create a sample file object
            const sampleFile = {
                name: `${keyword}.csv`,
                data: sampleData
            };
            
            // Add to data store
            return MultiFileCore.addFile(sampleFile, keyword);
        });
        
        // When all sample data is loaded
        Promise.all(promises)
            .then(results => {
                // Show the files in the UI
                results.forEach(info => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.dataset.fileName = info.file.name;
                    fileItem.dataset.keyword = info.keyword;
                    
                    fileItem.innerHTML = `
                        <span class="file-name">${info.file.name}</span>
                        <span class="keyword-tag">${info.keyword}</span>
                        <span class="badge bg-info ms-2">${info.count} listings</span>
                        <span class="remove-file" title="Remove file"><i class="fas fa-times"></i></span>
                    `;
                    
                    // Add remove handler
                    const removeButton = fileItem.querySelector('.remove-file');
                    removeButton.addEventListener('click', () => {
                        removeFile(fileItem, info.file.name, info.keyword);
                    });
                    
                    // Add to UI
                    elements.filesContainer.appendChild(fileItem);
                });
                
                // Show the files list
                elements.filesList.style.display = 'block';
                
                // Update the process button state
                updateProcessButtonState();
                
                // Hide loading
                hideLoading();
                
                // Show success notification
                showNotification('Sample data loaded successfully!', 'success');
            })
            .catch(err => {
                console.error('Error loading sample data:', err);
                hideLoading();
                showNotification('Error loading sample data', 'error');
            });
    }
    
    /**
     * Generate sample data for a keyword
     */
    function generateSampleDataForKeyword(keyword) {
        // Number of listings to generate
        const listingCount = 50 + Math.floor(Math.random() * 50); // 50-100 listings
        
        // Generate listings
        const listings = [];
        
        for (let i = 0; i < listingCount; i++) {
            // Create shop name
            const shopName = `Shop${Math.floor(Math.random() * 1000)}${keyword.replace(/\s+/g, '')}`;
            
            // Create listing title with keyword
            const adjectives = ['Beautiful', 'Amazing', 'Premium', 'Custom', 'Unique', 'Handmade', 'High-Quality'];
            const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
            const title = `${adjective} ${keyword} for ${['Home', 'Gift', 'Office', 'Wedding', 'Birthday'][Math.floor(Math.random() * 5)]}`;
            
            // Generate random metrics
            const listingAge = Math.floor(Math.random() * 365) + 1; // 1-365 days
            const totalViews = Math.floor(Math.random() * 10000) + 100; // 100-10000 views
            const dailyViews = Math.max(1, Math.floor(totalViews / listingAge)); // Calculate reasonable daily views
            const dailyViewsPct = (dailyViews / totalViews * 100).toFixed(2);
            const hearts = Math.floor(Math.random() * 500); // 0-500 hearts
            
            // Generate realistic price and sales data
            const price = (Math.random() * 100 + 5).toFixed(2); // $5-$105
            let sales = Math.floor(Math.random() * 100); // 0-100 sales
            
            // For some listings, make them high performers
            if (Math.random() < 0.2) { // 20% chance of being a high performer
                sales = Math.floor(Math.random() * 400) + 100; // 100-500 sales
            }
            
            // Calculate revenue
            const revenue = (price * sales).toFixed(2);
            
            // Create the listing object
            const listing = {
                'Shop Name': shopName,
                'Listing Title': title,
                'Listing Age (Days)': listingAge,
                'Total Views': totalViews,
                'Daily Views': dailyViews,
                'Daily Views %': dailyViewsPct,
                'Hearts': hearts,
                'Price': `$${price}`,
                'Est. Sales': sales,
                'Est. Revenue': `$${revenue}`
            };
            
            listings.push(listing);
        }
        
        return listings;
    }
    
    /**
     * Show loading state
     */
    function showLoading(message) {
        const uploadContainer = document.getElementById('upload-container');
        if (uploadContainer) uploadContainer.style.display = 'none';
        
        if (elements.loadingMessage) {
            elements.loadingMessage.style.display = 'block';
            
            const loadingText = elements.loadingMessage.querySelector('p');
            if (loadingText) loadingText.textContent = message || 'Loading...';
        }
    }
    
    /**
     * Hide loading state
     */
    function hideLoading() {
        const uploadContainer = document.getElementById('upload-container');
        if (uploadContainer) uploadContainer.style.display = 'block';
        
        if (elements.loadingMessage) elements.loadingMessage.style.display = 'none';
    }
    
    /**
     * Process the files and run the analysis
     */
    function processFiles() {
        // Prevent redundant processing
        if (elements.loadingSection && elements.loadingSection.style.display === 'block') {
            console.log('Already processing files, ignoring duplicate request');
            return;
        }
        
        // Ensure we have files to process
        if (MultiFileCore.getFileCount() === 0) {
            // If no files uploaded yet but we have files in the input, process those first
            const inputFiles = elements.fileInput.files;
            if (inputFiles && inputFiles.length > 0) {
                // We have files in the input but they weren't processed yet
                // This happens especially on mobile
                addFilesToList(inputFiles).then(() => {
                    // Now process after files are added
                    processFilesInternal();
                }).catch(err => {
                    console.error('Error adding files before processing:', err);
                    showNotification('Error processing files: ' + err.message, 'error');
                });
                return;
            } else {
                showNotification('Please upload at least one CSV file first', 'warning');
                return;
            }
        }
        
        // Process files normally
        processFilesInternal();
    }
    
    /**
     * Internal implementation of file processing
     * @private
     */
    function processFilesInternal() {
        // Show loading state
        showLoading('Processing files for analysis...');
        
        // Call the MultiFileAnalysis processFiles function
        if (typeof window.processFiles === 'function') {
            window.processFiles();
        } else {
            // Fallback implementation if the global function is not available
            console.error('processFiles function not found in global scope');
            hideLoading();
            showNotification('Error processing files: Implementation not found', 'error');
        }
    }
    
    /**
     * Show a notification
     */
    function showNotification(message, type = 'info') {
        // Use the toast notification system if available
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            // Fallback to alert
            alert(message);
        }
    }
    
    // Initialize the module
    function init() {
        // Check if already initialized to prevent duplicate event handlers
        if (isInitialized) {
            console.log('MultiFileUI already initialized - skipping to prevent duplicate handlers');
            return;
        }
        
        console.log('Initializing MultiFileUI - adding event handlers');
        if (elements.uploadArea) {
            initFileHandling();
            // Set initialization flag to prevent duplicate initialization
            isInitialized = true;
        } else {
            console.error('Upload area element not found');
        }
    }
    
    // Public API
    return {
        init,
        showLoading,
        hideLoading,
        processFiles,
        showNotification,
        addFilesToList,  // This needs to be exposed for direct calling
        removeFile,
        clearFiles,
        loadSampleData
    };
})();

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    MultiFileUI.init();
});
