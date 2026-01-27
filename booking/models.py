
# Booking model for flight booking system.
# Handles passenger reservations and booking lifecycle management.

from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
    
    # Core relationships - ForeignKey to Flight without cascading delete
    flight = models.ForeignKey(
        'flights.Flight',
        on_delete=models.PROTECT,  # Prevent flight deletion if bookings exist
        related_name='bookings',
        help_text="The flight being booked"
    )
    
    # Passenger information 
    passenger_name = models.CharField(
        max_length=200,
        help_text="Full name of the passenger"
    )
    
    passenger_email = models.EmailField(
        help_text="Contact email for booking confirmation"
    )
    
    # Booking details
    seats_booked = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Number of seats reserved in this booking"
    )
    
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text="Total cost (seats_booked × flight.price)"
    )
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        help_text="Current status of the booking"
    )
    
    # Timestamps for audit trail
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the booking was initially created"
    )
    
    confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the booking was confirmed"
    )
    
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the booking was cancelled (if applicable)"
    )
    
    # Additional information
    special_requests = models.TextField(
        blank=True,
        max_length=500,
        help_text="Any special requirements or requests"
    )
    
    class Meta:
        # Most recent bookings first for user dashboards
        ordering = ['-created_at']
        
        # Database indexes for common query patterns
        indexes = [
            models.Index(fields=['passenger_email']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['flight', 'status']),
        ]
        
        # Business rule constraints at database level
        # For Django 5.x, use the correct syntax
        constraints = [
            # Prevent booking 0 or negative seats
            models.CheckConstraint(
                name='positive_seats_booked',
                check=models.Q(seats_booked__gt=0)
            ),
            # Ensure total_price is positive
            models.CheckConstraint(
                name='positive_total_price',
                check=models.Q(total_price__gte=0.01)
            ),
        ]
        
        verbose_name = "Booking"
        verbose_name_plural = "Bookings"
    
    def __str__(self):
        """Human-readable representation for admin and debugging."""
        return f"{self.passenger_name} - {self.flight.flight_number} ({self.status})"
    
    def clean(self):
        """
        Model-level validation for business rules.
        Called automatically in Django admin and ModelForms.
        """
        from django.core.exceptions import ValidationError
        
        # PENDING or CONFIRMED bookings cannot exceed available seats
        if self.status in [self.Status.PENDING, self.Status.CONFIRMED]:
            # For new bookings or existing bookings with seat count changes
            existing_seats = 0
            if not self._state.adding:
                try:
                    original = Booking.objects.get(pk=self.pk)
                    if original.status == self.Status.CONFIRMED:
                        existing_seats = original.seats_booked
                except Booking.DoesNotExist:
                    pass
            
            net_new_seats = self.seats_booked - existing_seats
            if net_new_seats > 0 and net_new_seats > self.flight.available_seats:
                raise ValidationError({
                    'seats_booked': f'Only {self.flight.available_seats} seat(s) available'
                })
    
    def save(self, *args, **kwargs):
        """
        Override save to handle business logic and ensure data consistency.
        
        Key operations:
        1. Calculate total price if not set
        2. Handle seat allocation/deallocation for status changes
        3. Set timestamps for status transitions
        """
        from django.db import transaction
        
        # Calculate total price if not already set
        if not self.total_price and self.flight:
            self.total_price = self.seats_booked * self.flight.price
        
        # Determine if this is a new booking
        is_new = self._state.adding
        
        # For new or changed bookings, use atomic transaction for seat management
        with transaction.atomic():
            # Lock the flight row to prevent race conditions
            if not is_new:
                original = Booking.objects.select_for_update().get(pk=self.pk)
            else:
                original = None
            
            # Handle status transitions and seat management
            self._handle_status_transition(original, is_new)
            
            # Run full validation
            self.full_clean()
            
            # Save the booking
            super().save(*args, **kwargs)
    
    def _handle_status_transition(self, original, is_new):
        """
        Internal method to handle status changes and seat adjustments.
        
        Business Rules:
        - PENDING: No seat deduction
        - CONFIRMED: Deduct seats from flight
        - CANCELLED: Return seats to flight (if previously confirmed)
        """
        # For new bookings
        if is_new:
            if self.status == self.Status.CONFIRMED:
                self._deduct_seats()
                self.confirmed_at = timezone.now()
        
        # For existing bookings with status changes
        elif original and original.status != self.status:
            # PENDING → CONFIRMED: Deduct seats
            if (original.status == self.Status.PENDING and 
                self.status == self.Status.CONFIRMED):
                self._deduct_seats()
                self.confirmed_at = timezone.now()
            
            # CONFIRMED → CANCELLED: Return seats
            elif (original.status == self.Status.CONFIRMED and 
                  self.status == self.Status.CANCELLED):
                self._return_seats()
                self.cancelled_at = timezone.now()
            
            # CANCELLED → CONFIRMED: Special case - re-confirm
            elif (original.status == self.Status.CANCELLED and 
                  self.status == self.Status.CONFIRMED):
                self._deduct_seats()
                self.confirmed_at = timezone.now()
                self.cancelled_at = None
            
            # Seat count changed for CONFIRMED booking
            elif (original.status == self.Status.CONFIRMED and 
                  self.status == self.Status.CONFIRMED and 
                  original.seats_booked != self.seats_booked):
                seat_difference = self.seats_booked - original.seats_booked
                if seat_difference > 0:
                    # Requesting more seats
                    if seat_difference > self.flight.available_seats:
                        from django.core.exceptions import ValidationError
                        raise ValidationError(
                            f'Cannot add {seat_difference} seat(s). '
                            f'Only {self.flight.available_seats} available.'
                        )
                    self.flight.available_seats -= seat_difference
                    self.flight.save()
                elif seat_difference < 0:
                    # Reducing seat count
                    self.flight.available_seats += abs(seat_difference)
                    self.flight.save()
    
    def _deduct_seats(self):
        """Internal method to deduct seats from flight availability."""
        if self.seats_booked > self.flight.available_seats:
            from django.core.exceptions import ValidationError
            raise ValidationError(
                f'Not enough seats available. '
                f'Requested: {self.seats_booked}, '
                f'Available: {self.flight.available_seats}'
            )
        
        self.flight.available_seats -= self.seats_booked
        self.flight.save()
    
    def _return_seats(self):
        """Internal method to return seats to flight availability."""
        self.flight.available_seats += self.seats_booked
        self.flight.save()
    
    def confirm(self):
        """
        Confirm a pending booking.
        
        Business Logic:
        - Deducts seats from flight availability
        - Updates booking status to CONFIRMED
        - Sets confirmation timestamp
        
        Returns:
            bool: True if successful, False if already confirmed
        """
        if self.status == self.Status.PENDING:
            self.status = self.Status.CONFIRMED
            self.confirmed_at = timezone.now()
            
            # Save will trigger seat deduction via _handle_status_transition
            self.save()
            return True
        return False
    
    def can_cancel(self):
        """
        Check if booking can be cancelled.
        
        Business Rules:
        1. Booking must be CONFIRMED (not PENDING or already CANCELLED)
        2. Flight must not have departed yet
        
        Returns:
            bool: True if cancellation is allowed
        """
        if self.status != self.Status.CONFIRMED:
            return False
        
        now = timezone.now()
        if self.flight.departure_time <= now:
            return False
        
        return True
    
    def cancel(self):
        """
        Cancel a confirmed booking (if allowed).
        
        Business Logic:
        - Returns seats to flight availability
        - Updates booking status to CANCELLED
        - Sets cancellation timestamp
        
        Returns:
            bool: True if successful, False if cancellation not allowed
        """
        if not self.can_cancel():
            return False
        
        self.status = self.Status.CANCELLED
        self.cancelled_at = timezone.now()
        
        # Save will trigger seat return via _handle_status_transition
        self.save()
        return True
    
    def is_active(self):
        """
        Check if booking is currently active.
        
        Active means:
        - Status is CONFIRMED
        - Flight has not departed yet
        
        Returns:
            bool: True if booking is active
        """
        now = timezone.now()
        return (
            self.status == self.Status.CONFIRMED and
            self.flight.departure_time > now
        )
    
    def get_booking_reference(self):
        """
        Generate a human-readable booking reference.
        
        Format: FLT{flight_number}-{booking_id}
        
        Returns:
            str: Booking reference for customer communication
        """
        return f"FLT{self.flight.flight_number}-{self.id:06d}"