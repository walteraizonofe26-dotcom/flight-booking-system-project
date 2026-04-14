"""
booking/urls.py
===============
API endpoints for booking operations.
"""

from django.urls import path
from . import views

app_name = 'booking'

urlpatterns = [
    # API endpoint to create booking
    path('book/', views.create_booking_api, name='create_booking_api'),
    path('my-bookings/', views.my_bookings, name='my_bookings'),
    path('find/', views.find_booking, name='find_booking'),
    path('search/', views.search_booking_api, name='search_booking_api'),
    path('cancel/<int:booking_id>/', views.cancel_booking_api, name='cancel_booking_api'),
]   