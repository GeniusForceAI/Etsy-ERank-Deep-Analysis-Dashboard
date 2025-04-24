/**
 * Collapsible Settings Controller
 * Handles the animation and functionality of the collapsible settings panel
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get references to the elements
    const toggleButton = document.getElementById('toggle-settings');
    const settingsBody = document.getElementById('settings-body');
    const toggleIcon = toggleButton.querySelector('.toggle-icon');
    const toggleText = toggleButton.querySelector('.toggle-text');
    const resultsSections = document.querySelectorAll('.results-section');
    
    // Keep track of the settings panel state
    let isExpanded = false;
    
    // Initial state (closed)
    settingsBody.style.display = 'none';
    
    // Toggle function to handle the animation
    function toggleSettings() {
        isExpanded = !isExpanded;
        
        if (isExpanded) {
            // Show the settings panel
            settingsBody.style.display = 'block';
            // Let the browser register the display change before adding the class
            setTimeout(() => {
                settingsBody.classList.add('show');
                toggleButton.classList.add('active');
                toggleText.textContent = 'Hide Settings';
            }, 10);
        } else {
            // Hide the settings panel with animation
            settingsBody.classList.remove('show');
            toggleButton.classList.remove('active');
            toggleText.textContent = 'Show Settings';
            
            // Wait for animation to complete before hiding completely
            setTimeout(() => {
                settingsBody.style.display = 'none';
            }, 500); // Match this duration to the CSS transition time
        }
    }
    
    // Add click event listener to the toggle button
    toggleButton.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent default behavior of the button
        toggleSettings();
    });
    
    // Recalculate button should close the settings after applying changes
    const recalculateButton = document.getElementById('recalculate-analysis');
    if (recalculateButton) {
        recalculateButton.addEventListener('click', function() {
            // Only close if currently expanded
            if (isExpanded) {
                toggleSettings();
            }
        });
    }
});
