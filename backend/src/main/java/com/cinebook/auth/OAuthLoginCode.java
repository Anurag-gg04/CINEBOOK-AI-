package com.cinebook.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "oauth_login_codes", indexes = @Index(name = "idx_oauth_code_expiry", columnList = "expires_at"))
public class OAuthLoginCode {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(name = "code_hash", nullable = false, unique = true, length = 64)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected OAuthLoginCode() {}

    public OAuthLoginCode(UserAccount user, String codeHash, Instant expiresAt) {
        this.user = user;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
    }

    public UserAccount getUser() { return user; }
    public boolean isUsable() { return consumedAt == null && expiresAt.isAfter(Instant.now()); }
    public void consume() { consumedAt = Instant.now(); }
}
