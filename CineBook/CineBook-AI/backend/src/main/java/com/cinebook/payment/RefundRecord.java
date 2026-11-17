package com.cinebook.payment;
import jakarta.persistence.*;import java.math.BigDecimal;import java.time.Instant;
@Entity @Table(name="refund_records",indexes=@Index(name="idx_refund_status",columnList="status,created_at"))
public class RefundRecord {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="payment_id",nullable=false) private PaymentRecord payment;
 @Column(nullable=false,precision=10,scale=2) private BigDecimal amount;
 @Column(nullable=false,length=30) private String status;
 @Column(name="provider_reference",length=120) private String providerReference;
 @Column(length=500) private String reason;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();@Column(name="updated_at",nullable=false) private Instant updatedAt=Instant.now();
 protected RefundRecord(){}public RefundRecord(PaymentRecord p,BigDecimal amount,String status,String reason){payment=p;this.amount=amount;this.status=status;this.reason=reason;}
 public Long getId(){return id;}public PaymentRecord getPayment(){return payment;}public BigDecimal getAmount(){return amount;}public String getStatus(){return status;}public String getProviderReference(){return providerReference;}public String getReason(){return reason;}public Instant getCreatedAt(){return createdAt;}public void setStatus(String s){status=s;updatedAt=Instant.now();}public void setProviderReference(String r){providerReference=r;updatedAt=Instant.now();}
}
