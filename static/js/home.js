// ===== HOMEPAGE JAVASCRIPT =====

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
    initPassengerSelector();
    initDatePickers();
    initFlightSearchForm();
    initMobileMenu();
    initMyBookingsForm();
});

// Search Tabs (Book Flights / My Bookings)
function initSearchTabs() {
    const tabs = document.querySelectorAll('.search-tab');
    const contents = document.querySelectorAll('.search-content');
    
    if (!tabs.length || !contents.length) {
        console.error('Search tabs or content not found');
        return;
    }
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
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
            
            console.log('Tab switched to:', tabId);
        });
    });
    
    console.log('Search tabs initialized');
}

// Trip Type Toggle (One Way / Round Trip)
function initTripTypeToggle() {
    const tripOptions = document.querySelectorAll('.trip-option');
    const returnDateGroup = document.querySelector('.return-date-group');
    const returnDateInput = document.getElementById('returnDate');
    
    if (!tripOptions.length) {
        console.error('Trip options not found');
        return;
    }
    
    // Set initial state
    if (returnDateGroup) {
        returnDateGroup.style.display = 'none';
    }
    
    tripOptions.forEach(option => {
        option.addEventListener('click', function() {
            const tripType = this.dataset.type;
            
            console.log('Trip type selected:', tripType);
            
            // Update active option
            tripOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Show/hide return date based on trip type
            if (returnDateGroup && returnDateInput) {
                if (tripType === 'round-trip') {
                    returnDateGroup.style.display = 'block';
                    returnDateInput.required = true;
                } else {
                    returnDateGroup.style.display = 'none';
                    returnDateInput.required = false;
                    returnDateInput.value = ''; // Clear return date
                }
            }
        });
    });
    
    console.log('Trip type toggle initialized');
}

// Passenger Selector
function initPassengerSelector() {
    const passengersDisplay = document.getElementById('passengersDisplay');
    const passengersDropdown = document.getElementById('passengersDropdown');
    const passengerButtons = document.querySelectorAll('.passenger-btn');
    const applyButton = document.getElementById('applyPassengers');
    
    if (!passengersDisplay || !passengersDropdown) {
        console.error('Passenger elements not found');
        return;
    }
    
    // Toggle dropdown
    passengersDisplay.addEventListener('click', function(e) {
        e.stopPropagation();
        passengersDropdown.classList.toggle('show');
    });
    
    // Handle passenger count changes
    passengerButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const type = this.dataset.type;
            const action = this.dataset.action;
            
            // Update count
            if (action === 'increase') {
                const max = type === 'infants' ? passengers.adults : 9;
                if (passengers[type] < max) {
                    passengers[type]++;
                }
            } else if (action === 'decrease') {
                const min = type === 'adults' ? 1 : 0;
                if (passengers[type] > min) {
                    passengers[type]--;
                }
            }
            
            // Update display and buttons
            updatePassengerDisplay(type);
            updatePassengerButtons(type);
        });
    });
    
    // Apply passenger selection
    if (applyButton) {
        applyButton.addEventListener('click', function(e) {
            e.stopPropagation();
            
            let displayText = `${passengers.adults} Adult${passengers.adults !== 1 ? 's' : ''}`;
            
            if (passengers.children > 0) {
                displayText += `, ${passengers.children} Child${passengers.children !== 1 ? 'ren' : ''}`;
            }
            
            if (passengers.infants > 0) {
                displayText += `, ${passengers.infants} Infant${passengers.infants !== 1 ? 's' : ''}`;
            }
            
            passengersDisplay.textContent = displayText;
            passengersDropdown.classList.remove('show');
            
            console.log('Passengers applied:', passengers);
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (passengersDisplay && passengersDropdown) {
            if (!passengersDisplay.contains(event.target) && !passengersDropdown.contains(event.target)) {
                passengersDropdown.classList.remove('show');
            }
        }
    });
    
    // Update passenger count display
    function updatePassengerDisplay(type) {
        const countElement = document.getElementById(`${type}Count`);
        if (countElement) {
            countElement.textContent = passengers[type];
        }
    }
    
    // Update button states (enable/disable)
    function updatePassengerButtons(type) {
        const decreaseBtn = document.querySelector(`.passenger-btn[data-type="${type}"][data-action="decrease"]`);
        const increaseBtn = document.querySelector(`.passenger-btn[data-type="${type}"][data-action="increase"]`);
        
        if (decreaseBtn) {
            const min = type === 'adults' ? 1 : 0;
            decreaseBtn.disabled = passengers[type] <= min;
        }
        
        if (increaseBtn) {
            const max = type === 'infants' ? passengers.adults : 9;
            increaseBtn.disabled = passengers[type] >= max;
        }
    }
    
    // Initialize display
    updatePassengerButtons('adults');
    updatePassengerButtons('children');
    updatePassengerButtons('infants');
    
    console.log('Passenger selector initialized');
}

// Initialize Date Pickers
function initDatePickers() {
    const departureInput = document.getElementById('departureDate');
    const returnInput = document.getElementById('returnDate');
    
    if (!departureInput) {
        console.error('Departure date input not found');
        return;
    }
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    departureInput.min = today;
    
    if (returnInput) {
        returnInput.min = today;
        
        // When departure date changes, update return date min
        departureInput.addEventListener('change', function() {
            if (this.value) {
                returnInput.min = this.value;
                
                // Clear return date if it's before new departure date
                if (returnInput.value && returnInput.value < this.value) {
                    returnInput.value = '';
                }
            }
        });
    }
    
    console.log('Date pickers initialized');
}

// Flight Search Form
function initFlightSearchForm() {
    const searchForm = document.getElementById('flightSearchForm');
    
    if (!searchForm) {
        console.error('Search form not found');
        return;
    }
    
    console.log('Flight search form found, adding submit listener...');
    
    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();
        console.log('Flight search form submitted!');
        
        // Get form data
        const fromCity = document.getElementById('fromCity');
        const toCity = document.getElementById('toCity');
        const departureDate = document.getElementById('departureDate');
        const returnDate = document.getElementById('returnDate');
        const activeTripOption = document.querySelector('.trip-option.active');
        
        // Validate elements exist
        if (!fromCity || !toCity || !departureDate) {
            console.error('Required form elements not found');
            showError('Form elements not found. Please refresh the page.');
            return;
        }
        
        // Get trip type
        let tripType = 'one-way'; // Default
        if (activeTripOption && activeTripOption.dataset.type) {
            tripType = activeTripOption.dataset.type;
        }
        
        // Build form data object
        const formData = {
            from: fromCity.value.trim(),
            to: toCity.value.trim(),
            departureDate: departureDate.value,
            tripType: tripType,
            passengers: {
                adults: passengers.adults,
                children: passengers.children,
                infants: passengers.infants
            }
        };
        
        console.log('Collected form data:', formData);
        
        // Validate required fields
        if (!formData.from) {
            showError('Please enter departure city');
            fromCity.focus();
            return;
        }
        
        if (!formData.to) {
            showError('Please enter destination city');
            toCity.focus();
            return;
        }
        
        if (formData.from.toLowerCase() === formData.to.toLowerCase()) {
            showError('Departure and destination cities must be different');
            toCity.focus();
            return;
        }
        
        if (!formData.departureDate) {
            showError('Please select departure date');
            departureDate.focus();
            return;
        }
        
        // Validate return date for round trip
        if (formData.tripType === 'round-trip') {
            if (!returnDate || !returnDate.value) {
                showError('Please select a return date for round trip');
                if (returnDate) returnDate.focus();
                return;
            }
            formData.returnDate = returnDate.value;
        }
        
        console.log('Form validation passed!');
        
        // Show loading state
        const searchBtn = searchForm.querySelector('.search-btn');
        if (searchBtn) {
            const originalText = searchBtn.innerHTML;
            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
            searchBtn.disabled = true;
            
            // Simulate search process
            setTimeout(function() {
                // Save search data to localStorage
                try {
                    localStorage.setItem('flightSearch', JSON.stringify(formData));
                    console.log('Saved to localStorage:', formData);
                    
                    // Show success message
                    showSuccess('Searching for flights... Redirecting to results');
                    
                    // Redirect to booking page
                    setTimeout(function() {
                        console.log('Redirecting to booking page...');
                        window.location.href = '/book/';
                    }, 1500);
                    
                } catch (error) {
                    console.error('Error saving to localStorage:', error);
                    showError('Error saving search data. Please try again.');
                    searchBtn.innerHTML = originalText;
                    searchBtn.disabled = false;
                }
            }, 1000);
        }
    });
    
    console.log('Flight search form initialized successfully');
}

// My Bookings Form
function initMyBookingsForm() {
    const bookingsForm = document.querySelector('.bookings-form');
    
    if (bookingsForm) {
        bookingsForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const bookingRef = document.getElementById('bookingRef');
            const bookingEmail = document.getElementById('bookingEmail');
            
            if (!bookingRef || !bookingEmail) {
                console.error('Booking form elements not found');
                return;
            }
            
            const refValue = bookingRef.value.trim();
            const emailValue = bookingEmail.value.trim();
            
            // Simple validation
            if (!refValue) {
                showError('Please enter your booking reference');
                bookingRef.focus();
                return;
            }
            
            if (!emailValue) {
                showError('Please enter your email address');
                bookingEmail.focus();
                return;
            }
            
            if (!isValidEmail(emailValue)) {
                showError('Please enter a valid email address');
                bookingEmail.focus();
                return;
            }
            
            // Simulate booking lookup
            console.log('Looking up booking:', { ref: refValue, email: emailValue });
            showSuccess('Searching for your booking...');
            
            // Clear form
            bookingRef.value = '';
            bookingEmail.value = '';
        });
    }
}

// Mobile Menu
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (!mobileMenuBtn || !navLinks) {
        console.warn('Mobile menu elements not found');
        return;
    }
    
    mobileMenuBtn.addEventListener('click', function() {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        console.log('Mobile menu toggled');
    });
    
    console.log('Mobile menu initialized');
}

// Utility Functions
function showError(message) {
    console.error('Error:', message);
    
    // Remove existing messages
    removeMessages();
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert-message error-message';
    errorDiv.innerHTML = `
        <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; border: 1px solid #f5c6cb; animation: slideDown 0.3s ease;">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Insert at top of form
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        if (form.querySelector('.form-grid') || form.querySelector('.bookings-form')) {
            form.insertBefore(errorDiv, form.firstChild);
        }
    });
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function showSuccess(message) {
    console.log('Success:', message);
    
    // Remove existing messages
    removeMessages();
    
    // Create success message
    const successDiv = document.createElement('div');
    successDiv.className = 'alert-message success-message';
    successDiv.innerHTML = `
        <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; border: 1px solid #c3e6cb; animation: slideDown 0.3s ease;">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Insert at appropriate location
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        if (form.querySelector('.form-grid') || form.querySelector('.bookings-form')) {
            form.insertBefore(successDiv, form.firstChild);
        }
    });
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 5000);
}

function removeMessages() {
    const messages = document.querySelectorAll('.alert-message');
    messages.forEach(msg => msg.remove());
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .fa-spinner {
        animation: spin 1s linear infinite;
    }
`;
document.head.appendChild(style);