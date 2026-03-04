/**
 * Global Booking State
 * This object holds all user selections without refreshing the page.
 */
const bookingState = {
    search: {
        tripType: 'one-way',
        passengers: { adults: 1, children: 0, infants: 0 }
    },
    selectedFlight: null,
    passengers: []
};

/**
 * switchStep(stepNumber)
 * Controls which div is visible. 0 = Search, 1 = Results, etc.
 */
function switchStep(stepNumber) {
    // Hide all step sections
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove("active");
    });

    // Show the target section
    const target = document.getElementById(`step-${stepNumber}`);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0); // Reset scroll for a fresh feel
    }
}

/**
 * getCookie(name)
 * Utility to fetch the CSRF token for secure Django backend communication.
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Global Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    switchStep(0);
    console.log("Booking Controller Initialized");
    // Mobile menu and other page-wide UI logic can go here
});



