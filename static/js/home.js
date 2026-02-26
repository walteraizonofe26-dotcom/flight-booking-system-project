// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Home page loaded successfully');
    
    // Initialize components
    initTripTypeToggle();
    initDatePickers();
    initFlightSearchForm();
    initMobileMenu();
    initMyBookingsForm();
});

// ==========================================
// 1. TABS: Book Flights vs My Bookings
// ==========================================
// This function is called directly from the HTML onclick attributes
window.switchTab = function(tabId) {
    // 1. Update tab styling
    document.querySelectorAll('.search-tab').forEach(tab => {
        tab.classList.remove('active');
        // Check if the tab's onclick attribute contains the tabId we want to activate
        if (tab.getAttribute('onclick').includes(tabId)) {
            tab.classList.add('active');
        }
    });

    // 2. Hide all content sections and remove active class
    document.querySelectorAll('.search-content').forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });

    // 3. Show the targeted content section
    const activeContent = document.getElementById(tabId);
    if (activeContent) {
        activeContent.style.display = 'block';
        activeContent.classList.add('active');
    }
};

// ==========================================
// 2. TRIP TYPE: One Way vs Round Trip
// ==========================================
function initTripTypeToggle() {
    const tripRadios = document.querySelectorAll('input[name="tripType"]');
    const returnGroup = document.querySelector('.return-date-group');
    const returnInput = document.getElementById('returnDate');

    if (!returnGroup) return;

    function updateVisibility() {
        const selected = document.querySelector('input[name="tripType"]:checked').value;
        if (selected === 'one-way') {
            returnGroup.style.display = 'none';
            if (returnInput) returnInput.required = false;
        } else {
            returnGroup.style.display = 'flex';
            if (returnInput) returnInput.required = true;
        }
    }

    // Run on load and on change
    updateVisibility();
    tripRadios.forEach(radio => radio.addEventListener('change', updateVisibility));
}
// ==========================================
// 3. DATE PICKERS VALIDATION
// ==========================================
function initDatePickers() {
    const departureInput = document.getElementById('departureDate');
    const returnInput = document.getElementById('returnDate');
    
    if (!departureInput) return;
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    departureInput.min = today;
    
    if (returnInput) {
        returnInput.min = today;
        
        departureInput.addEventListener('change', function() {
            if (this.value) {
                returnInput.min = this.value;
                // If return date is before new departure date, clear it
                if (returnInput.value && returnInput.value < this.value) {
                    returnInput.value = '';
                }
            }
        });
    }
}

// ==========================================
// 4. FLIGHT SEARCH SUBMISSION
// ==========================================
function initFlightSearchForm() {
    const searchForm = document.getElementById('flightSearchForm');
    
    if (!searchForm) return;
    
    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const fromCity = document.getElementById('fromCity').value.trim();
        const toCity = document.getElementById('toCity').value.trim();
        const departureDate = document.getElementById('departureDate').value;
        const returnDate = document.getElementById('returnDate').value;
        const tripType = document.querySelector('input[name="tripType"]:checked').value;
        
        // Get passenger values directly from the horizontal inputs
        const passengerInputs = document.querySelectorAll('.passenger-row input[type="number"]');
        const passengers = {
            adults: passengerInputs[0] ? parseInt(passengerInputs[0].value) : 1,
            children: passengerInputs[1] ? parseInt(passengerInputs[1].value) : 0,
            infants: passengerInputs[2] ? parseInt(passengerInputs[2].value) : 0
        };
        
        // Validation
        if (!fromCity || !toCity || !departureDate) {
            showError('Please fill in all required fields (From, To, Departure Date).');
            return;
        }
        
        if (fromCity.toLowerCase() === toCity.toLowerCase()) {
            showError('Departure and destination cannot be the same city.');
            return;
        }
        
        if (tripType === 'round-trip' && !returnDate) {
            showError('Please select a return date for a round trip.');
            return;
        }
        
        // Save to localStorage and redirect
        const searchData = {
            from: fromCity,
            to: toCity,
            departureDate: departureDate,
            returnDate: tripType === 'one-way' ? null : returnDate,
            passengers: passengers
        };
        
        localStorage.setItem('flightSearch', JSON.stringify(searchData));
        window.location.href = '/book/'; // Make sure this matches your Django URL
    });
}

// ==========================================
// 5. MY BOOKINGS SUBMISSION
// ==========================================
function initMyBookingsForm() {
    const bookingsForm = document.querySelector('.bookings-form');
    
    if (!bookingsForm) return;
    
    bookingsForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const bookingRef = document.getElementById('bookingRef').value.trim();
        const bookingEmail = document.getElementById('bookingEmail').value.trim();
        
        if (!bookingRef || !bookingEmail) {
            showError('Please fill in your Booking Reference and Email.');
            return;
        }
        
        if (!isValidEmail(bookingEmail)) {
            showError('Please enter a valid email address.');
            return;
        }
        
        console.log('Looking up booking:', bookingRef, bookingEmail);
        showSuccess('Searching for your booking...');
    });
}

// ==========================================
// 6. MOBILE MENU
// ==========================================
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (!mobileMenuBtn || !navLinks) return;
    
    mobileMenuBtn.addEventListener('click', function() {
        navLinks.style.display = (navLinks.style.display === 'flex') ? 'none' : 'flex';
    });
}

// ==========================================
// UTILITY FUNCTIONS (Alerts & Validation)
// ==========================================
function showError(message) {
    removeAlerts(); // clear existing
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert-message error';
    errorDiv.style.color = 'red';
    errorDiv.style.marginBottom = '15px';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insert at the top of the search card
    const container = document.querySelector('.search-card');
    if (container) container.insertBefore(errorDiv, container.firstChild);
    
    setTimeout(() => errorDiv.remove(), 4000);
}

function showSuccess(message) {
    removeAlerts(); // clear existing
    const successDiv = document.createElement('div');
    successDiv.className = 'alert-message success';
    successDiv.style.color = 'green';
    successDiv.style.marginBottom = '15px';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    const container = document.querySelector('.bookings-content');
    if (container) container.insertBefore(successDiv, container.firstChild);
    
    setTimeout(() => successDiv.remove(), 4000);
}

function removeAlerts() {
    document.querySelectorAll('.alert-message').forEach(alert => alert.remove());
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}