package com.cinebook.auth;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="refresh_tokens", indexes=@Index(name="idx_refresh_user", columnList="user_id"))
public class RefreshToken {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="user_id", nullable=false) private UserAccount user;
 @Column(name="token_hash",nullable=false,unique=true,length=64) private String tokenHash;
 @Column(name="expires_at",nullable=false) private Instant expiresAt;
 @Column(name="revoked_at") private Instant revokedAt;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 protected RefreshToken(){}
 public RefreshToken(UserAccount u,String hash,Instant exp){user=u;tokenHash=hash;expiresAt=exp;}
 public Long getId(){return id;} public UserAccount getUser(){return user;} public String getTokenHash(){return tokenHash;} public Instant getExpiresAt(){return expiresAt;} public Instant getRevokedAt(){return revokedAt;} public void revoke(){revokedAt=Instant.now();} public boolean active(){return revokedAt==null && expiresAt.isAfter(Instant.now());}
}
