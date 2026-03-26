/**
 * passengers.js - Handles dynamic forms and header calculations
 */

let currentPassengerIndex = 0; // Tracks which passenger is being filled

/**
 * Called by book.js when a flight is selected
 */
function setupPassengerForm() {
    const search = bookingState.search;
    const outbound = bookingState.selectedOutbound;
    const return_flight = bookingState.selectedReturn;

    if (!outbound) {
        console.error("No flight selected!");
        return;
    }

    /// 1. Calculate Total Passengers
    const adults = parseInt(search.passengers.adults || 0);
    const children = parseInt(search.passengers.children || 0);
    const infants = parseInt(search.passengers.infants || 0);
    const totalCount = adults + children + infants;
    
    // 2. Calculate Total Price (Outbound + Return) * (Adults + Children)
    let pricePerPerson = parseFloat(outbound.price || 0);
    if (return_flight) {
        pricePerPerson += parseFloat(return_flight.price || 0);
    }
    const totalPrice = pricePerPerson * (adults + children);
    
    // 3. Update the Blue Header
    updatePassengerHeader(totalPrice, totalCount);
// 4. Initialize the passenger data array
    bookingState.passengers = [];
    currentPassengerIndex = 0;

    // 5. Start with the first passenger
    showPassengerForm(0);
}

/**
 * Updates the Header with dynamic Trip Context and Price
 */
function updatePassengerHeader(totalPrice, totalCount) {
    const headerTitle = document.getElementById('header-cities'); 
    const headerMeta = document.getElementById('header-meta');
    const headerPrice = document.getElementById('header-total-price');

    const flightData = bookingState.selectedOutbound;

    if (flightData) {
        if (headerTitle) {
            headerTitle.innerText = `${flightData.departure_city} - ${flightData.arrival_city}`;
        }
        
        if (headerMeta) {
            const date = flightData.date_str || "---";
            const time = flightData.dep_time || "---";
            headerMeta.innerText = `${date} | ${time} | ${totalCount} Traveler(s)`;
        }
    }

    
    if (headerPrice) {
        headerPrice.innerText = `₦${totalPrice.toLocaleString()}`;
    }
}


function showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorSpan = document.getElementById(`err-${fieldId}`);
    
    if (input) input.style.borderColor = "#dc3545";
    if (errorSpan) {
        errorSpan.innerText = message;
        errorSpan.style.display = "block";
    }
}

function clearErrors() {
    document.querySelectorAll('.form-input').forEach(i => i.style.borderColor = "");
    document.querySelectorAll('.error-msg').forEach(s => s.style.display = "none");
}

function showPassengerForm(index) {
    const container = document.getElementById('passenger-form-container');
    if (!container) return;

    const existingData = bookingState.passengers[index] || {};

   const counts = bookingState.search.passengers;
    const numAdults = parseInt(counts.adults) || 0;
    const numChildren = parseInt(counts.children) || 0;
    const numInfants = parseInt(counts.infants) || 0;
    const totalTravelers = numAdults + numChildren + numInfants;
    
    // Determine Type and Display Index
    let type = "Adult";
    let displayIdx = index + 1;

    if (index >= numAdults) {
        type = "Child";
        displayIdx = (index - numAdults) + 1;
    } 
    if (index >= (numAdults + numChildren)) {
        type = "Infant";
        displayIdx = (index - numAdults - numChildren) + 1;
    }
       
    const isLast = (index === totalTravelers - 1);

   container.innerHTML = `
      <div class="passenger-card animate-fade-in" style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 20px; color: #003366;"><i class="fas fa-user"></i> ${type} ${displayIdx} Details</h3>
            <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="input-group">
                    <label>Title</label>
                    <select id="p-title" class="form-input">
                        <option ${existingData.title === 'Mr' ? 'selected' : ''}>Mr</option>
                        <option ${existingData.title === 'Mrs' ? 'selected' : ''}>Mrs</option>
                        <option ${existingData.title === 'Ms' ? 'selected' : ''}>Ms</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Gender</label>
                    <select id="p-gender" class="form-input">
                        <option ${existingData.gender === 'Male' ? 'selected' : ''}>Male</option>
                        <option ${existingData.gender === 'Female' ? 'selected' : ''}>Female</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>First Name</label>
                    <input type="text" id="p-fname" class="form-input" placeholder="Enter first name" value="${existingData.firstName || ''}">
                    <span class="error-msg" id="err-p-fname"></span>
                </div>
                <div class="input-group">
                    <label>Last Name</label>
                    <input type="text" id="p-lname" class="form-input" placeholder="Enter last name" value="${existingData.lastName || ''}">
                    <span class="error-msg" id="err-p-lname"></span>
                </div>
                <div class="input-group">
                    <label>Date of Birth</label>
                    <input type="date" id="p-dob" class="form-input" value="${existingData.dob || ''}">
                    <span class="error-msg" id="err-p-dob"></span>
                </div>
                <div class="input-group">
                    <label>Nationality</label>
                    <input type="text" id="p-nation" class="form-input" placeholder="e.g. Nigerian" value="${existingData.nationality || ''}">
                    <span class="error-msg" id="err-p-nation"></span>
                </div>
            </div>

            <div class="form-actions" style="margin-top: 30px; display: flex; justify-content: flex-end;">
                ${isLast 
                   ? `<button class="continue-btn" onclick="validateAndProcess(${index}, true)" style="background: #28a745; color: white; border: none; padding: 12px 25px; border-radius: 5px; cursor: pointer; font-weight: bold;">Proceed to Contact Info <i class="fas fa-arrow-right"></i></button>`
                    : `<button class="btn-next" onclick="validateAndProcess(${index}, false)" style="background: #0056b3; color: white; border: none; padding: 12px 25px; border-radius: 5px; cursor: pointer;">Next Passenger</button>`
                }
            </div>
        </div>
    `;

    updateSidebar(index);
}
/**
 * Security Check: Prevents duplicate name/DOB combos
 */
function validateAndProcess(index, isFinal) {
    clearErrors();
    const title = document.getElementById('p-title').value;
    const gender = document.getElementById('p-gender').value;
    const fname = document.getElementById('p-fname').value.trim();
    const lname = document.getElementById('p-lname').value.trim();
    const dob = document.getElementById('p-dob').value;
    const nation = document.getElementById('p-nation').value.trim();

    let hasError = false;
    if (!fname) { showError('p-fname', "First name is required"); hasError = true; }
    if (!lname) { showError('p-lname', "Last name is required"); hasError = true; }
    if (!dob) { showError('p-dob', "Date of birth is required"); hasError = true; }
    if (!nation) { showError('p-nation', "Nationality is required"); hasError = true; }

    if (hasError) return;

    
    const isDuplicate = bookingState.passengers.some((p, i) => 
        i !== index && 
        p.firstName.toLowerCase() === fname.toLowerCase() && 
        p.lastName.toLowerCase() === lname.toLowerCase()
    );

    if (isDuplicate) {
        showError('p-fname', "This passenger has already been added in another passenger.");
        showError('p-lname', "Please ensure each passenger has a unique name.");
        return;
    }

    
    bookingState.passengers[index] = { 
        title: document.getElementById('p-title').value,
        gender: document.getElementById('p-gender').value,
        firstName: fname, 
        lastName: lname, 
        dob: dob,
        nationality: nation
    };

    if (isFinal) {
        toggleStep2SubView('contact');
              
        // Push history so back arrow works for the contact section
        history.pushState({ step: 2, sub: 'contact' }, "Contact Details", "");
    
    } else {
        currentPassengerIndex = index + 1;
        showPassengerForm(currentPassengerIndex);
        window.scrollTo(0, 0);
    }
}

/**
 * Final Step: Validate Contact Info and move to Payment
 */
function validateContactAndPay() {
    if (typeof clearErrors === "function") clearErrors();
    
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    
    let hasError = false;

    // Validation Logic
    if (!email || !email.includes('@')) { 
        showError('contactEmail', "Please enter a valid email address."); 
        hasError = true; 
    }
    if (!phone || phone.length < 7) { 
        showError('contactPhone', "A valid phone number is required."); 
        hasError = true; 
    }

    if (hasError) {
        console.warn("Validation failed for contact information.");
        return;
    }

    // 1. Save contact info to the global state
    bookingState.contactInfo = { email, phone };

    // 2. Prepare the Payment Step (Price breakdown, etc.)
    if (typeof setupPaymentStep === "function") {
        try {
            setupPaymentStep();
        } catch (e) {
            console.error("Critical: Could not prepare payment details:", e);
        }
    }

    // 3. Move to Step 3
    switchStep(3);

    // 4. Final UI Cleanup
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Updates Sidebar Progress
 */
function updateSidebar(activeIndex) {
    const sidebar = document.getElementById('passenger-sidebar');
    if (!sidebar) return;

    const total = bookingState.search.passengers.adults + bookingState.search.passengers.children + bookingState.search.passengers.infants;
    
   let html = '<ul style="list-style: none; padding: 0;">';
    for (let i = 0; i < total; i++) {
        const isActive = (i === activeIndex);
        const isDone = (i < activeIndex);
        const color = isActive ? '#0056b3' : (isDone ? '#b97810' : '#64748b');
        const icon = isDone ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-circle"></i>';
        
        html += `<li style="padding: 15px; border-left: 4px solid ${color}; margin-bottom: 10px; background: ${isActive ? '#f0f7ff' : '#f8fafc'}; color: ${color}; font-weight: bold;">
                    ${icon} Passenger ${i + 1}
                 </li>`;
    }
    html += '</ul>';
    sidebar.innerHTML = html;
}

function toggleStep2SubView(view) {
    const formContainer = document.getElementById('passenger-form-container');
    const contactSection = document.getElementById('final-steps-container');
    
    if (view === 'contact') {
        if (formContainer) formContainer.style.display = 'none';
        if (contactSection) contactSection.style.display = 'block';
    } else {
        if (formContainer) formContainer.style.display = 'block';
        if (contactSection) contactSection.style.display = 'none';
    }
}


/**
 * validateAndProceedToPayment()
 * Saves contact info from Step 2 and moves to Step 3.
 */
function validateAndProceedToPayment() {
    // 1. Grab the input elements
    const emailInput = document.getElementById('contactEmail'); 
    const phoneInput = document.getElementById('contactPhone');  

    // 2. Simple validation check
    if (!emailInput?.value || !phoneInput?.value) {
        alert("Please fill in your contact email and phone number.");
        return;
    }

    // 3. Save to the global Brain (bookingState)
    // payment.js looks for 'bookingState.contactInfo' specifically
    bookingState.contactInfo = {
        email: emailInput.value,
        phone: phoneInput.value
    };

    console.log("Contact Info Saved:", bookingState.contactInfo);

    // 4. Move to the Payment Section
    if (typeof switchStep === "function") {
        switchStep(3);
    }
}