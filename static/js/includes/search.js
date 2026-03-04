/**
 * search.js - Controls Step 0 (Search Form) and Step 1 (Display Results)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle Trip Type Toggle (Horizontal)
    const tripRadios = document.querySelectorAll('input[name="tripType"]');
    const returnBox = document.getElementById('returnDateContainer');

    tripRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            bookingState.search.tripType = e.target.value;
            returnBox.style.display = (e.target.value === 'round-trip') ? 'block' : 'none';
        });
    });

    // 2. Handle Search Form Submit
    const searchForm = document.getElementById('flightSearchForm');
    searchForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Save passenger counts to global state for price calculations later
        bookingState.search.passengers.adults = parseInt(document.getElementById('adults').value);
        bookingState.search.passengers.children = parseInt(document.getElementById('children').value);
        bookingState.search.passengers.infants = parseInt(document.getElementById('infants').value);

        performSearch();
    });
});

function performSearch() {
    // Show Step 1 immediately and show loading
    switchStep(1);
    const resultsContainer = document.getElementById('flight-results-list');
    resultsContainer.innerHTML = '<p class="loading">Searching for flights...</p>';

    const searchData = {
        from_city: document.getElementById('fromCity').value,
        to_city: document.getElementById('toCity').value,
        departure_date: document.getElementById('departureDate').value,
        return_date: document.getElementById('returnDate').value || null,
        trip_type: bookingState.search.tripType
    };

    fetch('/api/flights/search/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(searchData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.outbound_flights.length > 0) {
            renderStep1Results(data.outbound_flights);
        } else {
            resultsContainer.innerHTML = '<div class="no-results">No flights found for these dates.</div>';
        }
    });
}

// RENDER STEP 1
function renderStep1Results(flights) {
    const list = document.getElementById('flight-results-list');
    // list.innerHTML = ''; // Clear loading message

    if (!list) return;

    list.innerHTML = flights.map(flight => {
        // Helper to format date into "04 March 2026"
        const formatDate = (dateStr) => {
            if(!dateStr || dateStr === "undefined") return "";
            const datePart = dateStr.split(' ')[0];
            const date = new Date(datePart);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        };
        // Helper to extract only the TIME (HH:MM) from a string like "2026-03-05 09:00"
        const extractTime = (dateStr) => {
            if(!dateStr || dateStr === "undefined") return "";
            return dateStr.includes(' ') ? dateStr.split(' ')[1] : dateTimeStr;
        };

        return `
            <div class="flight-selection-card">
            <div class="flight-header-box">
                <span class="header-label">Departing Flight:</span> 
                <span class="header-cities">${flight.departure_city} - ${flight.arrival_city}</span>
            </div>

            <div class="flight-main-content">
                <div class="info-column departure">
                    <span class="flight-time" style="font-size: 2rem;">${extractTime(flight.departure_time)}</span>
                    <span class="flight-location">${flight.departure_city}</span>
                    <span class="flight-date">${formatDate(flight.departure_time)}</span>
                </div>

                <div class="route-center-section">
                    <span class="duration-label">${flight.duration || 'Direct'}</span>
                    <div class="route-line"><i class="fas fa-plane plane-icon"></i>
                    </div>
                    <span class="stop-status">Nonstop</span>
                </div>

                <div class="info-column arrival">
                    <span class="flight-time" style="font-size: 2rem;">${extractTime(flight.arrival_time)}</span>
                    <span class="flight-location">${flight.arrival_city}</span>
                    <span class="flight-date">${formatDate(flight.arrival_time)}</span>
                </div>
            </div>

            <div class="flight-footer">
                <div class="price-info">
                <span class="price-amount" style="font-size: 1.8rem; color: #003366;">$${flight.price.toLocaleString()}</span>
                </div>
                <button class="select-flight-primary-btn" 
                        onclick="handleFlightSelection(${flight.id}, ${flight.price})"
                        ${flight.seats_available <= 0 ? 'disabled' : ''}>
                    Select Flight
                </button>
            </div>
        </div>
    `; }).join('');
}
// A SELECT FLIGHT
function handleFlightSelection(id, price) {
    // Save selection to global state
    bookingState.selectedFlight = { id, price };
    
    // Setup Step 2 (Passenger forms) based on counts from Step 0
    if (typeof setupPassengerForm === "function") {
        setupPassengerForm(); 
    }
    
    // Move to Step 2
    switchStep(2);
}  

function modifySearch() {
    // Simply switch back to step 0
    switchStep(0);
}