/**
 * search.js - Controls Step 0 (Search Form) and Step 1 (Display Results)
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

document.addEventListener('DOMContentLoaded', () => {
    initTripTypeToggle();
    initSearchForm();
});

/* ==============================
   TRIP TYPE TOGGLE
============================== */
function initTripTypeToggle() {
    const radios = document.querySelectorAll('input[name="tripType"]');
    const returnBox = document.getElementById('returnDateContainer');
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const value = e.target.value;
            if (bookingState && bookingState.search) {
                bookingState.search.trip_type = value;
            }
            if (returnBox) {
                returnBox.style.display = (value === 'round-trip') ? 'block' : 'none';
            }
        });
    });
}

/* SEARCH FORM*/
function initSearchForm() {
    const form = document.getElementById('flightSearchForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        performSearch();
    });
}

/*  PERFORM SEARCH*/
function performSearch() {
    // 1. SAVE STATE SAFELY
    try {
        bookingState.search.from_city = document.getElementById('fromCity').value.trim();
        bookingState.search.to_city = document.getElementById('toCity').value.trim();
        bookingState.search.departure_date = document.getElementById('departureDate').value;
        bookingState.search.return_date = document.getElementById('returnDate')?.value || null;
        bookingState.search.trip_type = document.querySelector('input[name="tripType"]:checked').value;

        bookingState.search.passengers.adults = parseInt(document.getElementById('adults').value) || 1;
        bookingState.search.passengers.children = parseInt(document.getElementById('children').value) || 0;
        bookingState.search.passengers.infants = parseInt(document.getElementById('infants').value) || 0;
        
    } catch (err) {
        console.error("Error saving search state:", err);
    }

    const { from_city, to_city, departure_date, return_date, trip_type } = bookingState.search;

    // 2. VALIDATION
    if (!from_city || !to_city || !departure_date) {
        alert("Please fill all required fields.");
        return;
    }

    // 3. UI TRANSITION (Wrapped in Try/Catch to prevent "freezing")
    try {
        if (typeof switchStep === 'function') {
            switchStep(1); 
        }
        updateHeaderUI();
    } catch (uiError) {
        console.warn("UI Transition Error (Non-critical):", uiError);
    }

    // 4. PREPARE LOADING STATES
    const outboundList = document.getElementById('outbound-results-list');
    const returnList = document.getElementById('return-results-list');
    const returnSection = document.getElementById('return-flight-section');

    if (outboundList) {
        outboundList.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Searching departing flights...</p>';
    }
    
    if (trip_type === 'round-trip' && returnSection) {
        returnSection.style.display = 'block';
        if (returnList) {
            returnList.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Searching return flights...</p>';
        }
    } else if (returnSection) {
        returnSection.style.display = 'none';
    }

    // 5. FETCH FROM BACKEND
    const payload = { from_city, to_city, departure_date, return_date, trip_type };

    fetch('/api/flights/search/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        console.log("API RESPONSE:", data);
        if (!data.success) {
            if (outboundList) outboundList.innerHTML = '<div class="no-results">No flights found.</div>';
            return;
        }
        
        renderFlights(data.outbound_flights, 'outbound-results-list', 'outbound');
        
        if (trip_type === 'round-trip') {
            renderFlights(data.return_flights, 'return-results-list', 'return');
        }
    })
    .catch(err => {
        console.error("Search Error:", err);
        if (outboundList) {
            outboundList.innerHTML = '<div class="no-results">Error connecting to server. Please try again.</div>';
        }
    });
}

/* ==============================
   RENDER FLIGHTS
============================== */
function renderFlights(flights, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!flights || flights.length === 0) {
        container.innerHTML = `<div class="no-results">No ${type} flights available.</div>`;
        return;
    }

    container.innerHTML = flights.map(flight => {
        const flightDataString = JSON.stringify(flight).replace(/"/g, '&quot;');

        return `
        <div class="flight-selection-card" id="flight-${flight.id}">
            <div class="flight-main-content">
                <div class="info-column">
                    <span class="flight-time">${flight.dep_time}</span>
                    <span class="flight-location">${flight.departure_city}</span>
                    <span class="flight-date">${flight.date_str}</span>
                </div>
                <div class="route-center-section">
                    <span class="duration-label">${flight.duration}</span>
                    <div class="route-line">
                        <i class="fas fa-plane plane-icon"></i>
                    </div>
                </div>
                <div class="info-column arrival">
                    <span class="flight-time">${flight.arr_time}</span>
                    <span class="flight-location">${flight.arrival_city}</span>
                    <span class="flight-date">${flight.date_str}</span>
                </div>
            </div>
            <div class="flight-footer">
                <div class="price-box">
                     <span class="price-amount">N${(flight.price || 0).toLocaleString()}</span>
                </div>
                <button type="button" class="select-flight-btn" 
                    onclick="handleFlightSelection(this, ${flightDataString}, '${type}')">
                    Select Flight
                </button>
            </div>
        </div>
        `;
    }).join('');
}

/* ==============================
   HEADER UPDATE
============================== */
function updateHeaderUI() {
    const header = document.getElementById('global-blue-header');
    if (!header) return;

    const from = bookingState?.search?.from_city || '---';
    const to = bookingState?.search?.to_city || '---';
    const date = bookingState?.search?.departure_date || '';
    const type = bookingState?.search?.trip_type === 'round-trip' ? 'Round Trip' : 'One Way';

    const citiesEl = document.getElementById('header-cities');
    const metaEl = document.getElementById('header-meta');

    if (citiesEl) citiesEl.innerText = `${from} - ${to}`;
    if (metaEl) metaEl.innerText = `${type} | ${date}`;
}