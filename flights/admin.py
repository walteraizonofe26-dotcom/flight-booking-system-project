from django.contrib import admin
from .models import Flight


@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    """Admin configuration for Flight model"""
    
    # Display fields in list view
    list_display = [
        'flight_number',
        'airline',
        'departure_city',
        'arrival_city', 
        'departure_time',
        'arrival_time',
        'available_seats',
        'total_seats',
        'price',
        'is_available',
    ]
    
    # Add search functionality
    search_fields = [
        'flight_number',
        'airline', 
        'departure_city',
        'arrival_city',
    ]
    
    # Add filters in the sidebar
    list_filter = [
        'airline',
        'departure_city',
        'arrival_city',
        'departure_time',
    ]
    
    # Make some fields read-only
    readonly_fields = ['created_at', 'updated_at']
    
    # Pagination
    list_per_page = 25
    
    # Field organization in edit form
    fieldsets = (
        ('Flight Information', {
            'fields': ('flight_number', 'airline')
        }),
        ('Route Information', {
            'fields': ('departure_city', 'arrival_city')
        }),
        ('Schedule', {
            'fields': ('departure_time', 'arrival_time')
        }),
        ('Capacity & Pricing', {
            'fields': ('total_seats', 'available_seats', 'price')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)  # Collapsible section
        }),
    )
    
    # Actions you can perform on multiple flights
    actions = ['mark_as_full', 'increase_price_10_percent']
    
    def mark_as_full(self, request, queryset):
        """Admin action to mark selected flights as full"""
        updated = queryset.update(available_seats=0)
        self.message_user(request, f"{updated} flight(s) marked as full.")
    mark_as_full.short_description = "Mark selected flights as full (no seats available)"
    
    def increase_price_10_percent(self, request, queryset):
        """Admin action to increase price by 10%"""
        for flight in queryset:
            flight.price = flight.price * 1.1
            flight.save()
        self.message_user(request, f"Prices increased by 10% for {queryset.count()} flight(s).")
    increase_price_10_percent.short_description = "Increase price by 10%%"  # Fixed: Use %% to escape %
    
    def get_queryset(self, request):
        """Optimize queries by prefetching related data"""
        queryset = super().get_queryset(request)
        return queryset
    
    # Add this method to handle the save in admin
    def save_model(self, request, obj, form, change):
        """Custom save method for admin"""
        # Ensure available_seats doesn't exceed total_seats
        if obj.available_seats > obj.total_seats:
            obj.available_seats = obj.total_seats
        super().save_model(request, obj, form, change)