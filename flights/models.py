from django.db import models
from django.core.validators import MinValueValidator
from django.urls import reverse
from django.utils import timezone


class Flight(models.Model):
    """
    Represents a scheduled flight available for booking.
    This is the core inventory model for our flight booking system.
    
    Key Features:
    - Unique flight number per airline/route
    - Tracks seat availability in real-time
    - Validates flight logic (departure before arrival, seats don't exceed capacity)
    - Provides business logic methods for availability checks
    
    Real-World Considerations:
    - Flight numbers are globally unique per airline and date
    - Prices are stored as Decimal to avoid floating-point errors
    - Available seats are cached for performance (not calculated from bookings)
    """
    
    # Flight Identification
    flight_number = models.CharField(
        max_length=10,
        unique=True,
        help_text="Unique flight identifier (e.g., AA123, DL456)"
    )
    
    airline = models.CharField(
        max_length=100,
        help_text="Airline operating the flight"
    )
    
    # Route Information
    departure_city = models.CharField(
        max_length=100,
        help_text="City where the flight departs from"
    )
    
    arrival_city = models.CharField(
        max_length=100,
        help_text="City where the flight arrives at"
    )
    
    # Schedule Information
    departure_time = models.DateTimeField(
        help_text="Scheduled departure date and time (local time)"
    )
    
    arrival_time = models.DateTimeField(
        help_text="Scheduled arrival date and time (local time)"
    )
    
    # Capacity and Pricing
    total_seats = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Total number of seats on the aircraft"
    )
    
    available_seats = models.PositiveIntegerField(
        help_text="Number of seats currently available for booking"
    )
    
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text="Price per seat in USD"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        # Default ordering for queries
        ordering = ['departure_time']
        
        # Database indexes for performance
        indexes = [
            models.Index(fields=['departure_city', 'arrival_city']),
            models.Index(fields=['departure_time']),
            models.Index(fields=['price']),
        ]
        
        # Constraints
        constraints = [
            models.CheckConstraint(
                check=models.Q(departure_time__lt=models.F('arrival_time')),
                name='departure_before_arrival'
            ),
            models.CheckConstraint(
                check=models.Q(available_seats__lte=models.F('total_seats')),
                name='available_seats_lte_total_seats'
            ),
            models.CheckConstraint(
                check=models.Q(price__gte=0.01),
                name='price_positive'
            ),
        ]
        
        verbose_name = "Flight"
        verbose_name_plural = "Flights"
    
    def __str__(self):
        """String representation for admin and debugging."""
        return f"{self.airline} {self.flight_number}: {self.departure_city} → {self.arrival_city}"
    
    def get_absolute_url(self):
        """Canonical URL for this flight (for use in templates)."""
        return reverse('flight_detail', kwargs={'pk': self.pk})
    
    def is_available(self):
        """
        Check if flight is available for booking.
        
        Returns:
            bool: True if flight has available seats and departure is in the future
            
        Business Logic:
        - Flight must have at least 1 available seat
        - Flight must not have departed yet
        - Flight must exist (implicit)
        """
        now = timezone.now()
        return self.available_seats > 0 and self.departure_time > now
    
    def flight_duration(self):
        """
        Calculate flight duration in a human-readable format.
        
        Returns:
            str: Formatted duration (e.g., "2h 30m") or "N/A" if times are invalid
            
        Note:
        - Uses naive calculation (doesn't account for timezones for simplicity)
        - Real-world systems would use timezone-aware calculations
        """
        if self.departure_time and self.arrival_time:
            duration = self.arrival_time - self.departure_time
            total_seconds = int(duration.total_seconds())
            
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            
            return f"{hours}h {minutes}m"
        return "N/A"
    
    def percent_full(self):
        """
        Calculate what percentage of seats are occupied.
        
        Returns:
            int: Percentage occupied (0-100)
        """
        if self.total_seats > 0:
            occupied = self.total_seats - self.available_seats
            return int((occupied / self.total_seats) * 100)
        return 0
    
    def seats_left_display(self):
        """
        Human-readable display of seat availability.
        
        Returns:
            str: "Fully booked", "Only X left", or "Plenty available"
        """
        if self.available_seats == 0:
            return "Fully booked"
        elif self.available_seats <= 10:
            return f"Only {self.available_seats} left"
        else:
            return "Plenty available"
    
    def clean(self):
        """
        Model-level validation (called by Django forms and admin).
        
        Raises:
            ValidationError: If flight data is invalid
            
        Note:
        - This is in addition to field-level validators
        - Called automatically in Django admin and ModelForms
        """
        from django.core.exceptions import ValidationError
        
        # Departure must be before arrival
        if self.departure_time and self.arrival_time:
            if self.departure_time >= self.arrival_time:
                raise ValidationError({
                    'arrival_time': 'Arrival time must be after departure time.'
                })
        
        # Available seats cannot exceed total seats
        if self.available_seats > self.total_seats:
            raise ValidationError({
                'available_seats': 'Available seats cannot exceed total seats.'
            })
        
        # Price must be positive
        if self.price <= 0:
            raise ValidationError({
                'price': 'Price must be greater than 0.'
            })
    
    def save(self, *args, **kwargs):
        """
        Override save method to ensure data consistency.
        
        Operations:
        1. Run full clean() validation
        2. Ensure available_seats doesn't exceed total_seats
        3. Save to database
        
        Note:
        - We call clean() here to ensure validation even when saving outside forms
        - This is a Django best practice
        """
        self.full_clean()
        # Additional safety: enforce available_seats <= total_seats
        if self.available_seats > self.total_seats:
            self.available_seats = self.total_seats
        super().save(*args, **kwargs)

# Create your models here.
