from django.shortcuts import render
"""
booking/views.py
================
API endpoints for booking operations.
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db import transaction
from .models import Booking
from flights.models import Flight
import json


@require_http_methods(["POST"])
def create_booking(request):
    """
    API endpoint to create a new booking.
    
    Expected POST data (JSON):
    {
        "flight_id": 1,
        "passenger_name": "John Smith",
        "passenger_email": "john@example.com",
        "passenger_phone": "+1-555-1234",
        "seats_booked": 2,
        "special_requests": "Window seat please",
        "card_number": "4111111111111111",  // mock only
        "card_expiry": "12/25",
        "card_cvv": "123"
    }
    """
    try:
        data = json.loads(request.body)
        
        # Extract booking data
        flight_id = data.get('flight_id')
        passenger_name = data.get('passenger_name')
        passenger_email = data.get('passenger_email')
        passenger_phone = data.get('passenger_phone', '')
        seats_booked = int(data.get('seats_booked', 1))
        special_requests = data.get('special_requests', '')
        
        # Validate required fields
        if not all([flight_id, passenger_name, passenger_email]):
            return JsonResponse({
                'success': False,
                'error': 'Missing required fields'
            }, status=400)
        
        # Get flight
        try:
            flight = Flight.objects.get(id=flight_id)
        except Flight.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Flight not found'
            }, status=404)
        
        # Check seat availability
        if seats_booked > flight.available_seats:
            return JsonResponse({
                'success': False,
                'error': f'Only {flight.available_seats} seats available'
            }, status=400)
        
        # Create booking in transaction
        with transaction.atomic():
            booking = Booking.objects.create(
                flight=flight,
                passenger_name=passenger_name,
                passenger_email=passenger_email,
                passenger_phone=passenger_phone,
                seats_booked=seats_booked,
                special_requests=special_requests,
                status=Booking.Status.CONFIRMED,
                total_price=flight.price * seats_booked
            )
            
            # Deduct seats (handled in model save method)
            # Return success response
            return JsonResponse({
                'success': True,
                'booking': {
                    'id': booking.id,
                    'booking_reference': booking.booking_reference,
                    'passenger_name': booking.passenger_name,
                    'flight_number': booking.flight.flight_number,
                    'departure_city': booking.flight.departure_city,
                    'arrival_city': booking.flight.arrival_city,
                    'departure_time': booking.flight.departure_time.strftime('%Y-%m-%d %H:%M'),
                    'seats_booked': booking.seats_booked,
                    'total_price': float(booking.total_price),
                    'status': booking.status,
                    'created_at': booking.created_at.strftime('%Y-%m-%d %H:%M:%S')
                }
            })
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON'
        }, status=400)
    except ValueError as e:
        return JsonResponse({
            'success': False,
            'error': f'Invalid data: {str(e)}'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
# Create your views here.
