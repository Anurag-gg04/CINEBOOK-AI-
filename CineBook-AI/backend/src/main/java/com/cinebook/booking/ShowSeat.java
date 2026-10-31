package com.cinebook.booking;

import com.cinebook.catalog.Seat;
import com.cinebook.catalog.Showtime;
import jakarta.persistence.*;
import java.time.Instant;
import java.math.BigDecimal;

@Entity
@Table(name = "show_seats", uniqueConstraints = @UniqueConstraint(name = "uq_show_seat", columnNames = { "showtime_id",
        "seat_id" }), indexes = { @Index(name = "idx_show_seats_status", columnList = "showtime_id,status"),
                @Index(name = "idx_show_seats_hold_expiry", columnList = "status,hold_expires_at") })
public class ShowSeat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "showtime_id", nullable = false)
    private Showtime showtime;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InventoryStatus status = InventoryStatus.AVAILABLE;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hold_id")
    private SeatHold hold;
    @Column(name = "hold_expires_at")
    private Instant holdExpiresAt;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;
    @Version
    private long version;

    protected ShowSeat() {
    }

    public ShowSeat(Showtime showtime, Seat seat, BigDecimal price) {
        this.showtime = showtime;
        this.seat = seat;
        this.price = price;
    }

    public Long getId() {
        return id;
    }

    public Showtime getShowtime() {
        return showtime;
    }

    public Seat getSeat() {
        return seat;
    }

    public InventoryStatus getStatus() {
        return status;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public SeatHold getHold() {
        return hold;
    }

    public Instant getHoldExpiresAt() {
        return holdExpiresAt;
    }

    public Booking getBooking() {
        return booking;
    }

    public void hold(SeatHold h, Instant expires) {
        status = InventoryStatus.HELD;
        hold = h;
        holdExpiresAt = expires;
        booking = null;
    }

    public void release() {
        status = InventoryStatus.AVAILABLE;
        hold = null;
        holdExpiresAt = null;
        booking = null;
    }

    public void book(Booking b) {
        status = InventoryStatus.BOOKED;
        booking = b;
        hold = null;
        holdExpiresAt = null;
    }

    public boolean isEffectivelyAvailable(Instant now) {
        return status == InventoryStatus.AVAILABLE
                || (status == InventoryStatus.HELD && holdExpiresAt != null && !holdExpiresAt.isAfter(now));
    }
}
