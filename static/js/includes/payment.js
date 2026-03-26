
function setupPaymentStep() {
    const breakdownDiv = document.getElementById('payment-price-breakdown');
    const totalSpan = document.getElementById('final-total-price');
    
    // 1. Safety Guard
    if (!breakdownDiv || !totalSpan || !bookingState.selectedOutbound) {
        console.error("Payment setup failed: Missing HTML elements or flight data.");
        if (totalSpan) totalSpan.innerText = "Error calculating price";
        return;
    }

    try {
        const counts = bookingState.search.passengers;
        const adults = parseInt(counts.adults) || 0;
        const children = parseInt(counts.children) || 0;
        const infants = parseInt(counts.infants) || 0;   
        // Total paying passengers (Adults + Children)
        const payingPass = adults + children;

        // 2. Calculate Combined Flight Price
        const outboundPrice = parseFloat(bookingState.selectedOutbound.price) || 0;
        const returnPrice = bookingState.selectedReturn ? parseFloat(bookingState.selectedReturn.price) : 0;
        
        const pricePerPerson = outboundPrice + returnPrice;
        const finalTotal = pricePerPerson * payingPass;

        // 3. Professional Breakdown HTML
        let breakdownHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Departing Flight:</span>
                <span style="font-weight: 600;">₦${outboundPrice.toLocaleString()}</span>
            </div>
        `;

    
        if (returnPrice > 0) {
            breakdownHTML += `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Return Flight:</span>
                    <span style="font-weight: 600;">₦${returnPrice.toLocaleString()}</span>
                </div>
            `;
        }

        breakdownHTML += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-top: 1px solid #eee; pt-2;">
                <span>Price per Adult/Child:</span>
                <span style="color: #0056b3; font-weight: 700;">₦${pricePerPerson.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Passengers:</span>
                <span>${payingPass} (${adults} Adults, ${children} Children)</span>
            </div>
            ${infants > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #666; font-size: 0.9rem; margin-bottom: 8px;">
                <span>Infants (Free):</span>
                <span>${infants}</span>
            </div>` : ''}
        `;

        breakdownDiv.innerHTML = breakdownHTML;
        
        // 4. Update the final total display
        totalSpan.innerText = `₦${finalTotal.toLocaleString()}`;
        
        // Save for API
        bookingState.totalAmount = finalTotal;

    } catch (err) {
        console.error("Error in setupPaymentStep:", err);
    }
}

// Handle Form Submission
// 1. New function to populate Step 4
function initConfirmationStep() {
    const emailElem = document.getElementById('conf-email');
    const refElem = document.getElementById('conf-booking-ref');
    const detailsElem = document.getElementById('conf-details');
    
    if (emailElem) emailElem.innerText = bookingState.contactInfo?.email || "your email";
    if (refElem) refElem.innerText = bookingState.bookingReference || "REF-ERROR";

    if (detailsElem && bookingState.selectedFlight) {
        const flight = bookingState.selectedFlight;
        detailsElem.innerHTML = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #0056b3;">
                <p><strong>Flight:</strong> ${flight.departure_city} to ${flight.arrival_city}</p>
                <p><strong>Date:</strong> ${new Date(flight.departure_time).toLocaleDateString()}</p>
                <p><strong>Total Paid:</strong> ₦${bookingState.totalAmount?.toLocaleString()}</p>
            </div>
        `;
    }
}

// 2. Updated Submission Logic with better error catching
document.getElementById('paymentForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const payBtn = document.getElementById('payNowBtn');
    if (payBtn) {
        payBtn.disabled = true;
        payBtn.innerText = "Processing payment...";
    }

    const contact = bookingState.contactInfo || { email: '', phone: '' };

    // Get the first passenger's name to satisfy the 'passenger_name' requirement
    const primaryPassenger = (bookingState.passengers && bookingState.passengers.length > 0) 
        ? `${bookingState.passengers[0].firstName} ${bookingState.passengers[0].lastName}`
        : "Guest";

    const passengerCounts = bookingState.search.passengers;
    const totalSeats = (parseInt(passengerCounts.adults) || 0) + (parseInt(passengerCounts.children) || 0);

    const finalData = {
        flight_id: bookingState.selectedOutbound?.id,
        passenger_name: primaryPassenger,
        passenger_email: contact.email,    
        passenger_phone: contact.phone,    
        seats_booked: totalSeats,         
        special_requests: ""  ,  
        return_flight_id: bookingState.selectedReturn?.id || null, 
        passenger_name: primaryPassenger,
        passenger_email: contact.email,    
        passenger_phone: contact.phone,    
        seats_booked: totalSeats,            
        special_requests: ""           
    };

    fetch('/api/booking/book/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie ? getCookie('csrftoken') : '' 
        },
        body: JSON.stringify(finalData)
    })
    .then(async res => {
        
        const isJson = res.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await res.json() : null;

        if (!res.ok) {
            throw new Error(data?.error || `Server Error: ${res.status}`);
        }
        return data;
    })
    .then(data => {
        if (data && data.success) {
            bookingState.bookingReference = data.booking.booking_reference;
            initConfirmationStep();
            switchStep(4);
        } else {
            alert("Booking Failed: " + (data?.error || "Unknown error"));
            if (payBtn) {
                payBtn.disabled = false;
                payBtn.innerText = "Pay and Book Now";
            }
        }
    })
    .catch(err => {
        console.error("Detailed Booking Error:", err);
        alert("Booking Error:" + err.message);
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.innerText = "Pay and Book Now";
        }
        
    });
});