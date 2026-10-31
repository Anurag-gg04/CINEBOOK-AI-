package com.cinebook.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="users", indexes=@Index(name="idx_users_role", columnList="role"))
public class UserAccount {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, unique=true, length=190) private String email;
    @Column(name="password_hash", nullable=false, length=100) private String passwordHash;
    @Column(name="display_name", nullable=false, length=100) private String displayName;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=30) private Role role = Role.CUSTOMER;
    @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt = Instant.now();
    @Column(name="enabled", nullable=false) private boolean enabled = true;
    @Column(name="email_verified", nullable=false) private boolean emailVerified = true;
    protected UserAccount() {}
    public UserAccount(String email, String passwordHash, String displayName, Role role) { this.email=email; this.passwordHash=passwordHash; this.displayName=displayName; this.role=role; }
    public Long getId(){return id;} public String getEmail(){return email;} public String getPasswordHash(){return passwordHash;} public String getDisplayName(){return displayName;} public Role getRole(){return role;} public Instant getCreatedAt(){return createdAt;} public boolean isEnabled(){return enabled;} public boolean isEmailVerified(){return emailVerified;} public void setEmailVerified(boolean v){emailVerified=v;} public void setDisplayName(String v){displayName=v;} public void setPasswordHash(String v){passwordHash=v;} public void setRole(Role v){role=v;} public void setEnabled(boolean v){enabled=v;}
}
