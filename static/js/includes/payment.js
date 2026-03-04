/**
 * payment.js - Handles Step 3 Totals and Final Submission
 */

function setupPaymentStep() {
    const breakdownDiv = document.getElementById('payment-price-breakdown');
    const totalSpan = document.getElementById('final-total-price');
    
    const flightPrice = bookingState.selectedFlight.price;
    const counts = bookingState.search.passengers;
    const totalPass = parseInt(counts.adults) + parseInt(counts.children) + parseInt(counts.infants);
    
    const finalTotal = flightPrice * totalPass;

    breakdownDiv.innerHTML = `
        <p>Flight Base Price: $${flightPrice}</p>
        <p>Passengers: ${totalPass} (${counts.adults} Adults, ${counts.children} Children, ${counts.infants} Infants)</p>
    `;
    
    totalSpan.innerText = `$${finalTotal.toFixed(2)}`;
    // Save total to state for confirmation
    bookingState.totalAmount = finalTotal;
}

document.getElementById('paymentForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const payBtn = document.getElementById('payNowBtn');
    payBtn.disabled = true;
    payBtn.innerText = "Processing...";

    // Final Payload: Sending EVERYTHING we gathered
    const finalData = {
        flight_id: bookingState.selectedFlight.id,
        passengers: bookingState.passengers,
        contact: {
            email: bookingState.contactEmail,
            phone: bookingState.contactPhone
        },
        payment: {
            card_name: document.getElementById('cardName').value,
            total: bookingState.totalAmount
        }
    };

    fetch('/api/flights/book/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(finalData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            bookingState.bookingReference = data.booking_ref; // e.g., "ABC123"
            initConfirmationStep();
            switchStep(4);
        } else {
            alert("Payment Failed: " + data.message);
            payBtn.disabled = false;
            payBtn.innerText = "Pay and Book Now";
        }
    })
    .catch(err => {
        console.error("Booking Error:", err);
        payBtn.disabled = false;
    });
});
