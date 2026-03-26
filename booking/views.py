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
    try:
        data = json.loads(request.body)
        
        # Extract booking data
        flight_id = data.get('flight_id')
        return_flight_id = data.get('return_flight_id')
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
        
        if seats_booked <=0:
            return JsonResponse({
                "success": False,
                "error": "seats booked must be greater than 0"},
                status=400)
        
        
        # Get outbound flight
        with transaction.atomic():
            try:
                flight = Flight.objects.select_for_update().get(id=flight_id, is_active=True)
            except Flight.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Flight not found'
                }, status=404)
        
            return_flight = None
            if return_flight_id:
                try:
                    return_flight = Flight.objects.select_for_update().get(id=return_flight_id, is_active=True)
                except Flight.DoesNotExist:
                    return JsonResponse({'success': False, 'error': 'Return flight not found'}, status=404)
        
        # Check seat availability
            if seats_booked > flight.available_seats:
                return JsonResponse({
                    'success': False,
                    'error': f'Only {flight.available_seats} seats available'
                }, status=400)
        # 3. Check seat availability for both legs
            if seats_booked > flight.available_seats:
                return JsonResponse({
                    'success': False, 
                    'error': f'Only {flight.available_seats} seats left on outbound'},
                    status=400)
        
        # Create booking in transaction
            unit_price = flight.price
            if return_flight:
                unit_price += return_flight.price
            
            calculated_total = unit_price * seats_booked
        # with transaction.atomic():
            booking = Booking.objects.create(
                flight=flight,
                return_flight=return_flight,
                passenger_name=passenger_name,
                passenger_email=passenger_email,
                passenger_phone=passenger_phone,
                seats_booked=seats_booked,
                special_requests=special_requests,
                status=Booking.Status.CONFIRMED,
                total_price=calculated_total
                )
            
            # Deduct seats (handled in model save method)
            # Return success response
            return JsonResponse({
                'success': True,
                'booking': {
                    'id': booking.id,
                    'booking_reference': booking.booking_reference,
                    'outbound': f"{flight.departure_city} to {flight.arrival_city}",
                    'return': f"{return_flight.departure_city} to {return_flight.arrival_city}" if return_flight else "N/A",
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
