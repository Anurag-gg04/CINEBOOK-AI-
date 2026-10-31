package com.cinebook.auth;
import jakarta.persistence.*;import java.time.Instant;
@Entity @Table(name="notifications",indexes=@Index(name="idx_notification_user_status",columnList="user_id,status,created_at"))
public class Notification {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private UserAccount user;
 @Column(nullable=false,length=50) private String type;@Column(nullable=false,length=180) private String title;@Column(nullable=false,length=1000) private String message;@Column(nullable=false,length=20) private String status="PENDING";@Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();@Column(name="read_at") private Instant readAt;
 protected Notification(){}public Notification(UserAccount u,String type,String title,String message){user=u;this.type=type;this.title=title;this.message=message;}public Long getId(){return id;}public UserAccount getUser(){return user;}public String getType(){return type;}public String getTitle(){return title;}public String getMessage(){return message;}public String getStatus(){return status;}public Instant getCreatedAt(){return createdAt;}public Instant getReadAt(){return readAt;}public void markRead(){status="READ";readAt=Instant.now();}
}
