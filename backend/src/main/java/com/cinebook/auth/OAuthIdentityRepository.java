package com.cinebook.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OAuthIdentityRepository extends JpaRepository<OAuthIdentity, Long> {
    Optional<OAuthIdentity> findByProviderAndProviderSubject(String provider, String providerSubject);
    Optional<OAuthIdentity> findByUserIdAndProvider(Long userId, String provider);
}
