from django.shortcuts import render
"""
API endpoints for flight operations.
"""
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from .models import Flight
import json


@require_http_methods(["POST"])
def search_flights(request):
    """
    API endpoint to search for available flights.
    
    Expected POST data (JSON):
    {
        "departure_city": "New York",
        "arrival_city": "Los Angeles",
        "departure_date": "2026-02-01",
        "return_date": "2026-02-05",  // optional
        "trip_type": "one-way" or "round-trip",
        "adults": 1,
        "children": 0,
        "infants": 0
    }
    """
    try:
        data = json.loads(request.body)
        
        departure_city = data.get('departure_city')
        arrival_city = data.get('arrival_city')
        departure_date = data.get('departure_date')
        trip_type = data.get('trip_type', 'one-way')
        
        # Validate required fields
        if not all([departure_city, arrival_city, departure_date]):
            return JsonResponse({
                'success': False,
                'error': 'Missing required fields'
            }, status=400)
        
        # Parse date
        from datetime import datetime
        departure_datetime = datetime.strptime(departure_date, '%Y-%m-%d')
        
        # Search outbound flights
        now = timezone.now()
        outbound_flights = Flight.objects.filter(
            departure_city__iexact=departure_city,
            arrival_city__iexact=arrival_city,
            departure_time__date=departure_datetime.date(),
            departure_time__gt=now,
            available_seats__gt=0
        ).order_by('departure_time')
        
        # Format outbound flights
        outbound_data = [{
            'id': flight.id,
            'flight_number': flight.flight_number,
            'airline': flight.airline,
            'departure_city': flight.departure_city,
            'arrival_city': flight.arrival_city,
            'departure_time': flight.departure_time.strftime('%Y-%m-%d %H:%M'),
            'arrival_time': flight.arrival_time.strftime('%Y-%m-%d %H:%M'),
            'duration': flight.flight_duration(),
            'price': float(flight.price),
            'available_seats': flight.available_seats,
            'total_seats': flight.total_seats
        } for flight in outbound_flights]
        
        response_data = {
            'success': True,
            'trip_type': trip_type,
            'outbound_flights': outbound_data
        }
        
        # Search return flights if round-trip
        if trip_type == 'round-trip' and data.get('return_date'):
            return_date = data.get('return_date')
            return_datetime = datetime.strptime(return_date, '%Y-%m-%d')
            
            return_flights = Flight.objects.filter(
                departure_city__iexact=arrival_city,  # Reverse route
                arrival_city__iexact=departure_city,
                departure_time__date=return_datetime.date(),
                departure_time__gt=now,
                available_seats__gt=0
            ).order_by('departure_time')
            
            return_data = [{
                'id': flight.id,
                'flight_number': flight.flight_number,
                'airline': flight.airline,
                'departure_city': flight.departure_city,
                'arrival_city': flight.arrival_city,
                'departure_time': flight.departure_time.strftime('%Y-%m-%d %H:%M'),
                'arrival_time': flight.arrival_time.strftime('%Y-%m-%d %H:%M'),
                'duration': flight.flight_duration(),
                'price': float(flight.price),
                'available_seats': flight.available_seats,
                'total_seats': flight.total_seats
            } for flight in return_flights]
            
            response_data['return_flights'] = return_data
        
        return JsonResponse(response_data)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

# Create your views here.
