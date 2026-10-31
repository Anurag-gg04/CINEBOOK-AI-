package com.cinebook.booking;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class BookingDtos {
    private BookingDtos() {
    }

    public record HoldRequest(@NotEmpty @Size(max = 8) List<@NotNull Long> seatIds) {
    }

    public record HeldSeat(Long id, String label, BigDecimal price) {
    }

    public record HoldView(String token, Long showtimeId, String movieTitle, String theatreName, List<HeldSeat> seats,
            BigDecimal subtotal, BigDecimal convenienceFee, BigDecimal total, Instant expiresAt, String status) {
    }

    public record SimulatorPaymentRequest(@NotBlank String holdToken, @NotBlank String decision, String couponCode) {
    }

    public record PaymentView(String paymentId, String provider, String status, BigDecimal amount, String currency,
            String message, BookingView booking) {
    }

    public record QuoteView(BigDecimal subtotal, BigDecimal convenienceFee, String couponCode, BigDecimal discount,
            BigDecimal total, String currency, String message) {
    }

    public record BookingView(Long id, String bookingCode, String status, String movieTitle, String posterUrl,
            String theatreName, String city, String screenName, Instant startsAt, Instant endsAt, List<String> seats,
            BigDecimal totalAmount, String paymentProvider, String paymentStatus, Instant createdAt,
            String ticketNote) {
    }

    public record CancelView(String bookingCode, String bookingStatus, String refundStatus, String message) {
    }

    public record RecommendationRequest(@Min(1) @Max(8) Integer seatCount, BigDecimal maxBudget, String rowPreference,
            Boolean adjacent, Boolean aisle, Boolean accessibleOnly, String naturalLanguage) {
    }

    public record Recommendation(Long showtimeId, List<String> seats, BigDecimal total, BigDecimal budget,
            boolean withinBudget, int score, List<String> reasons, boolean exactMatch) {
    }

    public record RecommendationsView(List<Recommendation> recommendations, String interpretation, String message) {
    }
}
