package com.cinebook.common;
import com.cinebook.auth.UserAccount; import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="audit_events",indexes={@Index(name="idx_audit_created",columnList="created_at"),@Index(name="idx_audit_target",columnList="target_type,target_id")})
public class AuditEvent {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="actor_user_id") private UserAccount actor;
 @Column(nullable=false,length=100) private String action;
 @Column(name="target_type",nullable=false,length=80) private String targetType;
 @Column(name="target_id",length=100) private String targetId;
 @Column(columnDefinition="TEXT") private String details;
 @Column(name="correlation_id",length=100) private String correlationId;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 protected AuditEvent(){} public AuditEvent(UserAccount actor,String action,String targetType,String targetId,String details,String correlationId){this.actor=actor;this.action=action;this.targetType=targetType;this.targetId=targetId;this.details=details;this.correlationId=correlationId;}
 public Long getId(){return id;} public UserAccount getActor(){return actor;}public String getAction(){return action;}public String getTargetType(){return targetType;}public String getTargetId(){return targetId;}public String getDetails(){return details;}public String getCorrelationId(){return correlationId;}public Instant getCreatedAt(){return createdAt;}
}
