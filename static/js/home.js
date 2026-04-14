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
        
        const from_City = document.getElementById('fromCity').value.trim();
        const to_City = document.getElementById('toCity').value.trim();
        const departure_Date = document.getElementById('departureDate').value;
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
        if (!from_City || !to_City || !departure_Date) {
            showError('Please fill in all required fields (From, To, Departure Date).');
            return;
        }
        
        if (from_City.toLowerCase() === to_City.toLowerCase()) {
            showError('Departure and destination cannot be the same city.');
            return;
        }
        
        if (tripType === 'round-trip' && !returnDate) {
            showError('Please select a return date for a round trip.');
            return;
        }
        
        // Save to localStorage and redirect
        const searchData = {
            from: from_City,
            to: to_City,
            departure_Date: departure_Date,
            returnDate: tripType === 'one-way' ? null : returnDate,
            passengers: passengers
        };
        
        localStorage.setItem('flightSearch', JSON.stringify(searchData));
        window.location.href = '/book/'; 
    });
}

function initMyBookingsForm() {
    const bookingsForm = document.querySelector('.bookings-form');
    
    if (!bookingsForm) return;
    
    bookingsForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const bookingRef = document.getElementById('bookingRef').value.trim();
        const bookingEmail = document.getElementById('bookingEmail').value.trim();
        const submitBtn = bookingsForm.querySelector('.search-btn');
        
        if (!bookingRef || !bookingEmail) {
            showError('Please fill in your Booking Reference and Email.');
            return;
        }
        
        if (!isValidEmail(bookingEmail)) {
            showError('Please enter a valid email address.');
            return;
        }
        
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching for booking for these details...';
        removeAlerts();

        try {
            await new Promise(resolve => setTimeout(resolve, 3500));
            const response = await fetch('/api/booking/search/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken') // Function to get CSRF
                },
                body: JSON.stringify({ booking_reference: bookingRef, bookingEmail: bookingEmail})
            });

            const data = await response.json();

            if (data.success) {
                
               window.location.href = `/booking/find/?ref=${bookingRef}&email=${bookingEmail}`;
            } else {
                showError(data.message || 'No booking found with these details.');
            }
        } catch (err) {
            showError("Connection failed. Please try again.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'View My Booking';
        }
    });
}

function displayBookingResult(booking) {
    // Create or find a results wrapper
    let wrapper = document.getElementById('ajax-results-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'ajax-results-wrapper';
        document.querySelector('.bookings-content').appendChild(wrapper);
    }

    wrapper.innerHTML = `
        <div class="booking-card professional-ui fade-in" id="booking-${booking.id}">
            <div class="card-header-flex">
                <span class="ref-badge"><i class="fas fa-ticket-alt"></i> ${booking.ref}</span>
                <span class="status-pill ${booking.status_raw}">${booking.status}</span>
            </div>
            
            <div class="card-main-content">
                <div class="route-display">
                    <div class="endpoint">
                        <h3>${booking.origin}</h3>
                        <span>Origin</span>
                    </div>
                    <div class="flight-path">
                        <i class="fas fa-plane"></i>
                        <div class="path-line"></div>
                    </div>
                    <div class="endpoint">
                        <h3>${booking.destination}</h3>
                        <span>Destination</span>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <i class="far fa-calendar-alt"></i>
                        <div><strong>Date</strong><p>${booking.departure_date}</p></div>
                    </div>
                    <div class="info-item">
                        <i class="far fa-clock"></i>
                        <div><strong>Time</strong><p>${booking.departure_time}</p></div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users"></i>
                        <div><strong>Passengers</strong><p>${booking.passengers}</p></div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-info-circle"></i>
                        <div><strong>Type</strong><p>${booking.trip_type}</p></div>
                    </div>
                </div>

                <div class="price-footer">
                    <div class="total-amount">
                        <span>Total Paid</span>
                        <h2>₦${booking.total_price}</h2>
                    </div>
                    <button onclick="confirmCancellation(${booking.id})" class="cancel-action-btn">
                        Cancel Flight
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function confirmCancellation(id) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
        const response = await fetch(`/api/booking/cancel/${id}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        const data = await response.json();
        if (data.success) {
            const card = document.getElementById(`booking-${id}`);
            card.style.transform = "scale(0.9)";
            card.style.opacity = "0";
            setTimeout(() => {
                card.remove();
                showSuccess("Booking cancelled successfully.");
            }, 300);
        }
    } catch (err) {
        showError("Could not process cancellation. please try again.");
    }
}

// Helper to get CSRF token from cookies
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

        // window.location.href = `/api/booking/find/?ref=${encodeURIComponent(bookingRef)}&email=${encodeURIComponent(bookingEmail)}`;
  

function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (!mobileMenuBtn || !navLinks) return;
    
    mobileMenuBtn.addEventListener('click', function() {
        navLinks.style.display = (navLinks.style.display === 'flex') ? 'none' : 'flex';
    });
}

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