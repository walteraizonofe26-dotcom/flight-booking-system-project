from django.contrib import admin
from .models import Booking

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):

    # Display fields in list view
    list_display = [
        'booking_reference',
        'passenger_name',
        'user',
        'flight',
        'seats_booked',
        'total_price',
        'status',
        'created_at',
        'is_active',
    ]
    
    # Add search functionality
    search_fields = [
        'booking_reference',
        'passenger_name',
        'passenger_email',
        'user__username',
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
        'booking_reference',
        'created_at',
        'confirmed_at',
        'cancelled_at',
        'total_price',
    ]
    
    # Pagination
    list_per_page = 25
    
    # Field organization in edit form
    fieldsets = (
        ('Booking Information', {
            'fields': ('booking_reference', 'user', 'status')
        }),
        ('Passenger Information', {
            'fields': ('passenger_name', 'passenger_email', 'passenger_phone')
        }),
        ('Flight Information', {
            'fields': ('flight',)
        }),
        ('Booking Details', {
            'fields': ('seats_booked', 'total_price', 'special_requests')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'confirmed_at', 'cancelled_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Actions
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
        """Optimize queries by prefetching related data"""
        queryset = super().get_queryset(request)
        return queryset.select_related('flight', 'user')
    
    def get_form(self, request, obj=None, **kwargs):
        """Customize the form in admin"""
        form = super().get_form(request, obj, **kwargs)
        
        # If editing an existing booking, make certain fields read-only
        if obj:
            form.base_fields['flight'].disabled = True
            form.base_fields['user'].disabled = True
            
        return form