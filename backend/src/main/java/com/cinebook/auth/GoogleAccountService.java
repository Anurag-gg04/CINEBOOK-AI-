package com.cinebook.auth;

import com.cinebook.common.ApiException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;

@Service
public class GoogleAccountService {
    private final UserRepository users;
    private final OAuthIdentityRepository identities;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public GoogleAccountService(UserRepository users, OAuthIdentityRepository identities,
                                PasswordEncoder passwordEncoder) {
        this.users = users;
        this.identities = identities;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserAccount resolve(OidcUser googleUser) {
        Object subjectClaim = googleUser.getAttributes().get("sub");
        Object emailClaim = googleUser.getAttributes().get("email");
        String subject = subjectClaim instanceof String value ? value : "";
        String email = normalize(emailClaim instanceof String value ? value : "");
        boolean verified = Boolean.TRUE.equals(googleUser.getClaim("email_verified"));
        if (subject == null || subject.isBlank() || email.isBlank() || !verified) {
            throw new ApiException(403, "GOOGLE_EMAIL_NOT_VERIFIED",
                    "Google sign-in requires a verified Google email address.");
        }

        OAuthIdentity existingIdentity = identities.findByProviderAndProviderSubject("GOOGLE", subject)
                .orElse(null);
        if (existingIdentity != null) {
            UserAccount existingUser = existingIdentity.getUser();
            if (!existingUser.isEnabled()) {
                throw new ApiException(403, "ACCOUNT_DISABLED", "This CineBook account is disabled.");
            }
            return existingUser;
        }

        UserAccount user = users.findByEmailIgnoreCaseForUpdate(email).orElse(null);
        if (user != null) {
            if (!user.isEnabled()) {
                throw new ApiException(403, "ACCOUNT_DISABLED", "This CineBook account is disabled.");
            }
            // A verified Google address proves ownership of the email. Existing accounts
            // are linked only when their local email has already passed CineBook verification.
            if (!user.isEmailVerified()) {
                throw new ApiException(409, "LOCAL_EMAIL_VERIFICATION_REQUIRED",
                        "Verify this email with CineBook before linking your Google account.");
            }
        } else {
            byte[] randomPassword = new byte[48];
            random.nextBytes(randomPassword);
            Object nameClaim = googleUser.getAttributes().get("name");
            String displayName = nameClaim instanceof String value ? value : null;
            if (displayName == null || displayName.isBlank()) displayName = email.substring(0, email.indexOf('@'));
            if (displayName.length() > 100) displayName = displayName.substring(0, 100);
            user = users.save(new UserAccount(email,
                    passwordEncoder.encode(Base64.getUrlEncoder().withoutPadding().encodeToString(randomPassword)),
                    displayName, Role.CUSTOMER));
            user.setEmailVerified(true);
        }

        identities.save(new OAuthIdentity(user, "GOOGLE", subject, email));
        return user;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
