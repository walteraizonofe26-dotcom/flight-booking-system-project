/**
 * passengers.js - Handles Step 2 Dynamic Form Generation
 */

// This function is triggered when we enter Step 2
function setupPassengerForm() {
    const container = document.getElementById('passenger-forms-container');
    if (!container) return;

    // Clear previous forms
    container.innerHTML = '';

    const counts = bookingState.search.passengers;
    const totalPassengers = parseInt(counts.adults) + parseInt(counts.children) + parseInt(counts.infants);

    for (let i = 1; i <= totalPassengers; i++) {
        let type = i <= counts.adults ? 'Adult' : (i <= parseInt(counts.adults) + parseInt(counts.children) ? 'Child' : 'Infant');
        
        const passengerHtml = `
            <div class="passenger-card" data-index="${i}">
                <h4>${type} ${i}</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label>First Name</label>
                        <input type="text" class="form-input p-fname" required>
                    </div>
                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" class="form-input p-lname" required>
                    </div>
                    <div class="form-group">
                        <label>Date of Birth</label>
                        <input type="date" class="form-input p-dob" required>
                    </div>
                    <div class="form-group">
                        <label>Passport Number</label>
                        <input type="text" class="form-input p-passport" required>
                    </div>
                </div>
            </div>
            <hr>
        `;
        container.insertAdjacentHTML('beforeend', passengerHtml);
    }
}

// Intercept form submission
document.getElementById('passengerDetailsForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    // 1. Collect all passenger data
    const passengerCards = document.querySelectorAll('.passenger-card');
    bookingState.passengers = []; // Clear old data

    passengerCards.forEach(card => {
        bookingState.passengers.push({
            firstName: card.querySelector('.p-fname').value,
            lastName: card.querySelector('.p-lname').value,
            dob: card.querySelector('.p-dob').value,
            passport: card.querySelector('.p-passport').value
        });
    });

    // 2. Save Contact Info
    bookingState.contactEmail = document.getElementById('contactEmail').value;
    bookingState.contactPhone = document.getElementById('contactPhone').value;

    console.log("State Saved:", bookingState);

    // 3. Move to Step 3
    switchStep(3);
});

function selectFlight(id, price) {
    bookingState.selectedFlight = { id, price };
    setupPassengerForm(); // Generate the forms based on search counts
    switchStep(2);
}