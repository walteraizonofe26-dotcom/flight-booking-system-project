from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    """Admin configuration for Booking model"""
    
    # Display fields in list view
    list_display = [
        'id',
        'passenger_name',
        'flight',
        'seats_booked',
        'total_price',
        'status',
        'created_at',
        'is_active',
    ]
    
    # Add search functionality
    search_fields = [
        'passenger_name',
        'passenger_email',
        'flight__flight_number',
        'flight__airline',
    ]
    
    # Add filters in the sidebar
    list_filter = [
        'status',
        'created_at',
        'flight__airline',
        'flight__departure_city',
        'flight__arrival_city',
    ]
    
    # Make some fields read-only
    readonly_fields = [
        'created_at',
        'confirmed_at',
        'cancelled_at',
        'total_price',
    ]
    
    # Pagination
    list_per_page = 25
    
    # Field organization in edit form
    fieldsets = (
        ('Passenger Information', {
            'fields': ('passenger_name', 'passenger_email')
        }),
        ('Flight Information', {
            'fields': ('flight',)
        }),
        ('Booking Details', {
            'fields': ('seats_booked', 'total_price', 'special_requests')
        }),
        ('Status Information', {
            'fields': ('status', 'created_at', 'confirmed_at', 'cancelled_at')
        }),
    )
    
    # Actions you can perform on multiple bookings
    actions = ['confirm_bookings', 'cancel_bookings']
    
    def confirm_bookings(self, request, queryset):
        """Admin action to confirm selected bookings"""
        count = 0
        for booking in queryset:
            if booking.status == Booking.Status.PENDING:
                booking.confirm()
                count += 1
        self.message_user(request, f"{count} booking(s) confirmed.")
    confirm_bookings.short_description = "Confirm selected pending bookings"
    
    def cancel_bookings(self, request, queryset):
        """Admin action to cancel selected bookings"""
        count = 0
        for booking in queryset:
            if booking.status == Booking.Status.CONFIRMED and booking.can_cancel():
                booking.cancel()
                count += 1
        self.message_user(request, f"{count} booking(s) cancelled.")
    cancel_bookings.short_description = "Cancel selected confirmed bookings"
    
    def get_queryset(self, request):
        """Optimize queries by prefetching related flight data"""
        queryset = super().get_queryset(request)
        return queryset.select_related('flight')
    
    def get_form(self, request, obj=None, **kwargs):
        """Customize the form in admin"""
        form = super().get_form(request, obj, **kwargs)
        
        # If editing an existing booking, make flight read-only
        if obj:
            form.base_fields['flight'].disabled = True
            
        return form
    
    def save_model(self, request, obj, form, change):
        """Custom save method for admin to ensure proper price calculation"""
        # Calculate total price if not set
        if not obj.total_price and obj.flight and obj.seats_booked:
            obj.total_price = obj.seats_booked * obj.flight.price
        super().save_model(request, obj, form, change)