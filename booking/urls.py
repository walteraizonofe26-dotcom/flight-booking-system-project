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
    path('book/', views.create_booking, name='create_booking'),
]   