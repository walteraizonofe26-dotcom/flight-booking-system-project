
// the memory bank where we write down everything about the booking. step by step

const bookingState = {
    currentStep: 1,
    searchData: null,
    selectedFlight: null,
    passengerData: {},
    paymentData: {},
    bookingDetails: {}
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking page loaded');
    
    // Check if we have search data
    const savedSearch = localStorage.getItem('flightSearch');
    if (savedSearch) {
        console.log('Found saved search data:', savedSearch);
    }
    
    initBookingFlow();
    loadSearchData();
    initDatePickers();
    initPassengerSelector();
    initPaymentTabs();
    initEventListeners();
});

function initBookingFlow() {
    // Load saved state from localStorage
    const savedState = localStorage.getItem('bookingState');
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            // Don't override searchData if we have fresh data from homepage
            if (!bookingState.searchData) {
                bookingState.searchData = parsedState.searchData;
            }
            bookingState.currentStep = parsedState.currentStep || 1;
            bookingState.selectedFlight = parsedState.selectedFlight;
            bookingState.passengerData = parsedState.passengerData || {};
            bookingState.paymentData = parsedState.paymentData || {};
            bookingState.bookingDetails = parsedState.bookingDetails || {};
            
            navigateToStep(bookingState.currentStep);
        } catch (e) {
            console.error('Failed to load saved state:', e);
        }
    }
}

function loadSearchData() {
    // Load search data from localStorage (from homepage)
    const savedSearch = localStorage.getItem('flightSearch');
    if (savedSearch) {
        try {
            const searchData = JSON.parse(savedSearch);
            console.log('Loaded search data from homepage:', searchData);
            bookingState.searchData = searchData;
            
            // Populate search form on booking page
            const bookingFrom = document.getElementById('bookingFrom');
            const bookingTo = document.getElementById('bookingTo');
            const bookingDeparture = document.getElementById('bookingDeparture');
            const bookingReturn = document.getElementById('bookingReturn');
            const bookingPassengers = document.getElementById('bookingPassengers');
            
            if (bookingFrom) bookingFrom.value = searchData.from || '';
            if (bookingTo) bookingTo.value = searchData.to || '';
            if (bookingDeparture) bookingDeparture.value = searchData.departureDate || '';
            
            if (searchData.tripType === 'round-trip' && searchData.returnDate && bookingReturn) {
                bookingReturn.value = searchData.returnDate;
            }
            
            // Update passenger display
            if (bookingPassengers && searchData.passengers) {
                let displayText = `${searchData.passengers.adults} Adult${searchData.passengers.adults !== 1 ? 's' : ''}`;
                
                if (searchData.passengers.children > 0) {
                    displayText += `, ${searchData.passengers.children} Child${searchData.passengers.children !== 1 ? 'ren' : ''}`;
                }
                
                if (searchData.passengers.infants > 0) {
                    displayText += `, ${searchData.passengers.infants} Infant${searchData.passengers.infants !== 1 ? 's' : ''}`;
                }
                
                bookingPassengers.textContent = displayText;
            }
            
            // Clear localStorage to avoid reusing old data
            localStorage.removeItem('flightSearch');
            
        } catch (e) {
            console.error('Failed to load search data:', e);
        }
    }
}

function initDatePickers() {
    const departureInput = document.getElementById('bookingDeparture');
    const returnInput = document.getElementById('bookingReturn');
    
    if (!departureInput) {
        console.error('Departure date input not found');
        return;
    }
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    departureInput.min = today;
    
    if (returnInput) {
        returnInput.min = today;
        
        // Update return min date when departure changes
        departureInput.addEventListener('change', function() {
            returnInput.min = this.value;
            
            // Clear return date if it's before new departure date
            if (returnInput.value && returnInput.value < this.value) {
                returnInput.value = '';
            }
        });
    }
}

function initPassengerSelector() {
    const passengerDisplay = document.querySelector('.passenger-display');
    const passengerOptions = document.querySelector('.passenger-options');
    
    if (!passengerDisplay || !passengerOptions) {
        console.log('Passenger selector elements not found - may not be on current step');
        return;
    }
    
    // Initial passenger data - use data from homepage if available
    let passengers = {
        adults: bookingState.searchData?.passengers?.adults || 1,
        children: bookingState.searchData?.passengers?.children || 0,
        infants: bookingState.searchData?.passengers?.infants || 0
    };
    
    // Create passenger options HTML
    function createPassengerOptions() {
        const types = [
            { id: 'adults', label: 'Adults (12+ years)', min: 1 },
            { id: 'children', label: 'Children (2-11 years)', min: 0 },
            { id: 'infants', label: 'Infants (0-1 years)', min: 0 }
        ];
        
        let html = '';
        types.forEach(type => {
            html += `
                <div class="passenger-option" data-type="${type.id}">
                    <span>${type.label}</span>
                    <div class="passenger-controls">
                        <button type="button" class="passenger-btn" 
                                data-action="decrease" 
                                data-type="${type.id}"
                                ${passengers[type.id] <= type.min ? 'disabled' : ''}>
                            -
                        </button>
                        <span class="passenger-count">${passengers[type.id]}</span>
                        <button type="button" class="passenger-btn" 
                                data-action="increase" 
                                data-type="${type.id}"
                                ${type.id === 'infants' && passengers.infants >= passengers.adults ? 'disabled' : ''}>
                            +
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `<button type="button" class="btn btn-primary" id="applyPassengerChanges">Apply</button>`;
        passengerOptions.innerHTML = html;
        
        // Add event listeners to new buttons
        document.querySelectorAll('.passenger-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.dataset.type;
                const action = this.dataset.action;
                
                if (action === 'increase') {
                    if (type === 'infants' && passengers.infants >= passengers.adults) {
                        return;
                    }
                    passengers[type]++;
                } else {
                    const min = type === 'adults' ? 1 : 0;
                    if (passengers[type] > min) {
                        passengers[type]--;
                    }
                }
                
                updatePassengerDisplay();
                createPassengerOptions(); // Recreate with updated counts
            });
        });
        
        const applyBtn = document.getElementById('applyPassengerChanges');
        if (applyBtn) {
            applyBtn.addEventListener('click', function() {
                updatePassengerDisplay();
                passengerOptions.classList.remove('show');
                
                // Update booking state with new passenger counts
                bookingState.searchData = {
                    ...bookingState.searchData,
                    passengers: { ...passengers }
                };
            });
        }
    }
    
    function updatePassengerDisplay() {
        const bookingPassengers = document.getElementById('bookingPassengers');
        if (!bookingPassengers) return;
        
        const total = passengers.adults + passengers.children + passengers.infants;
        let displayText = `${passengers.adults} Adult${passengers.adults !== 1 ? 's' : ''}`;
        
        if (passengers.children > 0) {
            displayText += `, ${passengers.children} Child${passengers.children !== 1 ? 'ren' : ''}`;
        }
        
        if (passengers.infants > 0) {
            displayText += `, ${passengers.infants} Infant${passengers.infants !== 1 ? 's' : ''}`;
        }
        
        bookingPassengers.textContent = displayText;
    }
    
    // Toggle passenger options
    passengerDisplay.addEventListener('click', function(e) {
        e.stopPropagation();
        passengerOptions.classList.toggle('show');
    });
    
    // Close when clicking outside
    document.addEventListener('click', function(event) {
        if (!passengerDisplay.contains(event.target) && !passengerOptions.contains(event.target)) {
            passengerOptions.classList.remove('show');
        }
    });
    
    // Initialize
    createPassengerOptions();
    updatePassengerDisplay();
}

function initPaymentTabs() {
    const paymentTabs = document.querySelectorAll('.payment-tab');
    const paymentContents = document.querySelectorAll('.payment-content');
    
    if (paymentTabs.length === 0) {
        console.log('Payment tabs not found - may not be on payment step');
        return;
    }
    
    paymentTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const method = this.dataset.method;
            
            // Update active tab
            paymentTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            paymentContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${method}-payment`) {
                    content.classList.add('active');
                }
            });
        });
    });
}

function initEventListeners() {
    // Search form submission
    const searchForm = document.getElementById('bookingSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }
    
    // Modify search button
    const modifySearchBtn = document.getElementById('modifySearchBtn');
    if (modifySearchBtn) {
        modifySearchBtn.addEventListener('click', () => navigateToStep(1));
    }
    
    // Back to search button
    const backToSearchBtn = document.getElementById('backToSearch');
    if (backToSearchBtn) {
        backToSearchBtn.addEventListener('click', () => navigateToStep(1));
    }
    
    // Continue to passengers button
    const continueToPassengersBtn = document.getElementById('continueToPassengers');
    if (continueToPassengersBtn) {
        continueToPassengersBtn.addEventListener('click', () => {
            if (validatePassengerStep()) {
                navigateToStep(3);
                updatePassengerForm();
            }
        });
    }
    
    // Back to flights button
    const backToFlightsBtn = document.getElementById('backToFlights');
    if (backToFlightsBtn) {
        backToFlightsBtn.addEventListener('click', () => navigateToStep(2));
    }
    
    // Continue to payment button
    const continueToPaymentBtn = document.getElementById('continueToPayment');
    if (continueToPaymentBtn) {
        continueToPaymentBtn.addEventListener('click', () => {
            if (validatePassengerDetails()) {
                navigateToStep(4);
                updatePaymentSummary();
            }
        });
    }
    
    // Back to passenger button
    const backToPassengerBtn = document.getElementById('backToPassenger');
    if (backToPassengerBtn) {
        backToPassengerBtn.addEventListener('click', () => navigateToStep(3));
    }
    
    // Confirm booking button
    const confirmBookingBtn = document.getElementById('confirmBookingBtn');
    if (confirmBookingBtn) {
        confirmBookingBtn.addEventListener('click', handlePayment);
    }
    
    // PayPal button
    const paypalBtn = document.getElementById('paypalBtn');
    if (paypalBtn) {
        paypalBtn.addEventListener('click', handlePayPal);
    }
    
    // Confirmation actions
    const printTicketBtn = document.getElementById('printTicketBtn');
    if (printTicketBtn) {
        printTicketBtn.addEventListener('click', printTicket);
    }
    
    const emailTicketBtn = document.getElementById('emailTicketBtn');
    if (emailTicketBtn) {
        emailTicketBtn.addEventListener('click', emailTicket);
    }
    
    // Card input formatting
    const cardNumber = document.getElementById('cardNumber');
    if (cardNumber) {
        cardNumber.addEventListener('input', formatCardNumber);
    }
    
    const cardExpiry = document.getElementById('cardExpiry');
    if (cardExpiry) {
        cardExpiry.addEventListener('input', formatExpiryDate);
    }
}

async function handleSearch(event) {
    event.preventDefault();
    
    // Get form data
    const searchData = {
        from: document.getElementById('bookingFrom').value.trim(),
        to: document.getElementById('bookingTo').value.trim(),
        departureDate: document.getElementById('bookingDeparture').value,
        returnDate: document.getElementById('bookingReturn').value,
        passengers: bookingState.searchData?.passengers || { adults: 1, children: 0, infants: 0 }
    };
    
    console.log('Searching with data:', searchData);
    
    // Validate
    if (!searchData.from) {
        showError('Please enter departure city');
        return;
    }
    
    if (!searchData.to) {
        showError('Please enter destination city');
        return;
    }
    
    if (searchData.from.toLowerCase() === searchData.to.toLowerCase()) {
        showError('Departure and destination must be different');
        return;
    }
    
    if (!searchData.departureDate) {
        showError('Please select departure date');
        return;
    }
    
    // Update booking state
    bookingState.searchData = searchData;
    
    // Show loading
    showLoading(true);
    
    try {
        // Simulate API call
        const flights = await searchFlightsAPI(searchData);
        
        // Display results
        displayFlights(flights);
        
        // Navigate to step 2
        navigateToStep(2);
        
    } catch (error) {
        showError('Failed to search flights. Please try again.');
        console.error('Search error:', error);
    } finally {
        showLoading(false);
    }
}

async function searchFlightsAPI(searchData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock data - in production, this would be a real API call
    return [
        {
            id: 'SB123',
            airline: 'SkyBook Airlines',
            flightNumber: 'SB123',
            departureCity: searchData.from || 'Abuja',
            arrivalCity: searchData.to || 'Lagos',
            departureTime: '08:00',
            arrivalTime: '09:30',
            departureAirport: 'ABV',
            arrivalAirport: 'LOS',
            duration: '1h 30m',
            price: 199.99,
            availableSeats: 42
        },
        {
            id: 'SB456',
            airline: 'SkyBook Airlines',
            flightNumber: 'SB456',
            departureCity: searchData.from || 'Abuja',
            arrivalCity: searchData.to || 'Lagos',
            departureTime: '14:30',
            arrivalTime: '16:00',
            departureAirport: 'ABV',
            arrivalAirport: 'LOS',
            duration: '1h 30m',
            price: 249.99,
            availableSeats: 24
        },
        {
            id: 'SB789',
            airline: 'SkyBook Airlines',
            flightNumber: 'SB789',
            departureCity: searchData.from || 'Abuja',
            arrivalCity: searchData.to || 'Lagos',
            departureTime: '19:15',
            arrivalTime: '20:45',
            departureAirport: 'ABV',
            arrivalAirport: 'LOS',
            duration: '1h 30m',
            price: 179.99,
            availableSeats: 3
        }
    ];
}

function displayFlights(flights) {
    const resultsContainer = document.getElementById('flightsResults');
    const noFlightsElement = document.getElementById('noFlights');
    
    if (!resultsContainer) {
        console.error('Flights results container not found');
        return;
    }
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    if (!flights || flights.length === 0) {
        if (noFlightsElement) {
            noFlightsElement.style.display = 'block';
        }
        return;
    }
    
    if (noFlightsElement) {
        noFlightsElement.style.display = 'none';
    }
    
    flights.forEach(flight => {
        const totalPassengers = (bookingState.searchData?.passengers?.adults || 1) + 
                               (bookingState.searchData?.passengers?.children || 0);
        const totalPrice = flight.price * totalPassengers;
        
        const flightCard = document.createElement('div');
        flightCard.className = 'flight-card';
        flightCard.dataset.flightId = flight.id;
        flightCard.innerHTML = `
            <div class="flight-header">
                <div class="airline-info">
                    <div class="airline-logo">
                        <i class="fas fa-plane"></i>
                    </div>
                    <div>
                        <div class="airline-name">${flight.airline}</div>
                        <div class="flight-number">Flight ${flight.flightNumber}</div>
                    </div>
                </div>
                <div class="flight-price">
                    <div class="price">$${totalPrice.toFixed(2)}</div>
                    <div class="price-per">$${flight.price.toFixed(2)} per person</div>
                </div>
            </div>
            
            <div class="flight-details">
                <div class="departure">
                    <div class="departure-time">${flight.departureTime}</div>
                    <div class="airport-code">${flight.departureAirport}</div>
                    <div class="airport-name">${flight.departureCity}</div>
                </div>
                
                <div class="flight-duration">
                    <i class="fas fa-plane"></i>
                    <div>${flight.duration}</div>
                    <div>Non-stop</div>
                </div>
                
                <div class="arrival">
                    <div class="arrival-time">${flight.arrivalTime}</div>
                    <div class="airport-code">${flight.arrivalAirport}</div>
                    <div class="airport-name">${flight.arrivalCity}</div>
                </div>
            </div>
            
            <div class="flight-footer">
                <div class="seats-available">
                    ${flight.availableSeats} seats available
                </div>
                <button class="select-flight-btn" data-flight-id="${flight.id}">
                    Select Flight
                </button>
            </div>
        `;
        
        resultsContainer.appendChild(flightCard);
    });
    
    // Add click handlers to select buttons
    document.querySelectorAll('.select-flight-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const flightId = this.dataset.flightId;
            selectFlight(flightId, flights);
        });
    });
    
    // Add click handlers to flight cards
    document.querySelectorAll('.flight-card').forEach(card => {
        card.addEventListener('click', function() {
            const flightId = this.dataset.flightId;
            selectFlight(flightId, flights);
        });
    });
}

function selectFlight(flightId, flights) {
    // Remove selected class from all cards
    document.querySelectorAll('.flight-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    const selectedCard = document.querySelector(`.flight-card[data-flight-id="${flightId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Find flight data
    const flight = flights.find(f => f.id === flightId);
    if (flight) {
        bookingState.selectedFlight = flight;
        
        // Enable continue button
        const continueBtn = document.getElementById('continueToPassengers');
        if (continueBtn) {
            continueBtn.disabled = false;
        }
        
        // Update progress
        updateStepProgress(2);
    }
}

function validatePassengerStep() {
    if (!bookingState.selectedFlight) {
        showError('Please select a flight to continue');
        return false;
    }
    return true;
}

function updatePassengerForm() {
    if (!bookingState.selectedFlight) return;
    
    const flight = bookingState.selectedFlight;
    const passengers = bookingState.searchData?.passengers || { adults: 1, children: 0, infants: 0 };
    const totalPassengers = passengers.adults + passengers.children;
    const totalPrice = flight.price * totalPassengers;
    
    // Update flight summary
    const flightSummary = document.getElementById('flightSummary');
    if (flightSummary) {
        const summaryHTML = `
            <p><strong>Flight:</strong> ${flight.airline} ${flight.flightNumber}</p>
            <p><strong>Route:</strong> ${flight.departureCity} (${flight.departureAirport}) → ${flight.arrivalCity} (${flight.arrivalAirport})</p>
            <p><strong>Departure:</strong> ${flight.departureTime}</p>
            <p><strong>Arrival:</strong> ${flight.arrivalTime}</p>
            <p><strong>Duration:</strong> ${flight.duration}</p>
            <p><strong>Passengers:</strong> ${passengers.adults} Adult(s), ${passengers.children} Child(ren)</p>
            <p><strong>Total Price:</strong> $${totalPrice.toFixed(2)}</p>
        `;
        
        flightSummary.innerHTML = summaryHTML;
    }
}

function validatePassengerDetails() {
    const name = document.getElementById('passengerName')?.value.trim();
    const email = document.getElementById('passengerEmail')?.value.trim();
    const phone = document.getElementById('passengerPhone')?.value.trim();
    
    if (!name) {
        showError('Please enter passenger name');
        return false;
    }
    
    if (!email) {
        showError('Please enter email address');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return false;
    }
    
    if (!phone) {
        showError('Please enter phone number');
        return false;
    }
    
    // Save passenger data
    bookingState.passengerData = {
        name,
        email,
        phone,
        specialRequests: document.getElementById('specialRequests')?.value.trim() || ''
    };
    
    return true;
}

function updatePaymentSummary() {
    if (!bookingState.selectedFlight || !bookingState.passengerData) return;
    
    const flight = bookingState.selectedFlight;
    const passengers = bookingState.searchData?.passengers || { adults: 1, children: 0, infants: 0 };
    const totalPassengers = passengers.adults + passengers.children;
    const totalPrice = flight.price * totalPassengers;
    
    // Update final summary
    const finalSummary = document.getElementById('finalSummary');
    if (finalSummary) {
        const summaryHTML = `
            <p><strong>Flight:</strong> ${flight.airline} ${flight.flightNumber}</p>
            <p><strong>Route:</strong> ${flight.departureCity} → ${flight.arrivalCity}</p>
            <p><strong>Date:</strong> ${bookingState.searchData?.departureDate}</p>
            <p><strong>Passenger:</strong> ${bookingState.passengerData.name}</p>
            <p><strong>Seats:</strong> ${totalPassengers} seat(s)</p>
        `;
        
        finalSummary.innerHTML = summaryHTML;
    }
    
    const totalPriceElement = document.getElementById('totalPrice');
    if (totalPriceElement) {
        totalPriceElement.textContent = `$${totalPrice.toFixed(2)}`;
    }
    
    // Update progress
    updateStepProgress(3);
}

async function handlePayment(event) {
    if (event) event.preventDefault();
    
    // Validate payment form
    if (!validatePaymentForm()) {
        return;
    }
    
    // Show loading
    const confirmBtn = document.getElementById('confirmBookingBtn');
    if (confirmBtn) {
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmBtn.disabled = true;
        
        try {
            // Simulate payment processing
            await processPayment();
            
            // Create booking
            const bookingResult = await createBooking();
            
            // Update booking state
            bookingState.bookingDetails = bookingResult;
            bookingState.currentStep = 5;
            
            // Save state
            saveBookingState();
            
            // Navigate to confirmation
            navigateToStep(5);
            updateConfirmation();
            
        } catch (error) {
            showError('Payment failed. Please try again.');
            console.error('Payment error:', error);
        } finally {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }
}

function validatePaymentForm() {
    const cardName = document.getElementById('cardName')?.value.trim();
    const cardNumber = document.getElementById('cardNumber')?.value.trim().replace(/\s/g, '');
    const cardExpiry = document.getElementById('cardExpiry')?.value.trim();
    const cardCVV = document.getElementById('cardCVV')?.value.trim();
    
    if (!cardName) {
        showError('Please enter cardholder name');
        return false;
    }
    
    if (!cardNumber) {
        showError('Please enter card number');
        return false;
    }
    
    if (!isValidCardNumber(cardNumber)) {
        showError('Please enter a valid card number');
        return false;
    }
    
    if (!cardExpiry) {
        showError('Please enter expiry date');
        return false;
    }
    
    if (!isValidExpiryDate(cardExpiry)) {
        showError('Please enter a valid expiry date (MM/YY)');
        return false;
    }
    
    if (!cardCVV) {
        showError('Please enter CVV');
        return false;
    }
    
    if (!isValidCVV(cardCVV)) {
        showError('Please enter a valid CVV');
        return false;
    }
    
    // Save payment data
    bookingState.paymentData = {
        cardName,
        cardLastFour: cardNumber.slice(-4),
        expiryDate: cardExpiry
    };
    
    return true;
}

async function processPayment() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return { success: true, transactionId: 'TXN_' + Date.now() };
}

async function createBooking() {
    // Simulate API call to create booking
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const bookingRef = 'SKB-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    return {
        bookingReference: bookingRef,
        bookingId: Date.now(),
        timestamp: new Date().toISOString(),
        status: 'confirmed'
    };
}

function handlePayPal() {
    showLoading(true);
    
    setTimeout(() => {
        showLoading(false);
        alert('In production, this would redirect to PayPal for payment.');
    }, 1000);
}

function updateConfirmation() {
    if (!bookingState.bookingDetails || !bookingState.selectedFlight || !bookingState.passengerData) return;
    
    const bookingReferenceElement = document.getElementById('bookingReference');
    if (bookingReferenceElement) {
        bookingReferenceElement.textContent = bookingState.bookingDetails.bookingReference;
    }
    
    const flight = bookingState.selectedFlight;
    const confirmationFlightDetails = document.getElementById('confirmationFlightDetails');
    if (confirmationFlightDetails) {
        const flightHTML = `
            <p><strong>Flight:</strong> ${flight.airline} ${flight.flightNumber}</p>
            <p><strong>Route:</strong> ${flight.departureCity} → ${flight.arrivalCity}</p>
            <p><strong>Departure:</strong> ${flight.departureTime}</p>
            <p><strong>Arrival:</strong> ${flight.arrivalTime}</p>
            <p><strong>Date:</strong> ${bookingState.searchData?.departureDate}</p>
        `;
        
        confirmationFlightDetails.innerHTML = flightHTML;
    }
    
    const confirmationPassengerDetails = document.getElementById('confirmationPassengerDetails');
    if (confirmationPassengerDetails) {
        const passengerHTML = `
            <p><strong>Name:</strong> ${bookingState.passengerData.name}</p>
            <p><strong>Email:</strong> ${bookingState.passengerData.email}</p>
            <p><strong>Phone:</strong> ${bookingState.passengerData.phone}</p>
            ${bookingState.passengerData.specialRequests ? `<p><strong>Special Requests:</strong> ${bookingState.passengerData.specialRequests}</p>` : ''}
        `;
        
        confirmationPassengerDetails.innerHTML = passengerHTML;
    }
    
    const confirmationPaymentDetails = document.getElementById('confirmationPaymentDetails');
    if (confirmationPaymentDetails) {
        const paymentHTML = `
            <p><strong>Payment Method:</strong> Credit Card</p>
            <p><strong>Card:</strong> **** **** **** ${bookingState.paymentData.cardLastFour}</p>
            <p><strong>Expiry:</strong> ${bookingState.paymentData.expiryDate}</p>
            <p><strong>Status:</strong> Paid</p>
        `;
        
        confirmationPaymentDetails.innerHTML = paymentHTML;
    }
    
    updateStepProgress(4);
}

function navigateToStep(step) {
    console.log('Navigating to step:', step);
    
    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    
    // Show target step
    const targetStep = document.getElementById(`step-${step}`);
    if (targetStep) {
        targetStep.classList.add('active');
        
        // Update progress steps
        updateStepProgress(step - 1);
        
        // Update current step in state
        bookingState.currentStep = step;
        saveBookingState();
    }
}

function updateStepProgress(currentStepIndex) {
    const steps = document.querySelectorAll('.progress-step');
    
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        
        if (index < currentStepIndex) {
            step.classList.add('completed');
        } else if (index === currentStepIndex) {
            step.classList.add('active');
        }
    });
}

function showLoading(show) {
    const loadingElement = document.getElementById('loadingFlights');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    console.error('Error:', message);
    
    // Create error toast
    const toast = document.createElement('div');
    toast.className = 'error-toast fade-in';
    toast.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background-color: #f8d7da; color: #721c24; padding: 15px 20px; border-radius: 8px; display: flex; align-items: center; gap: 10px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

function saveBookingState() {
    localStorage.setItem('bookingState', JSON.stringify(bookingState));
}

function printTicket() {
    window.print();
}

function emailTicket() {
    showLoading(true);
    
    setTimeout(() => {
        showLoading(false);
        alert('Ticket has been sent to your email address.');
    }, 1000);
}

// Utility Functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidCardNumber(number) {
    const cleanNumber = number.replace(/\s/g, '');
    if (!/^\d+$/.test(cleanNumber) || cleanNumber.length < 13 || cleanNumber.length > 19) {
        return false;
    }
    
    return /^\d{13,19}$/.test(cleanNumber);
}

function isValidExpiryDate(expiry) {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        return false;
    }
    
    const [month, year] = expiry.split('/').map(num => parseInt(num, 10));
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    if (month < 1 || month > 12) return false;
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    
    return true;
}

function isValidCVV(cvv) {
    return /^\d{3,4}$/.test(cvv);
}

function formatCardNumber(event) {
    let value = event.target.value.replace(/\s/g, '').replace(/\D/g, '');
    
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    value = value.substring(0, 19);
    
    event.target.value = value;
}

function formatExpiryDate(event) {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    
    event.target.value = value.substring(0, 5);
}