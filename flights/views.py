"""

API endpoints for flight operations.

"""

from django.http import JsonResponse

from django.views.decorators.http import require_http_methods

from django.utils import timezone

from .models import Flight

import json

from datetime import datetime


# Create your views here.


@require_http_methods(["POST"])
def search_flights(request):
    try:
        data = json.loads(request.body)
        from_city = data.get('from_city', "").strip()
        to_city = data.get('to_city', "").strip()
        departure_date = data.get('departure_date')
        trip_type = data.get('trip_type', 'one-way')
        return_date_str = data.get('return_date')
        # Validate required fields
        if not all([from_city, to_city, departure_date]):
            return JsonResponse({
                'success': False,
                'error': 'Missing required fields'
            }, status=400)
        
        departure_dt = datetime.strptime(departure_date, "%Y-%m-%d")

         # Search outbound flights
        outbound_flights = Flight.objects.filter(
            is_active=True,
            departure_city__iexact=from_city,
            arrival_city__iexact=to_city,
            departure_time__date=departure_dt.date(),
            # departure_time__gt=now,
            available_seats__gt=0
            ).order_by('departure_time')
        
        # Format outbound flights
        def format_flight(flight):
            return{
            'id': flight.id,
            'flight_number': flight.flight_number,
            'airline': flight.airline,
            'departure_city': flight.departure_city,
            'arrival_city': flight.arrival_city,
            'date_str': flight.departure_time.strftime('%d %b %Y'),
            'dep_time': flight.departure_time.strftime('%H:%M'),
            'arr_time': flight.arrival_time.strftime('%H:%M'),
            'duration': flight.flight_duration(),
            'price': float(flight.price),
            'available_seats': flight.available_seats,
            'total_seats': flight.total_seats

        } 

        response_data = {
            'success': True,
            'trip_type': trip_type,
            'outbound_flights': [format_flight(flight) for flight in outbound_flights],
            'return_flights': []
        }
        # Search return flights if round-trip

        if trip_type == 'round-trip' and return_date_str:
            try:
                ret_date_str = data.get('return_date')
                ret_date_obj = datetime.strptime(ret_date_str, "%Y-%m-%d").date()         
                return_flights = Flight.objects.filter(
                    is_active=True,
                    departure_city__iexact=to_city,  # Reverse route
                    arrival_city__iexact=from_city,
                    departure_time__date=ret_date_obj,
                    # departure_time__gt=now,
                    available_seats__gt=0
                ).order_by('departure_time')
                response_data['return_flights'] = [format_flight(flight) for flight in return_flights]

            except (ValueError, TypeError):
                
                response_data['return_flights'] = []
        return JsonResponse(response_data)
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON format'
        }, status=400)
    except Exception as e:
       print(f"Server Error: {str(e)}") 
       return JsonResponse({'success': False, 'error': "server error occurred"}, status=500)




