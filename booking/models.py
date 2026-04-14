from django.conf import settings
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction
import secrets

class Booking(models.Model):  
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
    
    # --- RELATIONSHIPS ---
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings',
        null=True,
        blank=True,
        help_text="Registered user who made the booking"
    )
    
    flight = models.ForeignKey(
        'flights.Flight',
        on_delete=models.PROTECT,
        related_name='bookings',
        help_text="The outbound flight"
    )

    return_flight = models.ForeignKey(
        'flights.Flight',
        on_delete=models.PROTECT,
        related_name='return_bookings',
        null=True, 
        blank=True,
        help_text="The return flight for round-trip bookings"
    )
    
    # --- CORE FIELDS ---
    booking_reference = models.CharField(
        max_length=10,
        unique=True,
        editable=False,
        help_text="Unique booking reference code"
    )
    
    passenger_name = models.CharField(max_length=200)
    passenger_email = models.EmailField()
    passenger_phone = models.CharField(max_length=20, blank=True)
    
    seats_booked = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # --- TIMESTAMPS ---
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    special_requests = models.TextField(blank=True, max_length=500)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['passenger_email']),
            models.Index(fields=['booking_reference']),
            models.Index(fields=['status', 'created_at']),
        ]
        constraints = [
            models.CheckConstraint(
                name='positive_seats_booked',
                condition=models.Q(seats_booked__gt=0)
            ),
        ]

    def __str__(self):
        return f"{self.booking_reference} - {self.passenger_name} ({self.status})"

    # --- SAVE LOGIC ---
    def save(self, *args, **kwargs):
        # 1. Reference generation
        if not self.booking_reference:
            self.booking_reference = self._generate_booking_reference()
        
        # 2. Price calculation (Outbound + Return)
        if not self.total_price or self.total_price == 0:
            price_per_seat = self.flight.price
            if self.return_flight:
                price_per_seat += self.return_flight.price
            self.total_price = self.seats_booked * price_per_seat

        is_new = self._state.adding

        with transaction.atomic():
            if not is_new:
                # Lock the row for update to prevent race conditions
                original = Booking.objects.select_for_update().get(pk=self.pk)
            else:
                original = None
                     
            self.full_clean()
            
            # 3. Process seat inventory based on status change
            self._handle_status_transition(original, is_new)
            
            super().save(*args, **kwargs)

    # --- INTERNAL HELPER METHODS ---
    def _generate_booking_reference(self):
        while True:
            code = secrets.token_hex(4).upper()
            if not Booking.objects.filter(booking_reference=code).exists():
                return code

    def _handle_status_transition(self, original, is_new):
        """Determines if seats should be deducted or returned."""
        # Case A: New booking created as Confirmed
        if is_new and self.status == self.Status.CONFIRMED:
            self._deduct_seats()
            self.confirmed_at = timezone.now()
        
        # Case B: Status changed on an existing booking
        elif original and original.status != self.status:
            # If changing TO confirmed (from Pending or Cancelled)
            if self.status == self.Status.CONFIRMED:
                self._deduct_seats()
                self.confirmed_at = timezone.now()
                self.cancelled_at = None
            
            # If changing TO cancelled (from Confirmed)
            elif self.status == self.Status.CANCELLED and original.status == self.Status.CONFIRMED:
                self._return_seats()
                self.cancelled_at = timezone.now()

    def _deduct_seats(self):
        """Submits seat deduction for both flights."""
        # Outbound
        if self.seats_booked > self.flight.available_seats:
            raise ValidationError(f"Not enough seats on outbound flight {self.flight.flight_number}")
        self.flight.available_seats -= self.seats_booked
        self.flight.save()

        # Return
        if self.return_flight:
            if self.seats_booked > self.return_flight.available_seats:
                raise ValidationError(f"Not enough seats on return flight {self.return_flight.flight_number}")
            self.return_flight.available_seats -= self.seats_booked
            self.return_flight.save()

    def _return_seats(self):
        """Returns seats to availability if booking is cancelled."""
        self.flight.available_seats += self.seats_booked
        self.flight.save()
        
        if self.return_flight:
            self.return_flight.available_seats += self.seats_booked
            self.return_flight.save()

    # --- BUSINESS LOGIC METHODS ---
    def clean(self):
        super().clean()
        if self.return_flight and self.return_flight.departure_time <= self.flight.departure_time:
            raise ValidationError({'return_flight': "Return flight must depart after the outbound flight."})

    def confirm(self):
        if self.status == self.Status.PENDING:
            self.status = self.Status.CONFIRMED
            self.save()
            return True
        return False

    def can_cancel(self):
        if self.status != self.Status.CONFIRMED:
            return False
        return self.flight.departure_time > timezone.now()

    def cancel(self):
        if self.can_cancel():
            self.status = self.Status.CANCELLED
            self.save()
            return True
        return False

    
    def is_active(self):
        """Check if booking is currently active (Confirmed and not departed)."""
        return (
            self.status == self.Status.CONFIRMED and
            self.flight.departure_time > timezone.now()
        )
    is_active.boolean = True 


