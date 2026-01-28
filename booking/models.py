from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
import secrets


class Booking(models.Model):  
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
    
    # User relationship (optional for guest bookings)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bookings',
        null=True,
        blank=True,
        help_text="Registered user who made the booking (null for guests)"
    )
    
    # Core relationships
    flight = models.ForeignKey(
        'flights.Flight',
        on_delete=models.PROTECT,
        related_name='bookings',
        help_text="The flight being booked"
    )
    
    # Booking reference for guests and confirmations
    booking_reference = models.CharField(
        max_length=10,
        unique=True,
        editable=False,
        help_text="Unique booking reference code"
    )
    
    # Passenger information (required for all bookings)
    passenger_name = models.CharField(
        max_length=200,
        help_text="Full name of the passenger"
    )
    
    passenger_email = models.EmailField(
        help_text="Contact email for booking confirmation"
    )
    
    passenger_phone = models.CharField(
        max_length=20,
        blank=True,
        help_text="Contact phone number (optional)"
    )
    
    # Booking details
    seats_booked = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Number of seats reserved"
    )
    
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text="Total cost (calculated automatically)"
    )
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        help_text="Current booking status"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the booking was created"
    )
    
    confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the booking was confirmed"
    )
    
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the booking was cancelled"
    )
    
    # Additional information
    special_requests = models.TextField(
        blank=True,
        max_length=500,
        help_text="Special requirements or requests"
    )
    
    class Meta:
        ordering = ['-created_at']
        
        indexes = [
            models.Index(fields=['passenger_email']),
            models.Index(fields=['booking_reference']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['flight', 'status']),
            models.Index(fields=['user', 'status']),
        ]
        
        constraints = [
            models.CheckConstraint(
                name='positive_seats_booked',
                check=models.Q(seats_booked__gt=0)
            ),
            models.CheckConstraint(
                name='positive_total_price',
                check=models.Q(total_price__gte=0.01)
            ),
        ]
        
        verbose_name = "Booking"
        verbose_name_plural = "Bookings"
    
    def __str__(self):
        return f"{self.booking_reference} - {self.passenger_name} ({self.status})"
    
    def save(self, *args, **kwargs):
        """
        Override save to handle:
        1. Generate booking reference
        2. Calculate total price
        3. Manage seat allocation
        """
        from django.db import transaction
        
        # Generate booking reference for new bookings
        if not self.booking_reference:
            self.booking_reference = self._generate_booking_reference()
        
        # Calculate total price
        if not self.total_price or self.total_price == 0:
            self.total_price = self.seats_booked * self.flight.price
        
        # Determine if new booking
        is_new = self._state.adding
        
        # Use atomic transaction for seat management
        with transaction.atomic():
            if not is_new:
                original = Booking.objects.select_for_update().get(pk=self.pk)
            else:
                original = None
            
            # Handle status transitions
            self._handle_status_transition(original, is_new)
            
            # Validate before saving
            self.full_clean()
            
            # Save
            super().save(*args, **kwargs)
    
    def _generate_booking_reference(self):
        """Generate unique booking reference code."""
        while True:
            # Generate random 8-character code
            code = secrets.token_hex(4).upper()
            if not Booking.objects.filter(booking_reference=code).exists():
                return code
    
    def _handle_status_transition(self, original, is_new):
        """Handle status changes and seat adjustments."""
        if is_new:
            if self.status == self.Status.CONFIRMED:
                self._deduct_seats()
                self.confirmed_at = timezone.now()
        
        elif original and original.status != self.status:
            # PENDING → CONFIRMED
            if (original.status == self.Status.PENDING and 
                self.status == self.Status.CONFIRMED):
                self._deduct_seats()
                self.confirmed_at = timezone.now()
            
            # CONFIRMED → CANCELLED
            elif (original.status == self.Status.CONFIRMED and 
                  self.status == self.Status.CANCELLED):
                self._return_seats()
                self.cancelled_at = timezone.now()
            
            # CANCELLED → CONFIRMED
            elif (original.status == self.Status.CANCELLED and 
                  self.status == self.Status.CONFIRMED):
                self._deduct_seats()
                self.confirmed_at = timezone.now()
                self.cancelled_at = None
    
    def _deduct_seats(self):
        """Deduct seats from flight availability."""
        if self.seats_booked > self.flight.available_seats:
            raise ValidationError(
                f'Not enough seats. Requested: {self.seats_booked}, '
                f'Available: {self.flight.available_seats}'
            )
        
        self.flight.available_seats -= self.seats_booked
        self.flight.save()
    
    def _return_seats(self):
        """Return seats to flight availability."""
        self.flight.available_seats += self.seats_booked
        self.flight.save()
    
    def clean(self):
        """Model-level validation."""
        super().clean()
        
        # Validate seat availability
        if self.status in [self.Status.PENDING, self.Status.CONFIRMED]:
            if not self._state.adding:
                try:
                    original = Booking.objects.get(pk=self.pk)
                    if original.status == self.Status.CONFIRMED:
                        existing_seats = original.seats_booked
                    else:
                        existing_seats = 0
                except Booking.DoesNotExist:
                    existing_seats = 0
            else:
                existing_seats = 0
            
            net_new_seats = self.seats_booked - existing_seats
            if net_new_seats > 0 and net_new_seats > self.flight.available_seats:
                raise ValidationError({
                    'seats_booked': f'Only {self.flight.available_seats} seat(s) available'
                })
    
    def confirm(self):
        """Confirm a pending booking."""
        if self.status == self.Status.PENDING:
            self.status = self.Status.CONFIRMED
            self.save()
            return True
        return False
    
    def can_cancel(self):
        """Check if booking can be cancelled."""
        if self.status != self.Status.CONFIRMED:
            return False
        
        now = timezone.now()
        if self.flight.departure_time <= now:
            return False
        
        return True
    
    def cancel(self):
        """Cancel a confirmed booking."""
        if not self.can_cancel():
            return False
        
        self.status = self.Status.CANCELLED
        self.save()
        return True
    
    def is_active(self):
        """Check if booking is currently active."""
        now = timezone.now()
        return (
            self.status == self.Status.CONFIRMED and
            self.flight.departure_time > now
        )