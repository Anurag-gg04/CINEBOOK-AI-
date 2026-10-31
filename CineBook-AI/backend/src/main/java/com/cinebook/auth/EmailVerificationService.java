package com.cinebook.auth;

import com.cinebook.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;

/** Single-use, short-lived email ownership verification for production deployments. */
@Service
public class EmailVerificationService {
    private static final long WINDOW_MS = 60 * 60 * 1000L;
    private final EmailVerificationTokenRepository tokenRepository;
    private final AccountEmailService emails;
    private final Environment environment;
    private final String publicUrl;
    private final boolean configuredRequired;
    private final SecureRandom random = new SecureRandom();
    private final ConcurrentHashMap<String, AttemptWindow> attempts = new ConcurrentHashMap<>();

    private record AttemptWindow(long startedAt, int count) {}

    public EmailVerificationService(EmailVerificationTokenRepository tokenRepository, AccountEmailService emails,
                                    Environment environment,
                                    @Value("${app.mail.public-url:http://localhost:5173}") String publicUrl,
                                    @Value("${app.security.email-verification-required:false}") boolean configuredRequired) {
        this.tokenRepository = tokenRepository;
        this.emails = emails;
        this.environment = environment;
        this.publicUrl = publicUrl == null ? "http://localhost:5173" : publicUrl.replaceAll("/+$", "");
        this.configuredRequired = configuredRequired;
        boolean production = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        if (production && (!this.publicUrl.startsWith("https://") || this.publicUrl.contains("localhost") || this.publicUrl.contains("127.0.0.1"))) {
            throw new IllegalStateException("Production requires APP_PUBLIC_URL to be the public HTTPS frontend origin.");
        }
    }

    public boolean isRequired() {
        return configuredRequired || Arrays.asList(environment.getActiveProfiles()).contains("prod");
    }

    @Transactional
    public boolean begin(UserAccount user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokenRepository.deleteAllForUser(user.getId());
        tokenRepository.save(new EmailVerificationToken(user, sha256(rawToken), Instant.now().plusSeconds(30 * 60)));
        String url = publicUrl + "/verify-email#token=" + rawToken;
        if (!emails.sendEmailVerification(user, url)) {
            throw new ApiException(503, "EMAIL_DELIVERY_UNAVAILABLE",
                    "We could not send a verification email. Please try again later or contact the administrator.");
        }
        return true;
    }

    @Transactional
    public AuthDtos.EmailVerificationResponse verify(String rawToken, String clientKey) {
        applyRateLimit(clientKey);
        if (rawToken == null || rawToken.isBlank() || rawToken.length() > 120) {
            throw invalidToken();
        }
        EmailVerificationToken token = tokenRepository.findByTokenHashForUpdate(sha256(rawToken))
                .orElseThrow(EmailVerificationService::invalidToken);
        Instant now = Instant.now();
        if (!token.active(now)) throw invalidToken();
        UserAccount user = token.getUser();
        token.markUsed();
        user.setEmailVerified(true);
        emails.sendWelcome(user);
        return new AuthDtos.EmailVerificationResponse(true, "Email verified. You can now sign in to CineBook AI.");
    }

    private void applyRateLimit(String clientKey) {
        String key = clientKey == null || clientKey.isBlank() ? "unknown" : clientKey.trim();
        long now = System.currentTimeMillis();
        AttemptWindow window = attempts.compute(key, (ignored, previous) -> previous == null || now - previous.startedAt() >= WINDOW_MS
                ? new AttemptWindow(now, 1) : new AttemptWindow(previous.startedAt(), previous.count() + 1));
        if (window.count() > 20) {
            throw new ApiException(429, "VERIFICATION_RATE_LIMIT", "Too many verification attempts. Try again later.");
        }
        if (attempts.size() > 10_000) attempts.entrySet().removeIf(entry -> now - entry.getValue().startedAt() >= WINDOW_MS);
    }

    private static ApiException invalidToken() {
        return new ApiException(400, "INVALID_VERIFICATION_TOKEN", "This verification link is invalid, expired, or already used. Request a new sign-up link if needed.");
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
