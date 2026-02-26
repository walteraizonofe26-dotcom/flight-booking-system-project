// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Book page loaded successfully');
    
    // Initialize components
    initTripTypeToggle();
    initDatePickers();
    initFlightSearchForm();
    initMobileMenu();
});

// ==========================================
// 1. UI STEP NAVIGATION (The "Fresh Page" logic)
// ==========================================
window.switchStep = function(stepNumber) {
    // 1. Hide the initial search view completely
    const initialView = document.getElementById('initial-search-view');
    if (initialView) initialView.style.display = 'none';

    // 2. Hide all step sections
    document.querySelectorAll('.step-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    // 3. Show the targeted step section
    const targetStep = document.getElementById('step-' + stepNumber);
    if (targetStep) {
        targetStep.style.display = 'block';
        targetStep.classList.add('active');
        // Scroll back to the top to simulate a fresh page load
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// ==========================================
// 2. TRIP TYPE: One Way vs Round Trip  if (!returnGroup) return;
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
            returnGroup.style.display = 'block';
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
        
        const passengers = {
            adults: parseInt(document.getElementById('adults').value) || 1,
            children: parseInt(document.getElementById('children').value) || 0,
            infants: parseInt(document.getElementById('infants').value) || 0
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
       switchStep(1); 
        const resultsDiv = document.getElementById('flight-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Searching flights...</div>';
        }

        fetch('/api/flights/search/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') // Required for Django POST
            },
            body: JSON.stringify({
                departure_city: fromCity,
                arrival_city: toCity,
                departure_date: departureDate,
                trip_type: tripType,
                return_date: tripType === 'round-trip' ? returnDate : null,
                passengers: passengers
            })
        })
        .then(response => {
            // stop here and show a readable error.
            if (!response.ok) {
                throw new Error(`Server Error: ${response.status}`);
             }
            return response.json();
        })
        .then(data => {
             if (data.success) {
                // This triggers the "Fresh Page" feel
                switchStep(1); 
                
                // You can now call a function to display the results
                // renderFlights(data.flights); 
                console.log('Outbound Flights found:', data.outbound_flights);
                renderFlightResults(data);
            } else {
                showError(data.message || 'No flights found for this route.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('An error occurred while searching. Please try again.');
        });
    });
}

// Helper function to get Django CSRF Token
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
    

// ==========================================
// 5. MOBILE MENU
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
window.showError = function(message) {
    removeAlerts(); // clear existing
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert-message error';
    errorDiv.style.color = '#d32f2f'; // Deeper red for better visibility
    errorDiv.style.marginBottom = '15px';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insert at the top of the search form
    const container = document.getElementById('flightSearchForm');
    if (container) container.insertBefore(errorDiv, container.firstChild);
    
    setTimeout(() => errorDiv.remove(), 4000);
};

window.removeAlerts = function() {
    document.querySelectorAll('.alert-message').forEach(alert => alert.remove());
};


function renderFlightResults(data) {
    const resultsDiv = document.getElementById('flight-results');
    if (!resultsDiv) return;

    if (data.outbound_flights.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">No outbound flights found for this date.</div>';
        return;
    }

    let html = '<h3>Outbound Flights</h3>';
    data.outbound_flights.forEach(flight => {
        html += `
            <div class="flight-card">
                <div class="flight-info">
                    <strong>${flight.airline}</strong> (${flight.flight_number})<br>
                    <span>${flight.departure_time} ➔ ${flight.arrival_time}</span>
                </div>
                <div class="flight-price">
                    $${flight.price}
                    <button class="select-btn" onclick="selectFlight(${flight.id})">Select</button>
                </div>
            </div>
        `;
    });
    
    // If round trip, add return flights
    if (data.return_flights && data.return_flights.length > 0) {
        html += '<h3 style="margin-top:30px">Return Flights</h3>';
        data.return_flights.forEach(flight => {
            html += `
                <div class="flight-card return-card">
                    <strong>${flight.airline}</strong> | ${flight.departure_time}
                    <button class="select-btn" onclick="selectFlight(${flight.id})">Select</button>
                </div>
            `;
        });
    }

    resultsDiv.innerHTML = html;
}