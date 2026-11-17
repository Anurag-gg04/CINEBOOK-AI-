package com.cinebook.booking;

import com.cinebook.auth.UserAccount;
import com.cinebook.catalog.Showtime;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "seat_holds", uniqueConstraints = @UniqueConstraint(name = "uq_hold_user_idempotency", columnNames = {
        "user_id",
        "idempotency_key" }), indexes = @Index(name = "idx_holds_expiry_status", columnList = "status,expires_at"))
public class SeatHold {
    public enum State {
        ACTIVE, CHECKOUT, CONFIRMED, EXPIRED, CANCELLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 36)
    private String token;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "showtime_id", nullable = false)
    private Showtime showtime;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private State status = State.ACTIVE;
    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected SeatHold() {
    }

    public SeatHold(String token, UserAccount user, Showtime showtime, Instant expiresAt, String idempotencyKey) {
        this.token = token;
        this.user = user;
        this.showtime = showtime;
        this.expiresAt = expiresAt;
        this.idempotencyKey = idempotencyKey;
    }

    public Long getId() {
        return id;
    }

    public String getToken() {
        return token;
    }

    public UserAccount getUser() {
        return user;
    }

    public Showtime getShowtime() {
        return showtime;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public State getStatus() {
        return status;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setStatus(State s) {
        status = s;
    }

    public boolean isActiveNow() {
        return status == State.ACTIVE && expiresAt.isAfter(Instant.now());
    }
}
