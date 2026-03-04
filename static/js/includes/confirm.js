/**
 * confirm.js - Finalizes the user experience
 */

function initConfirmationStep() {
    const emailSpan = document.getElementById('conf-email');
    const refHeading = document.getElementById('conf-booking-ref');
    const detailsDiv = document.getElementById('conf-details');

    // 1. Set the Contact Email
    emailSpan.innerText = bookingState.contactEmail;

    // 2. Set the Booking Reference (returned from backend in Step 3)
    refHeading.innerText = bookingState.bookingReference || "SKY-" + Math.random().toString(36).substr(2, 9).toUpperCase();

    // 3. Build the Summary HTML
    const passengerNames = bookingState.passengers.map(p => `${p.firstName} ${p.lastName}`).join(', ');
    
    detailsDiv.innerHTML = `
        <div class="summary-item">
            <strong>Passengers:</strong> <span>${passengerNames}</span>
        </div>
        <div class="summary-item">
            <strong>Total Paid:</strong> <span>$${bookingState.totalAmount.toFixed(2)}</span>
        </div>
        <div class="summary-item">
            <strong>Status:</strong> <span style="color: green;">Confirmed</span>
        </div>
    `;

    console.log("Wizard Complete! Final State:", bookingState);
}