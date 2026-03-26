# API endpoints for flight search.

from django.urls import path
from . import views

app_name = 'flights'

urlpatterns = [
    # API endpoint for flight search
    path('search/', views.search_flights, name='search-flights'),

]