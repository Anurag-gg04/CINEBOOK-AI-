package com.cinebook.booking;

import com.cinebook.auth.*;
import com.cinebook.catalog.*;
import com.cinebook.common.ApiException;
import com.cinebook.events.OutboxService;
import com.cinebook.payment.*;
import jakarta.transaction.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class BookingService {
    @PersistenceContext
    private EntityManager entityManager;
    private final UserRepository users;
    private final ShowtimeRepository shows;
    private final ShowSeatRepository inventory;
    private final SeatHoldRepository holds;
    private final BookingRepository bookings;
    private final PaymentRepository payments;
    private final OutboxService outbox;
    private final CouponService couponService;
    private final RefundRepository refunds;
    private final NotificationRepository notifications;
    private final long holdMinutes;
    private final boolean razorpayConfigured;

    public BookingService(UserRepository u, ShowtimeRepository s, ShowSeatRepository i, SeatHoldRepository h,
            BookingRepository b, PaymentRepository p, OutboxService o, CouponService couponService,
            RefundRepository refunds, NotificationRepository notifications,
            @Value("${app.booking.hold-minutes:5}") long hm,
            @Value("${app.payments.mode:SIMULATOR}") String paymentMode,
            @Value("${app.payments.razorpay-key-id:}") String razorpayKeyId,
            @Value("${app.payments.razorpay-key-secret:}") String razorpayKeySecret) {
        users = u;
        shows = s;
        inventory = i;
        holds = h;
        bookings = b;
        payments = p;
        outbox = o;
        this.couponService = couponService;
        this.refunds = refunds;
        this.notifications = notifications;
        holdMinutes = hm;
        razorpayConfigured = "RAZORPAY".equalsIgnoreCase(paymentMode) && razorpayKeyId != null
                && !razorpayKeyId.isBlank() && razorpayKeySecret != null && !razorpayKeySecret.isBlank();
    }

    @Transactional
    public BookingDtos.HoldView createHold(String email, Long showId, BookingDtos.HoldRequest req,
            String idempotencyKey, String correlationId) {
        UserAccount user = users.findByEmailIgnoreCaseForUpdate(email)
                .orElseThrow(() -> new ApiException(404, "USER_NOT_FOUND", "User was not found"));
        if (idempotencyKey == null || idempotencyKey.isBlank())
            throw new ApiException(400, "IDEMPOTENCY_KEY_REQUIRED",
                    "Idempotency-Key is required to create a seat hold");
        if (idempotencyKey.length() > 100)
            throw new ApiException(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be at most 100 characters");
        List<Long> ids = req.seatIds().stream().distinct().sorted().toList();
        if (ids.size() != req.seatIds().size())
            throw new ApiException(400, "DUPLICATE_SEATS", "Select each seat only once");
        Optional<SeatHold> prior = holds.findByUserIdAndIdempotencyKey(user.getId(), idempotencyKey);
        if (prior.isPresent()) {
            SeatHold old = prior.get();
            if (!old.isActiveNow())
                throw new ApiException(409, "IDEMPOTENCY_REPLAY_EXPIRED",
                        "This idempotency key has already been used; start a new checkout");
            List<Long> oldIds = inventory.findAllByHoldId(old.getId()).stream().map(s -> s.getSeat().getId()).sorted()
                    .toList();
            if (!old.getShowtime().getId().equals(showId) || !oldIds.equals(ids))
                throw new ApiException(409, "IDEMPOTENCY_KEY_REUSED",
                        "This hold idempotency key was already used with a different show or seat selection");
            return holdView(old);
        }
        Showtime show = shows.getFull(showId)
                .orElseThrow(() -> new ApiException(404, "SHOW_NOT_FOUND", "Showtime was not found"));
        if (!show.getStartsAt().isAfter(Instant.now()))
            throw new ApiException(409, "SHOW_ALREADY_STARTED", "This show has already started");
        List<ShowSeat> rows = inventory.lockSelected(showId, ids);
        if (rows.size() != ids.size())
            throw new ApiException(400, "INVALID_SEATS", "One or more seats do not belong to this show");
        Instant now = Instant.now();
        for (ShowSeat row : rows) {
            if (row.getStatus() == InventoryStatus.HELD && row.getHoldExpiresAt() != null
                    && !row.getHoldExpiresAt().isAfter(now))
                row.release();
            if (row.getStatus() != InventoryStatus.AVAILABLE)
                throw new ApiException(409, "SEAT_UNAVAILABLE", "At least one selected seat is no longer available");
        }
        Instant expires = now.plusSeconds(holdMinutes * 60);
        SeatHold hold = holds.save(new SeatHold(UUID.randomUUID().toString(), user, show, expires, idempotencyKey));
        for (ShowSeat row : rows)
            row.hold(hold, expires);
        outbox.record("SEAT_HOLD_CREATED", hold.getToken(),
                Map.of("holdToken", hold.getToken(), "showtimeId", showId, "seatIds", ids, "expiresAt", expires),
                correlationId);
        return holdView(hold);
    }

    @Transactional
    public BookingDtos.HoldView getHold(String email, String token) {
        UserAccount u = user(email);
        SeatHold h = holds.findByToken(token)
                .orElseThrow(() -> new ApiException(404, "HOLD_NOT_FOUND", "Seat hold was not found"));
        if (!h.getUser().getId().equals(u.getId()))
            throw new ApiException(403, "HOLD_NOT_OWNED", "This hold belongs to another account");
        return holdView(h);
    }

    @Transactional
    public BookingDtos.QuoteView quote(String email, String token, String couponCode) {
        UserAccount u = user(email);
        SeatHold h = holds.findByToken(token)
                .orElseThrow(() -> new ApiException(404, "HOLD_NOT_FOUND", "Seat hold was not found"));
        if (!h.getUser().getId().equals(u.getId()))
            throw new ApiException(403, "HOLD_NOT_OWNED", "This hold belongs to another account");
        if (!h.isActiveNow())
            throw new ApiException(409, "HOLD_EXPIRED", "Your seat hold has expired. Please select seats again");
        List<ShowSeat> ss = inventory.findAllByHoldId(h.getId());
        if (ss.isEmpty() || ss.stream().anyMatch(s -> s.getStatus() != InventoryStatus.HELD || s.getHold() == null
                || !s.getHold().getId().equals(h.getId())))
            throw new ApiException(409, "HOLD_EXPIRED", "Seat hold is no longer valid");
        BigDecimal subtotal = ss.stream().map(ShowSeat::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        CouponService.PriceQuote q = couponService.calculate(subtotal, couponCode);
        return new BookingDtos.QuoteView(q.subtotal(), q.convenienceFee(), q.couponCode(), q.discount(), q.total(),
                q.currency(), q.message());
    }

    @Transactional
    public BookingDtos.PaymentView simulatePayment(String email, BookingDtos.SimulatorPaymentRequest req, String key,
            String correlationId) {
        if (razorpayConfigured)
            throw new ApiException(409, "SIMULATOR_DISABLED",
                    "The payment simulator is disabled while Razorpay test mode is active.");
        UserAccount user = users.findByEmailIgnoreCaseForUpdate(email)
                .orElseThrow(() -> new ApiException(404, "USER_NOT_FOUND", "User was not found"));
        SeatHold hold = holds.findByToken(req.holdToken())
                .orElseThrow(() -> new ApiException(404, "HOLD_NOT_FOUND", "Seat hold was not found"));
        if (!hold.getUser().getId().equals(user.getId()))
            throw new ApiException(403, "HOLD_NOT_OWNED", "This hold belongs to another account");
        String decision = req.decision().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("APPROVE", "DECLINE").contains(decision))
            throw new ApiException(400, "INVALID_SIMULATOR_DECISION", "Decision must be APPROVE or DECLINE");
        if (key == null || key.isBlank())
            key = "sim-" + hold.getToken();
        if (key.length() > 120)
            throw new ApiException(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be at most 120 characters");
        Optional<PaymentRecord> existing = payments.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            PaymentRecord p = existing.get();
            if (!p.getHold().getId().equals(hold.getId()))
                throw new ApiException(409, "IDEMPOTENCY_KEY_REUSED", "This payment key belongs to another checkout");
            return paymentView(p);
        }
        Optional<PaymentRecord> priorForHold = payments.findByHoldIdAndProvider(hold.getId(),
                PaymentRecord.Provider.DEVELOPMENT_SIMULATOR);
        if (priorForHold.isPresent())
            return paymentView(priorForHold.get());
        if (payments.existsByHoldIdAndStatus(hold.getId(), PaymentRecord.Status.PENDING))
            throw new ApiException(409, "PAYMENT_IN_PROGRESS",
                    "A payment attempt for this hold is still pending. Do not start another payment.");
        if (!hold.isActiveNow())
            throw new ApiException(409, "HOLD_EXPIRED", "Your seat hold has expired. Please select seats again");
        List<ShowSeat> held = inventory.findAllByHoldId(hold.getId());
        if (held.isEmpty())
            throw new ApiException(409, "EMPTY_HOLD", "No seats are attached to this hold");
        List<Long> ids = held.stream().map(s -> s.getSeat().getId()).sorted().toList();
        List<ShowSeat> locked = inventory.lockSelected(hold.getShowtime().getId(), ids);
        Instant now = Instant.now();
        if (locked.size() != ids.size() || locked.stream()
                .anyMatch(s -> s.getStatus() != InventoryStatus.HELD || s.getHold() == null
                        || !s.getHold().getId().equals(hold.getId()) || s.getHoldExpiresAt() == null
                        || !s.getHoldExpiresAt().isAfter(now)))
            throw new ApiException(409, "HOLD_EXPIRED", "Your seat hold has expired. Please select seats again");
        BigDecimal subtotal = locked.stream().map(ShowSeat::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        CouponService.PriceQuote quote = couponService.calculate(subtotal, req.couponCode());
        BigDecimal total = quote.total();
        PaymentRecord payment = payments
                .save(new PaymentRecord(hold, PaymentRecord.Provider.DEVELOPMENT_SIMULATOR, total, key));
        payment.setCouponCode(quote.couponCode());
        if (decision.equals("DECLINE")) {
            payment.setStatus(PaymentRecord.Status.FAILED);
            hold.setStatus(SeatHold.State.CANCELLED);
            locked.forEach(ShowSeat::release);
            outbox.record("PAYMENT_FAILED", hold.getToken(),
                    Map.of("paymentId", payment.getId(), "holdToken", hold.getToken()), correlationId);
            return paymentView(payment);
        }
        couponService.consume(quote.couponCode());
        String code = "CB-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
        Booking booking = bookings.save(new Booking(code, user, hold.getShowtime(), hold, total));
        for (ShowSeat s : locked)
            s.book(booking);
        hold.setStatus(SeatHold.State.CONFIRMED);
        payment.setStatus(PaymentRecord.Status.SUCCEEDED);
        payment.setBooking(booking);
        notifications.save(new Notification(user, "BOOKING_CONFIRMED", "Your movie night is booked", "Booking "
                + booking.getBookingCode() + " for " + hold.getShowtime().getMovie().getTitle() + " is confirmed."));
        outbox.record("PAYMENT_COMPLETED", booking.getBookingCode(), Map.of("bookingCode", code, "paymentId",
                payment.getId(), "amount", total, "provider", "DEVELOPMENT_SIMULATOR"), correlationId);
        outbox.record("BOOKING_CONFIRMED", booking.getBookingCode(),
                Map.of("bookingCode", code, "userId", user.getId(), "showtimeId", hold.getShowtime().getId()),
                correlationId);
        return paymentView(payment);
    }

    @Transactional
    public BookingDtos.PaymentView confirmGatewayPayment(Long paymentId, String providerPaymentId,
            String correlationId) {
        PaymentRecord payment = payments.findById(paymentId)
                .orElseThrow(() -> new ApiException(404, "PAYMENT_NOT_FOUND", "Payment record was not found"));
        entityManager.refresh(payment, LockModeType.PESSIMISTIC_WRITE);
        if (payment.getProvider() != PaymentRecord.Provider.RAZORPAY)
            throw new ApiException(409, "PAYMENT_PROVIDER_MISMATCH", "This is not a Razorpay payment");
        if (payment.getStatus() == PaymentRecord.Status.SUCCEEDED)
            return paymentView(payment);
        if (payment.getStatus() != PaymentRecord.Status.PENDING)
            throw new ApiException(409, "INVALID_PAYMENT_TRANSITION", "This payment is not awaiting verification");
        SeatHold hold = payment.getHold();
        payment.setProviderPaymentId(providerPaymentId);
        if (!hold.isActiveNow()) {
            payment.setStatus(PaymentRecord.Status.REFUND_PENDING);
            refunds.save(new RefundRecord(payment, payment.getAmount(), "GATEWAY_REFUND_REQUIRED",
                    "Payment was captured after the seat hold expired"));
            outbox.record("PAYMENT_REQUIRES_REFUND", payment.getProviderReference(), Map.of("paymentId",
                    payment.getId(), "providerPaymentId", providerPaymentId, "reason", "HOLD_EXPIRED"), correlationId);
            return paymentView(payment);
        }
        List<ShowSeat> held = inventory.findAllByHoldId(hold.getId());
        List<Long> ids = held.stream().map(x -> x.getSeat().getId()).sorted().toList();
        List<ShowSeat> locked = ids.isEmpty() ? List.of() : inventory.lockSelected(hold.getShowtime().getId(), ids);
        Instant now = Instant.now();
        if (locked.size() != ids.size() || locked.stream()
                .anyMatch(x -> x.getStatus() != InventoryStatus.HELD || x.getHold() == null
                        || !x.getHold().getId().equals(hold.getId()) || x.getHoldExpiresAt() == null
                        || !x.getHoldExpiresAt().isAfter(now))) {
            payment.setStatus(PaymentRecord.Status.REFUND_PENDING);
            refunds.save(new RefundRecord(payment, payment.getAmount(), "GATEWAY_REFUND_REQUIRED",
                    "Inventory changed before payment verification completed"));
            outbox.record("PAYMENT_REQUIRES_REFUND", payment.getProviderReference(), Map.of("paymentId",
                    payment.getId(), "providerPaymentId", providerPaymentId, "reason", "INVENTORY_CHANGED"),
                    correlationId);
            return paymentView(payment);
        }
        try {
            couponService.consume(payment.getCouponCode());
        } catch (ApiException ex) {
            payment.setStatus(PaymentRecord.Status.REFUND_PENDING);
            refunds.save(new RefundRecord(payment, payment.getAmount(), "GATEWAY_REFUND_REQUIRED",
                    "Coupon became unavailable after external payment captured"));
            outbox.record("PAYMENT_REQUIRES_REFUND", payment.getProviderReference(), Map.of("paymentId",
                    payment.getId(), "providerPaymentId", providerPaymentId, "reason", "COUPON_UNAVAILABLE"),
                    correlationId);
            return paymentView(payment);
        }
        String code = "CB-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
        Booking booking = bookings
                .save(new Booking(code, hold.getUser(), hold.getShowtime(), hold, payment.getAmount()));
        locked.forEach(x -> x.book(booking));
        hold.setStatus(SeatHold.State.CONFIRMED);
        payment.setStatus(PaymentRecord.Status.SUCCEEDED);
        payment.setBooking(booking);
        notifications.save(new Notification(hold.getUser(), "BOOKING_CONFIRMED", "Your movie night is booked",
                "Booking " + booking.getBookingCode() + " for " + hold.getShowtime().getMovie().getTitle()
                        + " is confirmed."));
        outbox.record("PAYMENT_COMPLETED", booking.getBookingCode(), Map.of("bookingCode", code, "paymentId",
                payment.getId(), "amount", payment.getAmount(), "provider", "RAZORPAY"), correlationId);
        outbox.record("BOOKING_CONFIRMED", booking.getBookingCode(),
                Map.of("bookingCode", code, "userId", hold.getUser().getId(), "showtimeId", hold.getShowtime().getId()),
                correlationId);
        return paymentView(payment);
    }

    @Transactional
    public void markGatewayPaymentFailed(Long paymentId, String eventId) {
        PaymentRecord p = payments.findById(paymentId)
                .orElseThrow(() -> new ApiException(404, "PAYMENT_NOT_FOUND", "Payment record was not found"));
        if (p.getStatus() == PaymentRecord.Status.PENDING) {
            p.setStatus(PaymentRecord.Status.FAILED);
            p.setWebhookEventId(eventId);
        }
    }

    @Transactional
    public void finalizeGatewayRefund(Long refundId) {
        RefundRecord r = refunds.findById(refundId)
                .orElseThrow(() -> new ApiException(404, "REFUND_NOT_FOUND", "Refund record was not found"));
        PaymentRecord p = r.getPayment();
        if ("PROCESSED".equalsIgnoreCase(r.getStatus()) && p.getStatus() == PaymentRecord.Status.REFUNDED)
            return;
        r.setStatus("PROCESSED");
        p.setStatus(PaymentRecord.Status.REFUNDED);
        if (p.getBooking() != null) {
            Booking b = p.getBooking();
            if (b.getStatus() == Booking.State.CONFIRMED || b.getStatus() == Booking.State.REFUND_PENDING)
                b.setStatus(Booking.State.REFUNDED);
            inventory.findAllByBookingId(b.getId()).forEach(ShowSeat::release);
        }
        outbox.record("REFUND_COMPLETED",
                p.getProviderReference() == null ? String.valueOf(p.getId()) : p.getProviderReference(),
                Map.of("paymentId", p.getId(), "refundId", r.getId(), "amount", r.getAmount()), null);
    }

    @Transactional
    public PaymentRecord.Provider providerForBooking(String email, Long bookingId) {
        UserAccount u = user(email);
        Booking b = bookings.findByIdAndUserId(bookingId, u.getId())
                .orElseThrow(() -> new ApiException(404, "BOOKING_NOT_FOUND", "Booking was not found"));
        return payments.findByBookingId(b.getId()).map(PaymentRecord::getProvider)
                .orElse(PaymentRecord.Provider.DEVELOPMENT_SIMULATOR);
    }

    @Transactional
    public List<BookingDtos.BookingView> history(String email) {
        UserAccount u = user(email);
        return bookings.findAllByUserIdOrderByCreatedAtDesc(u.getId()).stream().map(this::bookingView).toList();
    }

    @Transactional
    public BookingDtos.BookingView ticket(String email, Long id) {
        UserAccount u = user(email);
        Booking b = bookings.findByIdAndUserId(id, u.getId())
                .orElseThrow(() -> new ApiException(404, "BOOKING_NOT_FOUND", "Booking was not found"));
        return bookingView(b);
    }

    @Transactional
    public BookingDtos.CancelView cancel(String email, Long id, String correlationId) {
        UserAccount u = user(email);
        Booking b = bookings.findByIdAndUserId(id, u.getId())
                .orElseThrow(() -> new ApiException(404, "BOOKING_NOT_FOUND", "Booking was not found"));
        if (b.getStatus() != Booking.State.CONFIRMED)
            throw new ApiException(409, "INVALID_BOOKING_TRANSITION", "Only confirmed bookings can be cancelled");
        if (!b.getShowtime().getStartsAt().isAfter(Instant.now()))
            throw new ApiException(409, "CANCELLATION_CLOSED", "This booking can no longer be cancelled");
        PaymentRecord p = payments
                .findByHoldIdAndProvider(b.getHold().getId(), PaymentRecord.Provider.DEVELOPMENT_SIMULATOR)
                .orElse(null);
        if (p != null) {
            p.setStatus(PaymentRecord.Status.REFUNDED);
            refunds.save(new RefundRecord(p, b.getTotalAmount(), "SIMULATED_REFUNDED",
                    "Development simulator refund — no funds movement"));
        }
        b.setStatus(Booking.State.REFUNDED);
        inventory.findAllByBookingId(b.getId()).forEach(ShowSeat::release);
        notifications.save(new Notification(u, "BOOKING_CANCELLED", "Booking cancelled",
                "Booking " + b.getBookingCode() + " was cancelled. Any refund in development mode is simulated."));
        outbox.record("BOOKING_CANCELLED", b.getBookingCode(), Map.of("bookingCode", b.getBookingCode(), "refundStatus",
                p == null ? "NOT_APPLICABLE" : "REFUNDED_SIMULATED"), correlationId);
        return new BookingDtos.CancelView(b.getBookingCode(), b.getStatus().name(),
                p == null ? "NOT_APPLICABLE" : "REFUNDED_SIMULATED",
                "Development booking cancelled; any refund shown here is simulated, not a bank refund.");
    }

    @Scheduled(fixedDelayString = "${HOLD_CLEANUP_DELAY_MS:15000}")
    @Transactional
    public void expireHolds() {
        Instant now = Instant.now();
        for (SeatHold h : holds.findAllByStatusAndExpiresAtBefore(SeatHold.State.ACTIVE, now)) {
            h.setStatus(SeatHold.State.EXPIRED);
            for (ShowSeat row : inventory.findAllByHoldId(h.getId()))
                if (row.getStatus() == InventoryStatus.HELD && row.getHold() != null
                        && row.getHold().getId().equals(h.getId()))
                    row.release();
        }
    }

    private BookingDtos.HoldView holdView(SeatHold h) {
        List<ShowSeat> ss = inventory.findAllByHoldId(h.getId());
        if (ss.isEmpty())
            ss = inventory.mapForShow(h.getShowtime().getId()).stream()
                    .filter(x -> x.getHold() != null && x.getHold().getId().equals(h.getId())).toList();
        BigDecimal subtotal = ss.stream().map(ShowSeat::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new BookingDtos.HoldView(h.getToken(), h.getShowtime().getId(), h.getShowtime().getMovie().getTitle(),
                h.getShowtime().getScreen().getTheatre().getName(),
                ss.stream()
                        .map(x -> new BookingDtos.HeldSeat(x.getSeat().getId(), x.getSeat().getLabel(), x.getPrice()))
                        .toList(),
                subtotal, convenienceFee(subtotal), subtotal.add(convenienceFee(subtotal)), h.getExpiresAt(),
                h.getStatus().name());
    }

    private BookingDtos.PaymentView paymentView(PaymentRecord p) {
        BookingDtos.BookingView b = p.getBooking() == null ? null : bookingView(p.getBooking());
        return new BookingDtos.PaymentView(p.getId().toString(), p.getProvider().name(), p.getStatus().name(),
                p.getAmount(), p.getCurrency(),
                p.getProvider() == PaymentRecord.Provider.DEVELOPMENT_SIMULATOR
                        ? "DEVELOPMENT SIMULATOR — no real money was charged"
                        : "Razorpay payment status; verify against the gateway dashboard",
                b);
    }

    private BookingDtos.BookingView bookingView(Booking b) {
        List<ShowSeat> ss = inventory.findAllByBookingId(b.getId());
        PaymentRecord p = payments
                .findByHoldIdAndProvider(b.getHold().getId(), PaymentRecord.Provider.DEVELOPMENT_SIMULATOR)
                .orElseGet(() -> payments.findByHoldIdAndProvider(b.getHold().getId(), PaymentRecord.Provider.RAZORPAY)
                        .orElse(null));
        Showtime s = b.getShowtime();
        return new BookingDtos.BookingView(b.getId(), b.getBookingCode(), b.getStatus().name(), s.getMovie().getTitle(),
                s.getMovie().getPosterUrl(), s.getScreen().getTheatre().getName(), s.getScreen().getTheatre().getCity(),
                s.getScreen().getName(), s.getStartsAt(), s.getEndsAt(),
                ss.stream().map(x -> x.getSeat().getLabel()).sorted().toList(), b.getTotalAmount(),
                p == null ? null : p.getProvider().name(), p == null ? null : p.getStatus().name(), b.getCreatedAt(),
                "Present this ticket at the theatre. A booking is valid only while status is CONFIRMED.");
    }

    private UserAccount user(String email) {
        return users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(404, "USER_NOT_FOUND", "User was not found"));
    }

    public static BigDecimal convenienceFee(BigDecimal subtotal) {
        return subtotal.multiply(new BigDecimal("0.05")).setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
