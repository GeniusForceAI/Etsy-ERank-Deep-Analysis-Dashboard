/**
 * Multi-File UI Handler
 * Manages the user interface for the multi-file analysis dashboard
 */

const MultiFileUI = (function() {
    // Cache DOM elements
    const elements = {
        // File Upload Section
        uploadArea: document.getElementById('multi-upload-area'),
        fileInput: document.getElementById('csv-files-upload'),
        selectFilesBtn: document.getElementById('select-files-btn'),
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
        fileCount: document.getElementById('files-count'),
        listingsCount: document.getElementById('listings-count'),
        avgSales: document.getElementById('avg-sales'),
        
        // Lists Containers
        aListContainer: document.getElementById('a-list-container'),
        bListContainer: document.getElementById('b-list-container'),
        cListContainer: document.getElementById('c-list-container')
    };
    
    // File upload handling
    function initFileHandling() {
        // Click handler for file select button
        elements.selectFilesBtn.addEventListener('click', () => {
            elements.fileInput.click();
        });
        
        // File input change handler
        elements.fileInput.addEventListener('change', handleFilesSelected);
        
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
        
        // Handle file drop
        elements.uploadArea.addEventListener('drop', handleFileDrop);
        
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
     */
    function addFilesToList(files) {
        if (!files || files.length === 0) return;
        
        // Show the files list
        elements.filesList.style.display = 'block';
        
        // Process each file
        Array.from(files).forEach(file => {
            // Check if it's a CSV file
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                showNotification('Please upload only CSV files', 'error');
                return;
            }
            
            // Extract the keyword from the file name (before the extension)
            const fileName = file.name;
            const keyword = fileName.replace(/\.csv$/i, '').trim();
            
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
            
            // Add to data store
            MultiFileCore.addFile(file, keyword)
                .then(info => {
                    console.log(`Added file: ${info.file.name} with ${info.count} listings`);
                })
                .catch(err => {
                    console.error(`Error adding file: ${err.message}`);
                    showNotification(`Error adding file: ${err.message}`, 'error');
                    removeFile(fileItem, fileName, keyword);
                });
        });
        
        // Reset the file input
        elements.fileInput.value = '';
        
        // Update the process button state
        updateProcessButtonState();
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
