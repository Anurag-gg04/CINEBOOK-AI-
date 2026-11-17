package com.cinebook.events;
import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="outbox_events",indexes=@Index(name="idx_outbox_state_created",columnList="state,created_at"))
public class OutboxEvent {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="event_type",nullable=false,length=100) private String eventType;
 @Column(name="aggregate_id",nullable=false,length=100) private String aggregateId;
 @Column(nullable=false,length=40) private String state="PENDING";
 @Column(nullable=false,columnDefinition="TEXT") private String payload;
 @Column(name="correlation_id",length=100) private String correlationId;
 @Column(nullable=false) private int attempts=0;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 @Column(name="published_at") private Instant publishedAt;
 protected OutboxEvent(){} public OutboxEvent(String type,String aggregateId,String payload,String correlationId){eventType=type;this.aggregateId=aggregateId;this.payload=payload;this.correlationId=correlationId;}
 public Long getId(){return id;}public String getEventType(){return eventType;}public String getAggregateId(){return aggregateId;}public String getState(){return state;}public String getPayload(){return payload;}public String getCorrelationId(){return correlationId;}public int getAttempts(){return attempts;}public Instant getCreatedAt(){return createdAt;}public void markPublished(){state="PUBLISHED";publishedAt=Instant.now();}public void failed(){attempts++;if(attempts>=10)state="DEAD";}
}
