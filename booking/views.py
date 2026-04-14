"""
booking/views.py
================
API endpoints for booking operations.
"""

import json
from django.shortcuts import render 
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages

from .models import Booking
from flights.models import Flight

@csrf_exempt
@require_http_methods(["POST"])
def create_booking_api(request):
    """
    Handles the flight booking process via AJAX.
    """
    try:
        data = json.loads(request.body)
        
        # 1. Extract and Validate Input
        flight_id = data.get('flight_id')
        return_flight_id = data.get('return_flight_id')
        passenger_name = data.get('passenger_name')
        passenger_email = data.get('passenger_email')
        passenger_phone = data.get('passenger_phone', '')
        seats_booked = int(data.get('seats_booked', 1))
        special_requests = data.get('special_requests', '')
        
        if not all([flight_id, passenger_name, passenger_email]):
            return JsonResponse({'success': False, 'error': 'Missing required fields'}, status=400)
        
        if seats_booked <= 0:
            return JsonResponse({'success': False, 'error': 'Seats must be at least 1'}, status=400)

        # 2. Database Operations (Atomic to prevent race conditions)
        with transaction.atomic():
            # Get Outbound Flight
            try:
                flight = Flight.objects.select_for_update().get(id=flight_id, is_active=True)
            except Flight.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Outbound flight not found'}, status=404)

            # Check Outbound Seats
            if seats_booked > flight.available_seats:
                return JsonResponse({'success': False, 'error': f'Only {flight.available_seats} seats left on outbound'}, status=400)

            # Handle Return Flight (if applicable)
            return_flight = None
            if return_flight_id:
                try:
                    return_flight = Flight.objects.select_for_update().get(id=return_flight_id, is_active=True)
                    # FIX: Added seat check for return flight
                    if seats_booked > return_flight.available_seats:
                        return JsonResponse({'success': False, 'error': f'Only {return_flight.available_seats} seats left on return'}, status=400)
                except Flight.DoesNotExist:
                    return JsonResponse({'success': False, 'error': 'Return flight not found'}, status=404)

            # 3. Calculate Pricing
            total_price = flight.price
            if return_flight:
                total_price += return_flight.price
            final_total = total_price * seats_booked

            # 4. Create the Booking
            # IMPORTANT: Link the booking to request.user if they are logged in!
            booking = Booking.objects.create(
                user=request.user if request.user.is_authenticated else None, # Links to account
                flight=flight,
                return_flight=return_flight,
                passenger_name=passenger_name,
                passenger_email=passenger_email,
                passenger_phone=passenger_phone,
                seats_booked=seats_booked,
                special_requests=special_requests,
                status=Booking.Status.CONFIRMED,
                total_price=final_total
            )

            # Note: We assume your Model's save() method or a signal handles 
            # decrementing Flight.available_seats.

            return JsonResponse({
                'success': True,
                'booking': {
                    'id': booking.id,
                    'reference': booking.booking_reference,
                    'total': float(booking.total_price),
                    'passenger': booking.passenger_name
                }
            })
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@login_required
def my_bookings(request):
    """
    Displays the logged-in user's travel history.
    """
    user_bookings = Booking.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'pages/my_bookings.html', {'bookings': user_bookings})


def find_booking(request):
    """
    Handles searching for a specific booking via reference and email.
    This is the destination for the redirect from the homepage.
    """
    ref = request.GET.get('ref')
    email = request.GET.get('email')

    if ref and email:
        try:
            # We use select_related to grab flight info in one go for better performance
            booking = Booking.objects.select_related('flight', 'return_flight').get(
                booking_reference=ref, 
                passenger_email=email
            )
            
            # We pass it as a list so the template's {% for booking in bookings %} still works
            return render(request, 'pages/my_bookings.html', {
                'bookings': [booking],
                'search_mode': True  # Optional: helps you show a "Back to Home" button
            })
        except Booking.DoesNotExist:
            messages.error(request, "No booking found with these details.")
            return redirect('home')
    
    return redirect('home')



@csrf_exempt # Use @csrf_protect in production with a proper header
@require_http_methods(["POST"])
def search_booking_api(request):
    try:
        data = json.loads(request.body)
        ref = data.get('booking_reference', '').strip()
        email = data.get('bookingEmail', '').strip()

        if not ref or not email:
            return JsonResponse({'success': False, 'error': 'Reference and Email are required.'}, status=400)

        # Look up using your specific field names
        booking = Booking.objects.filter(booking_reference=ref, passenger_email=email).first()

        if not booking:
            return JsonResponse({'success': False, 'error': 'No booking found with these details.'}, status=404)

        # Aligning with your flight/views.py format
        booking_data = {
            'id': booking.id,
            'ref': booking.booking_reference,
            'origin': booking.flight.departure_city,
            'destination': booking.flight.arrival_city,
            'departure_date': booking.flight.departure_time.strftime('%d %b %Y'),
            'departure_time': booking.flight.departure_time.strftime('%H:%M'),
            'trip_type': "Round Trip" if booking.return_flight else "One Way",
            'passengers': booking.seats_booked,
            'total_price': f"{booking.total_price:,.2f}",
            'status': booking.get_status_display(),
            'status_raw': booking.status.lower()
        }

        return JsonResponse({'success': True, 'booking': booking_data})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def cancel_booking_api(request, booking_id):
    try:
        booking = get_object_or_404(Booking, id=booking_id)
        # Update status instead of deleting to keep records
        booking.status = 'CANCELLED' 
        booking.save()
        return JsonResponse({'success': True, 'message': 'Booking cancelled successfully.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

