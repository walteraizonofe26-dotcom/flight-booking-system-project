/**
 * Global Booking State
 */
const bookingState = {
    search: {
        from_city: '',
        to_city: '',
        departure_date: '',
        return_date: '',
        trip_type: 'one-way',
        passengers: { adults: 1, children: 0, infants: 0 }
    },
    selectedOutbound: null, 
    selectedReturn: null,  
    passengers: []
};

/**
 * switchStep(stepNumber)
 * The "Boss" function that changes pages and updates the Nav Bar colors.
 */
function switchStep(stepNumber, pushState = true) {
    console.log("Switching to Step:", stepNumber);
    const navBar = document.getElementById('main-nav');

    // 2. Hide ALL sections to prevent "Step Leakage"
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove('active');
    
    });
    // 3. Show the Target Section
    const target = document.getElementById(`step-${stepNumber}`);
    if (target) {
    target.classList.add('active');
    

    //  Automatically refresh payment totals when entering Step 3
    if (stepNumber === 3 && typeof setupPaymentStep === 'function') {
        setupPaymentStep();
    }
}
       
    // 4. Handle Global Blue Header (Only show for Step 1, 2 and Step 3)
    const blueHeader = document.getElementById('global-blue-header');
   if (blueHeader) {
      blueHeader.style.display = (stepNumber >= 1 && stepNumber <= 3) ? 'block' : 'none';
      // ALWAYS update the text (From/To/Date) when switching steps
        if (typeof updateHeaderPrice === 'function') {
            updateHeaderPrice(); 
        }
    // Set total to 0 specifically for Step 1
     if (stepNumber === 1) {
         const totalDisplay = blueHeader.querySelector('#header-total-price');
         if (totalDisplay) totalDisplay.innerText = "0 NGN";
    } else if (stepNumber >= 2) {
        updateHeaderPrice(); // Function to calculate real total
    }
}

    if (navBar) navBar.style.display = (stepNumber === 0 || stepNumber === 4) ? 'none' : 'flex';

    // 6. Update Navigation Circles (1 through 4)
    const navSteps = document.querySelectorAll('.step-navigation .step');
    navSteps.forEach((step, index) => {
        const stepIdx = index + 1; 
        step.classList.remove('active', 'completed');
        if (stepIdx < stepNumber) step.classList.add('completed');
        else if (stepIdx === stepNumber) step.classList.add('active');
    });

    // 7. Push State to Browser History for Back/Forward Button Support
    if (pushState) {
        history.pushState({ step: stepNumber }, `Step ${stepNumber}`, "");
    }

    // 8. Specific logic for Step 2 Sub-views (Resets the form view)
    if (stepNumber === 2) {
        const contactSection = document.getElementById('final-steps-container');
        const formContainer = document.getElementById('passenger-form-container');
        if (contactSection) contactSection.style.display = 'none';
        if (formContainer) formContainer.style.display = 'block';
    }

    // 9. Scroll to top so the user sees the new step from the beginning
    window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    switchStep(0); 
});
/**
 * Handle Chrome Back/Forward Arrow
 */
window.onpopstate = function(event) {
   if (event.state && event.state.step !== undefined) {
        // Core Step Switch
        switchStep(event.state.step, false);
        
        // Handle Step 2 Sub-navigation (Back button fix)
        if (event.state.step === 2) {
            if (typeof toggleStep2SubView === "function") {
                toggleStep2SubView(event.state.sub || 'form');
            }
        }
    }
};


/**
 handleFlightSelection
 */
function handleFlightSelection(buttonElement, flightData, type) {
    const card = buttonElement.closest('.flight-selection-card');
    const container = card.closest('.results-container');
    
    // Determine if we are clicking an already selected flight
    const isAlreadySelected = (type === 'outbound' && bookingState.selectedOutbound?.id === flightData.id) ||
                              (type === 'return' && bookingState.selectedReturn?.id === flightData.id);

    // 1. Reset all cards in this section (Outbound or Return)
    container.querySelectorAll('.flight-selection-card').forEach(c => {
        c.classList.remove('selected-card');
        const btn = c.querySelector('.select-flight-btn');
        if (btn) btn.innerText = "Select Flight";
    });

    if (isAlreadySelected) {
        // DESELECT Logic
        if (type === 'outbound') bookingState.selectedOutbound = null;
        else bookingState.selectedReturn = null;
    } else {
        // SELECT Logic
        if (type === 'outbound') bookingState.selectedOutbound = flightData;
        else bookingState.selectedReturn = flightData;

        card.classList.add('selected-card');
        buttonElement.innerText = "Flight Selected";
    }
}

/**
 * proceedToPassengerDetails
 * The final check before moving to Step 2
 */
function proceedToPassengerDetails() {
    const isRoundTrip = bookingState.search.trip_type === 'round-trip';
    
    // Validation: Check the bookingState, not just the UI
    if (!bookingState.selectedOutbound) {
        alert("Please select a departing flight before continuing.");
        return;
    }
    if (isRoundTrip && !bookingState.selectedReturn) {
        alert("Please select a return flight before continuing.");
        return;
    }

    // Move to Step 2
    if (typeof setupPassengerForm === "function") {
        setupPassengerForm();
    }
    switchStep(2);
}

/**
 * updateHeaderPrice
 * Handles the "Step 1 = 0 Price" rule
 */
function updateHeaderPrice() {
    const blueHeader = document.getElementById('global-blue-header');
    if (!blueHeader) return;
    const totalDisplay = document.getElementById('header-total-price');
    if (!totalDisplay) return;

   const activeSection = document.querySelector('.step-section.active');
    const currentStepId = activeSection ? activeSection.id : '';

    if (currentStepId === 'step-1') {
        // RULE: Show 0 during selection phase
        totalDisplay.innerText = "0 NGN";
    } else   {
        // RULE: Calculate real total for Passenger/Payment phases
        let pricePerPerson = parseFloat(bookingState.selectedOutbound?.price || 0);
        if (bookingState.selectedReturn) {
            pricePerPerson += parseFloat(bookingState.selectedReturn.price || 0);
        }
        
        const adults = parseInt(bookingState.search.passengers.adults) || 1;
        const children = parseInt(bookingState.search.passengers.children) || 0;
        const finalTotal = pricePerPerson * (adults + children);
        
        totalDisplay.innerText = `₦${finalTotal.toLocaleString()}`;
    }
}