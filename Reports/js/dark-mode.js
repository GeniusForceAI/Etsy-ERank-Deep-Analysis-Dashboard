/**
 * Dark Mode functionality for the Etsy Analytics Dashboard
 */

/**
 * Initialize dark mode based on saved preference
 */
function initDarkMode() {
    // Check for saved dark mode preference
    const darkModeEnabled = localStorage.getItem('darkModeEnabled') === 'true';
    
    // Set initial state
    if (darkModeEnabled) {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
}

/**
 * Toggle between dark and light mode
 */
function toggleDarkMode() {
    // Add transition class for smooth animation
    document.body.classList.add('theme-transition');
    
    // Toggle dark mode
    if (document.body.classList.contains('dark-mode')) {
        disableDarkMode();
        localStorage.setItem('darkModeEnabled', 'false');
    } else {
        enableDarkMode();
        localStorage.setItem('darkModeEnabled', 'true');
    }
    
    // If there's an active chart, redraw it with new theme colors
    if (chart) {
        updateChartTheme();
    }
    
    // Remove transition class after animation completes
    setTimeout(() => {
        document.body.classList.remove('theme-transition');
    }, 500);
}

/**
 * Enable dark mode
 */
function enableDarkMode() {
    document.body.classList.add('dark-mode');
    $('#dark-mode-toggle i').removeClass('fa-moon').addClass('fa-sun');
}

/**
 * Disable dark mode
 */
function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    $('#dark-mode-toggle i').removeClass('fa-sun').addClass('fa-moon');
}

/**
 * Update chart colors based on current theme
 */
function updateChartTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Set Chart.js defaults based on theme
    Chart.defaults.color = isDarkMode ? '#e0e0e0' : '#666';
    Chart.defaults.borderColor = isDarkMode ? '#444' : '#ddd';
    
    // Redraw the current chart
    updateChart();
}
