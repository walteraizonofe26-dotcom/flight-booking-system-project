
// Global passenger data
let passengers = {
    adults: 1,
    children: 0,
    infants: 0
};

// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Home page loaded successfully');
    
    // Initialize all components
    initSearchTabs();
    initTripTypeToggle();
    initPassengerSelector();  // ← NEW FIXED VERSION
    initDatePickers();
    initFlightSearchForm();
    initMobileMenu();
    initMyBookingsForm();
});

// Search Tabs (Book Flights / My Bookings)
function initSearchTabs() {
    const tabs = document.querySelectorAll('.search-tab');
    const contents = document.querySelectorAll('.search-content');
    
    if (!tabs.length) {
        console.error('Search tabs not found');
        return;
    }
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            console.log('Tab clicked:', tabId);
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            contents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    console.log('Search tabs initialized');
}

// Trip Type Toggle (One Way / Round Trip)
function initTripTypeToggle() {
    const tripOptions = document.querySelectorAll('.trip-option');
    const returnDateGroup = document.querySelector('.return-date-group');
    
    if (!tripOptions.length || !returnDateGroup) return;
    
    const activeType = document.querySelector('.trip-option.active').getAttribute('data-type');
    returnDateGroup.style.display = activeType === 'round-trip' ? 'block' : 'none';
      
    tripOptions.forEach(option => {
        option.addEventListener('click', function() {
            const tripType = this.getAttribute('data-type');
            console.log('Trip type selected:', tripType);
            
            // Update active option
            tripOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
           returnDateGroup.style.display = (tripType === 'round-trip') ? 'block' : 'none';
            
            // Clear return date if switching to one-way
            if (tripType === 'one-way') {
                document.getElementById('returnDate').value = '';
            }
        });
    });
}

function initPassengerSelector() {
    const passengers = {
        adults: 1,
        children: 0,
        infants: 0
    };

    const adultsField = document.getElementById('adultsField');
    const childrenField = document.getElementById('childrenField');
    const infantsField = document.getElementById('infantsField');

    function getLabel(count, type) {
        if (count === 0) {
            return type === 'children' ? '0 Child' : '0 Infant (< 2yrs)';
        }
        const singular = type === 'adults' ? 'Adult' : type === 'children' ? 'Child' : 'Infant';
        const plural = type === 'adults' ? 'Adults' : type === 'children' ? 'Children' : 'Infants';
        const label = count === 1 ? singular : plural;
        const age = type === 'adults' ? ' (12yrs+)' : type === 'children' ? ' (2 - 11yrs)' : ' (< 2yrs)';
        return `${count} ${label}${age}`;
    }

    function populateList(field, type, max, includeZero = false, age = '') {
        const ul = field.querySelector('.passenger-list');
        ul.innerHTML = '';
        const singular = type === 'adults' ? 'Adult' : type === 'children' ? 'Child' : 'Infant';
        const plural = type === 'adults' ? 'Adults' : type === 'children' ? 'Children' : 'Infants';
        const start = includeZero ? 0 : 1;
        for (let i = start; i <= max; i++) {
            const text = getLabel(i, type, singular, plural, age);
            const li = document.createElement('li');
            li.textContent = text;
            li.dataset.value = i;
            if (passengers[type] === i) li.classList.add('selected');
            li.addEventListener('click', () => {
                passengers[type] = i;
                field.querySelector('.field-text').textContent = text;
                ul.querySelectorAll('li').forEach(l => l.classList.remove('selected'));
                li.classList.add('selected');
                // ul.style.display = 'none';
                field.classList.remove('active');
                if (type === 'adults') populateInfants(); // Rebuild infants list
            });
            ul.appendChild(li);
        }
    }

    function populateInfants() {
        populateList(infantsField, 'infants', passengers.adults, true, ' (< 2yrs)');
        const currentText = getLabel(passengers.infants, 'infants', 'Infant', 'Infants', ' (< 2yrs)');
        infantsField.querySelector('.field-text').textContent = currentText;
    }

    // Initial population
    populateList(adultsField, 'adults', 9, false, ' (12yrs+)');
    populateList(childrenField, 'children', 6, true, ' (2 - 11yrs)');
    populateInfants();

    // Toggle dropdowns
document.querySelectorAll('.field-display').forEach(display => {
    display.addEventListener('click', function (e) {
        e.stopPropagation();

        const field = this.parentElement;

        // Close all dropdowns first
        document.querySelectorAll('.passenger-field').forEach(f => {
            f.classList.remove('active');
        });

        // Open current one
        field.classList.toggle('active');
    });
});

// Close when clicking outside
document.addEventListener('click', function () {
    document.querySelectorAll('.passenger-field').forEach(f => {
        f.classList.remove('active');
    });
});
}
//Initialize Date Pickers
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
                if (returnInput.value && returnInput.value < this.value) {
                    returnInput.value = '';
                }
            }
        });
    }
}

// Flight Search Form
function initFlightSearchForm() {
    const searchForm = document.getElementById('flightSearchForm');
    
    if (!searchForm) return;
    
    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const fromCity = document.getElementById('fromCity').value.trim();
        const toCity = document.getElementById('toCity').value.trim();
        const departureDate = document.getElementById('departureDate').value;
        const returnDate = document.getElementById('returnDate').value;
        const tripType = document.querySelector('.trip-option.active').getAttribute('data-type');
        
        // Validation
        if (!fromCity || !toCity || !departureDate) {
            showError('Please fill in all required fields');
            return;
        }
        
        if (fromCity.toLowerCase() === toCity.toLowerCase()) {
            showError('Departure and destination cannot be the same');
            return;
        }
        
        if (tripType === 'round-trip' && !returnDate) {
            showError('Please select return date for round trip');
            return;
        }
        
        // Save to localStorage and redirect
        const searchData = {
            from: fromCity,
            to: toCity,
            departureDate: departureDate,
            returnDate: returnDate || null,
            tripType: tripType,
            passengers: passengers
        };
        
        localStorage.setItem('flightSearch', JSON.stringify(searchData));
        window.location.href = '/book/';
    });
}

// Mobile Menu
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (!mobileMenuBtn || !navLinks) return;
    
    mobileMenuBtn.addEventListener('click', function() {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    });
}

// My Bookings Form
function initMyBookingsForm() {
    const bookingsForm = document.querySelector('.bookings-form');
    
    if (bookingsForm) {
        bookingsForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const bookingRef = document.getElementById('bookingRef').value.trim();
            const bookingEmail = document.getElementById('bookingEmail').value.trim();
            
            if (!bookingRef || !bookingEmail) {
                showError('Please fill in all fields');
                return;
            }
            
            if (!isValidEmail(bookingEmail)) {
                showError('Please enter a valid email');
                return;
            }
            
            // Simulate booking lookup
            console.log('Looking up booking:', bookingRef, bookingEmail);
            showSuccess('Searching for your booking...');
        });
    }
}

// Utility Functions
function showError(message) {
    const parent = document.querySelector('.search-section');
    
    if (!parent || !message) return; // Exit if no parent or message

    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert-message error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // if (before && parent.contains(before)) {
    //     parent.insertBefore(errorDiv, before);
    // } else {
    //     parent.appendChild(errorDiv); // Fallback to append if before not child
    // }
    
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert-message success';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.querySelector('.bookings-content').insertBefore(successDiv, document.querySelector('.bookings-form'));
    
    setTimeout(() => successDiv.remove(), 5000);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}