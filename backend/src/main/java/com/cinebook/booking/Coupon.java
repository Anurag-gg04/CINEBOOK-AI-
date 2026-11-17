package com.cinebook.booking;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "coupons", indexes = @Index(name = "idx_coupon_active", columnList = "active,starts_at,ends_at"))
public class Coupon {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 40)
    private String code;
    @Column(nullable = false, length = 200)
    private String description;
    @Column(name = "discount_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercent;
    @Column(name = "max_discount", precision = 10, scale = 2)
    private BigDecimal maxDiscount;
    @Column(name = "min_subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal minSubtotal = BigDecimal.ZERO;
    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;
    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;
    @Column(name = "usage_limit")
    private Integer usageLimit;
    @Column(name = "used_count", nullable = false)
    private int usedCount = 0;
    @Column(nullable = false)
    private boolean active = true;
    @Version
    private long version;

    protected Coupon() {
    }

    public Coupon(String code, String description, BigDecimal discountPercent, BigDecimal maxDiscount,
            BigDecimal minSubtotal, Instant startsAt, Instant endsAt, Integer usageLimit) {
        this.code = code.toUpperCase(java.util.Locale.ROOT);
        this.description = description;
        this.discountPercent = discountPercent;
        this.maxDiscount = maxDiscount;
        this.minSubtotal = minSubtotal;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.usageLimit = usageLimit;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getDiscountPercent() {
        return discountPercent;
    }

    public BigDecimal getMaxDiscount() {
        return maxDiscount;
    }

    public BigDecimal getMinSubtotal() {
        return minSubtotal;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public Integer getUsageLimit() {
        return usageLimit;
    }

    public int getUsedCount() {
        return usedCount;
    }

    public boolean isActive() {
        return active;
    }

    public boolean validAt(Instant now) {
        return active && !now.isBefore(startsAt) && now.isBefore(endsAt)
                && (usageLimit == null || usedCount < usageLimit);
    }

    public void consume() {
        if (usageLimit != null && usedCount >= usageLimit)
            throw new IllegalStateException("Coupon usage limit reached");
        usedCount++;
    }
}
