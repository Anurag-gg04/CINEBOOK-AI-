package com.cinebook.payment;
import jakarta.persistence.*;import java.time.Instant;
@Entity @Table(name="payment_webhook_events",uniqueConstraints=@UniqueConstraint(name="uq_payment_webhook_event",columnNames="event_id"),indexes=@Index(name="idx_webhook_received",columnList="received_at"))
public class PaymentWebhookEvent {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="event_id",nullable=false,length=140) private String eventId;
 @Column(nullable=false,length=30) private String provider="RAZORPAY";
 @Column(nullable=false,length=100) private String eventType;
 @Column(nullable=false,length=30) private String status="RECEIVED";
 @Column(name="payload_hash",nullable=false,length=64) private String payloadHash;
 @Column(name="received_at",nullable=false) private Instant receivedAt=Instant.now();@Column(name="processed_at") private Instant processedAt;
 protected PaymentWebhookEvent(){}public PaymentWebhookEvent(String id,String type,String hash){eventId=id;eventType=type;payloadHash=hash;}
 public Long getId(){return id;}public String getEventId(){return eventId;}public String getProvider(){return provider;}public String getEventType(){return eventType;}public String getStatus(){return status;}public String getPayloadHash(){return payloadHash;}public Instant getReceivedAt(){return receivedAt;}public void processed(){status="PROCESSED";processedAt=Instant.now();}public void ignored(){status="IGNORED";processedAt=Instant.now();}public void failed(){status="FAILED";}
}
