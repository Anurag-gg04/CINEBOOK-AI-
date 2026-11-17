package com.cinebook.booking;

import com.cinebook.auth.UserAccount;
import com.cinebook.catalog.Showtime;
import jakarta.persistence.*;
import java.time.Instant;
import java.math.BigDecimal;

@Entity
@Table(name = "bookings", uniqueConstraints = {
        @UniqueConstraint(name = "uq_booking_code", columnNames = "booking_code"),
        @UniqueConstraint(name = "uq_booking_hold", columnNames = "hold_id") }, indexes = {
                @Index(name = "idx_booking_user_created", columnList = "user_id,created_at"),
                @Index(name = "idx_booking_state", columnList = "status") })
public class Booking {
    public enum State {
        CONFIRMED, CANCELLED, REFUND_PENDING, REFUNDED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "booking_code", nullable = false, length = 24)
    private String bookingCode;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "showtime_id", nullable = false)
    private Showtime showtime;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hold_id", nullable = false)
    private SeatHold hold;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private State status = State.CONFIRMED;
    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    protected Booking() {
    }

    public Booking(String code, UserAccount user, Showtime showtime, SeatHold hold, BigDecimal total) {
        bookingCode = code;
        this.user = user;
        this.showtime = showtime;
        this.hold = hold;
        totalAmount = total;
    }

    public Long getId() {
        return id;
    }

    public String getBookingCode() {
        return bookingCode;
    }

    public UserAccount getUser() {
        return user;
    }

    public Showtime getShowtime() {
        return showtime;
    }

    public SeatHold getHold() {
        return hold;
    }

    public State getStatus() {
        return status;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }

    public void setStatus(State s) {
        status = s;
        if (s == State.CANCELLED || s == State.REFUND_PENDING || s == State.REFUNDED)
            cancelledAt = Instant.now();
    }
}
