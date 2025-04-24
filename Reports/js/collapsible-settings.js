/**
 * Floating Settings Button Controller
 * Handles the modal dialog for analytics settings
 */

document.addEventListener('DOMContentLoaded', function() {
    // Create the floating settings button
    const createFloatingButton = () => {
        const button = document.createElement('button');
        button.className = 'floating-settings-btn';
        button.id = 'floating-settings-btn';
        button.innerHTML = '<i class="fas fa-cog"></i>';
        button.setAttribute('type', 'button');
        button.setAttribute('aria-label', 'Open Analysis Settings');
        button.setAttribute('data-bs-toggle', 'modal');
        button.setAttribute('data-bs-target', '#settingsModal');
        document.body.appendChild(button);
        return button;
    };
    
    // Ensure the modal HTML is present in the document
    const ensureModalExists = () => {
        if (!document.getElementById('settingsModal')) {
            // Extract the settings content from existing section
            const settingsSection = document.querySelector('.card.floating-card');
            const settingsContent = settingsSection ? settingsSection.querySelector('.card-body') : null;
            
            if (settingsContent) {
                // Create modal structure
                const modalHTML = `
                <div class="modal fade settings-modal" id="settingsModal" tabindex="-1" aria-labelledby="settingsModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="settingsModalLabel"><i class="fas fa-sliders-h me-2"></i>Analysis Settings</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body" id="settingsModalBody">
                                <!-- Settings content will be inserted here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" id="applySettingsBtn">Apply & Close</button>
                            </div>
                        </div>
                    </div>
                </div>`;
                
                // Add modal to document
                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHTML;
                document.body.appendChild(modalContainer);
                
                // Clone the settings content into the modal
                const modalBody = document.getElementById('settingsModalBody');
                const clonedContent = settingsContent.cloneNode(true);
                modalBody.appendChild(clonedContent);
                
                // Add event listeners to the modal buttons
                setupModalEventListeners();
                
                // Hide the original settings section if it exists
                if (settingsSection && settingsSection.parentNode) {
                    settingsSection.parentNode.removeChild(settingsSection);
                }
            }
        }
    };
    
    // Set up event listeners for the modal
    const setupModalEventListeners = () => {
        const modal = document.getElementById('settingsModal');
        const applyBtn = document.getElementById('applySettingsBtn');
        
        if (applyBtn) {
            applyBtn.addEventListener('click', function() {
                // Trigger the recalculate functionality
                const recalculateBtn = document.getElementById('recalculate-analysis');
                if (recalculateBtn) {
                    recalculateBtn.click();
                }
                
                // Close the modal
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            });
        }
        
        // When modal is shown, ensure settings controls are properly synced
        if (modal) {
            modal.addEventListener('shown.bs.modal', function() {
                console.log('Settings modal opened');
                // Could add code here to sync settings if needed
            });
        }
    };
    
    // Initialize the floating button and modal
    const init = () => {
        // Wait for results dashboard to be ready
        const checkInterval = setInterval(() => {
            if (document.getElementById('results-dashboard')) {
                clearInterval(checkInterval);
                
                // Create components
                createFloatingButton();
                ensureModalExists();
                
                console.log('Floating settings button initialized');
            }
        }, 500);
    };
    
    // Start initialization
    init();
});
