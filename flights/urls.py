"""
flights/urls.py
===============
API endpoints for flight search.
"""

from django.urls import path
from . import views

app_name = 'flights'

urlpatterns = [
    # API endpoint for flight search
    path('api/search/', views.search_flights, name='search_flights'),
]