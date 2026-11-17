package com.cinebook.payment;
import com.cinebook.booking.Booking; import com.cinebook.booking.SeatHold; import jakarta.persistence.*; import java.time.Instant; import java.math.BigDecimal;
@Entity @Table(name="payments",uniqueConstraints={@UniqueConstraint(name="uq_payment_provider_ref",columnNames={"provider_reference"}),@UniqueConstraint(name="uq_payment_idempotency",columnNames={"idempotency_key"})},indexes=@Index(name="idx_payment_state_created",columnList="status,created_at"))
public class PaymentRecord {
 public enum Status { PENDING, SUCCEEDED, FAILED, REFUND_PENDING, REFUNDED }
 public enum Provider { DEVELOPMENT_SIMULATOR, RAZORPAY }
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="hold_id",nullable=false) private SeatHold hold;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="booking_id") private Booking booking;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private Provider provider;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Status status=Status.PENDING;
 @Column(nullable=false,precision=10,scale=2) private BigDecimal amount;
 @Column(nullable=false,length=3) private String currency="INR";
 @Column(name="provider_reference",unique=true,length=120) private String providerReference;
 @Column(name="provider_payment_id",unique=true,length=120) private String providerPaymentId;
 @Column(name="coupon_code",length=40) private String couponCode;
 @Column(name="idempotency_key",nullable=false,unique=true,length=120) private String idempotencyKey;
 @Column(name="webhook_event_id",length=140) private String webhookEventId;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 @Column(name="updated_at",nullable=false) private Instant updatedAt=Instant.now();
 protected PaymentRecord(){} public PaymentRecord(SeatHold hold,Provider provider,BigDecimal amount,String key){this.hold=hold;this.provider=provider;this.amount=amount;idempotencyKey=key;}
 public Long getId(){return id;}public SeatHold getHold(){return hold;}public Booking getBooking(){return booking;}public Provider getProvider(){return provider;}public Status getStatus(){return status;}public BigDecimal getAmount(){return amount;}public String getCurrency(){return currency;}public String getProviderReference(){return providerReference;}public String getProviderPaymentId(){return providerPaymentId;}public void setProviderPaymentId(String v){providerPaymentId=v;updatedAt=Instant.now();}public String getCouponCode(){return couponCode;}public void setCouponCode(String v){couponCode=v;updatedAt=Instant.now();}public String getIdempotencyKey(){return idempotencyKey;}public String getWebhookEventId(){return webhookEventId;}public void setStatus(Status s){status=s;updatedAt=Instant.now();}public void setBooking(Booking b){booking=b;updatedAt=Instant.now();}public void setProviderReference(String v){providerReference=v;updatedAt=Instant.now();}public void setWebhookEventId(String v){webhookEventId=v;updatedAt=Instant.now();}
}
