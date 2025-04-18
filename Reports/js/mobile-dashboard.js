/**
 * Mobile Dashboard Functionality for Etsy Analytics
 * Handles mobile-specific interactions and responsive behavior
 */

$(document).ready(function() {
    // Only run mobile setup after the main dashboard is initialized
    // This ensures data is loaded properly first
    setTimeout(function() {
        setupMobileFilters();
        setupMobileNavigation();
    }, 500);
    
    // Handle window resize
    $(window).on('resize', function() {
        adjustForScreenSize();
    });
});

/**
 * Set up mobile filters
 */
function setupMobileFilters() {
    // Hook up mobile filter buttons to the main filter functions
    $('#mobile-apply-filters').on('click', function() {
        // First sync form values from mobile to main form
        syncMobileToMainForm();
        
        // Then call the main apply filters function
        applyFilters();
        
        // Hide the mobile filters section
        $('#mobile-filters-section').collapse('hide');
    });
    
    $('#mobile-reset-filters').on('click', function() {
        // Call the main reset filters function
        resetFilters();
        
        // Also reset the mobile form
        $('#mobile-filter-form')[0].reset();
        
        // Hide the mobile filters section
        $('#mobile-filters-section').collapse('hide');
    });
    
    // Mirror filter form content for mobile
    const filterForm = $('#filter-form').clone(true);
    
    // Remove the duplicate ID to avoid conflicts but keep the form structure
    filterForm.attr('id', 'mobile-filter-form');
    
    // Clear previous content and add the cloned form
    $('#mobile-filters-body').empty().append(filterForm);
    
    // Ensure the mobile filter form controls are properly initialized
    $('#mobile-filter-form input, #mobile-filter-form select').each(function() {
        const originalId = $(this).attr('id');
        if (originalId) {
            // Update ID to avoid duplicates
            const mobileId = 'mobile-' + originalId;
            $(this).attr('id', mobileId);
            
            // Update any associated labels
            $('label[for="' + originalId + '"]').attr('for', mobileId);
            
            // Sync values with the main form
            $(this).val($('#' + originalId).val());
        }
    });
}

/**
 * Set up mobile navigation
 */
function setupMobileNavigation() {
    // Mobile navigation click handling
    $('.mobile-nav-item').on('click', function(e) {
        e.preventDefault();
        
        // Update active status
        $('.mobile-nav-item').removeClass('active');
        $(this).addClass('active');
        
        const section = $(this).data('section');
        scrollToSection(section);
    });
}

/**
 * Scroll to a specific section
 */
function scrollToSection(section) {
    let targetElement;
    
    // Determine the target element based on section
    switch (section) {
        case 'visualization':
            targetElement = $('.card:has(#chart-view, #table-view)').first();
            break;
        case 'product-insights':
            targetElement = $('#product-insights-card');
            break;
        case 'marketing':
            targetElement = $('#marketing-recommendations-card');
            break;
        case 'age-analytics':
            targetElement = $('.card:contains("Age-Based Analytics")').first();
            break;
        default:
            targetElement = $('.dashboard-content').first();
    }
    
    // Scroll to the element if found
    if (targetElement && targetElement.length) {
        $('html, body').animate({
            scrollTop: targetElement.offset().top - 15
        }, 300);
    }
}

/**
 * Adjust UI elements based on screen size
 */
function adjustForScreenSize() {
    const isMobile = $(window).width() < 768;
    
    // Show/hide appropriate elements based on screen size
    if (isMobile) {
        // Display mobile navigation
        $('.mobile-nav').show();
        
        // Ensure filter toggle is visible
        $('#mobile-filters-toggle').removeClass('d-none');
        
        // Hide desktop filter sidebar if visible
        $('.filter-card').parent().addClass('d-none d-md-block');
    } else {
        // Hide mobile navigation on desktop
        $('.mobile-nav').hide();
        
        // Show desktop elements
        $('.d-none.d-md-block').removeClass('d-none d-md-block').addClass('d-block');
    }
}

/**
 * Synchronize mobile form values to main form
 */
function syncMobileToMainForm() {
    // For each input and select in the mobile form
    $('#mobile-filter-form input, #mobile-filter-form select').each(function() {
        // Get the mobile field ID and extract the original field ID
        const mobileId = $(this).attr('id');
        if (mobileId && mobileId.startsWith('mobile-')) {
            const originalId = mobileId.replace('mobile-', '');
            const value = $(this).val();
            
            // Copy the value to the corresponding field in the main form
            $('#' + originalId).val(value);
        }
    });
    
    console.log('Synced mobile form values to main form');
}

/**
 * Synchronize main form values to mobile form
 */
function syncMainToMobileForm() {
    // For each input and select in the main form
    $('#filter-form input, #filter-form select').each(function() {
        const originalId = $(this).attr('id');
        if (originalId) {
            const mobileId = 'mobile-' + originalId;
            const value = $(this).val();
            
            // Copy the value to the corresponding field in the mobile form
            $('#' + mobileId).val(value);
        }
    });
}
