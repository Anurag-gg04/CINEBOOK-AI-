package com.cinebook.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "oauth_identities",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_oauth_provider_subject", columnNames = {"provider", "provider_subject"}),
           @UniqueConstraint(name = "uq_oauth_user_provider", columnNames = {"user_id", "provider"})
       })
public class OAuthIdentity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_subject", nullable = false, length = 255)
    private String providerSubject;

    @Column(nullable = false, length = 190)
    private String email;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected OAuthIdentity() {}

    public OAuthIdentity(UserAccount user, String provider, String providerSubject, String email) {
        this.user = user;
        this.provider = provider;
        this.providerSubject = providerSubject;
        this.email = email;
    }

    public Long getId() { return id; }
    public UserAccount getUser() { return user; }
    public String getProvider() { return provider; }
    public String getProviderSubject() { return providerSubject; }
    public String getEmail() { return email; }
}
