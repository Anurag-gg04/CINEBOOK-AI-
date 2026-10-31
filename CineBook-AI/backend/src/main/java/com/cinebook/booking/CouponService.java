package com.cinebook.booking;

import com.cinebook.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

@Service
public class CouponService {
    private final CouponRepository coupons;

    public CouponService(CouponRepository c) {
        coupons = c;
    }

    public record PriceQuote(BigDecimal subtotal, BigDecimal convenienceFee, String couponCode, BigDecimal discount,
            BigDecimal total, String currency, String message) {
    }

    @Transactional
    public PriceQuote calculate(BigDecimal subtotal, String code) {
        BigDecimal fee = BookingService.convenienceFee(subtotal), discount = BigDecimal.ZERO;
        String accepted = null, message = null;
        if (code != null && !code.isBlank()) {
            Coupon c = coupons.lockByCode(code.trim())
                    .orElseThrow(() -> new ApiException(400, "COUPON_INVALID", "This coupon code is not valid"));
            Instant now = Instant.now();
            if (!c.validAt(now))
                throw new ApiException(400, "COUPON_UNAVAILABLE",
                        "This coupon is expired, inactive, or has reached its usage limit");
            if (subtotal.compareTo(c.getMinSubtotal()) < 0)
                throw new ApiException(400, "COUPON_MINIMUM_NOT_MET",
                        "This coupon requires a ticket subtotal of at least ₹" + c.getMinSubtotal().toPlainString());
            discount = subtotal.multiply(c.getDiscountPercent()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            if (c.getMaxDiscount() != null)
                discount = discount.min(c.getMaxDiscount());
            discount = discount.min(subtotal);
            accepted = c.getCode();
            message = c.getDescription();
        }
        BigDecimal total = subtotal.add(fee).subtract(discount).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        return new PriceQuote(subtotal.setScale(2, RoundingMode.HALF_UP), fee, accepted, discount, total, "INR",
                message);
    }

    @Transactional
    public void consume(String code) {
        if (code == null || code.isBlank())
            return;
        Coupon c = coupons.lockByCode(code.trim())
                .orElseThrow(() -> new ApiException(400, "COUPON_INVALID", "This coupon code is not valid"));
        if (!c.validAt(Instant.now()))
            throw new ApiException(409, "COUPON_UNAVAILABLE", "This coupon is no longer available");
        c.consume();
    }
}
