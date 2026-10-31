package com.cinebook.booking;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;
import com.cinebook.payment.PaymentRecord;
import com.cinebook.payment.RazorpayPaymentService;

@RestController
@RequestMapping("/api")
public class BookingController {
    private final BookingService service;
    private final RazorpayPaymentService razorpay;

    public BookingController(BookingService service, RazorpayPaymentService razorpay) {
        this.service = service;
        this.razorpay = razorpay;
    }

    @PostMapping("/shows/{showId}/holds")
    public BookingDtos.HoldView hold(Principal p, @PathVariable Long showId,
            @Valid @RequestBody BookingDtos.HoldRequest r,
            @RequestHeader(value = "Idempotency-Key", required = true) String key,
            @RequestHeader(value = "X-Correlation-ID", required = false) String cid) {
        return service.createHold(p.getName(), showId, r, key, cid);
    }

    @GetMapping("/holds/{token}")
    public BookingDtos.HoldView holdStatus(Principal p, @PathVariable String token) {
        return service.getHold(p.getName(), token);
    }

    @GetMapping("/holds/{token}/quote")
    public BookingDtos.QuoteView quote(Principal p, @PathVariable String token,
            @RequestParam(required = false) String couponCode) {
        return service.quote(p.getName(), token, couponCode);
    }

    @PostMapping("/payments/simulator")
    public BookingDtos.PaymentView simulate(Principal p, @Valid @RequestBody BookingDtos.SimulatorPaymentRequest r,
            @RequestHeader(value = "Idempotency-Key", required = false) String key,
            @RequestHeader(value = "X-Correlation-ID", required = false) String cid) {
        return service.simulatePayment(p.getName(), r, key, cid);
    }

    @GetMapping("/bookings")
    public List<BookingDtos.BookingView> history(Principal p) {
        return service.history(p.getName());
    }

    @GetMapping("/bookings/{id}")
    public BookingDtos.BookingView ticket(Principal p, @PathVariable Long id) {
        return service.ticket(p.getName(), id);
    }

    @PostMapping("/bookings/{id}/cancel")
    public BookingDtos.CancelView cancel(Principal p, @PathVariable Long id,
            @RequestHeader(value = "X-Correlation-ID", required = false) String cid) {
        return service.providerForBooking(p.getName(), id) == PaymentRecord.Provider.RAZORPAY
                ? razorpay.cancelBooking(p.getName(), id, cid)
                : service.cancel(p.getName(), id, cid);
    }
}
