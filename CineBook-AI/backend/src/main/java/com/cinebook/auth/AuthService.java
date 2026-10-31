package com.cinebook.auth;

import com.cinebook.common.ApiException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {
    private static final long MINUTE_MILLIS = 60_000L;
    private static final long REGISTER_WINDOW_MILLIS = 15 * MINUTE_MILLIS;
    private static final int REGISTER_ATTEMPTS = 5;
    private static final int LOGIN_ATTEMPTS = 10;

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AccountEmailService accountEmails;
    private final EmailVerificationService emailVerification;
    private final long refreshDays;
    private final SecureRandom random = new SecureRandom();
    private final ConcurrentHashMap<String, Window> attempts = new ConcurrentHashMap<>();

    private record Window(long start, int count) {}

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       PasswordEncoder encoder, JwtService jwt, AccountEmailService accountEmails, EmailVerificationService emailVerification,
                       @Value("${app.jwt.refresh-days:14}") long refreshDays) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.encoder = encoder;
        this.jwt = jwt;
        this.accountEmails = accountEmails;
        this.emailVerification = emailVerification;
        this.refreshDays = refreshDays;
    }

    @Transactional
    public AuthDtos.RegisterResponse register(AuthDtos.RegisterRequest request, String clientKey) {
        String email = normalizeEmail(request.email());
        rateLimit("register:" + safeClientKey(clientKey), REGISTER_ATTEMPTS, REGISTER_WINDOW_MILLIS,
                "REGISTRATION_RATE_LIMIT", "Too many sign-up attempts. Try again in 15 minutes");
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(409, "EMAIL_EXISTS", "An account with this email already exists");
        }
        UserAccount user = new UserAccount(email, encoder.encode(request.password()),
                request.displayName().trim(), Role.CUSTOMER);
        if (emailVerification.isRequired()) {
            user.setEmailVerified(false);
            user = users.save(user);
            emailVerification.begin(user); // fails closed if SMTP delivery is unavailable
            return new AuthDtos.RegisterResponse(null, true, true,
                    "Check your inbox for a verification link. It expires in 30 minutes.");
        }
        user = users.save(user);
        AuthDtos.TokenResponse tokenResponse = tokens(user);
        boolean emailSent = accountEmails.sendWelcome(user);
        String message = emailSent
                ? "Your account is ready. A welcome email has been sent."
                : "Your account is ready, but email delivery is not configured. See README.md to enable account emails.";
        return new AuthDtos.RegisterResponse(tokenResponse, emailSent, false, message);
    }

    @Transactional
    public AuthDtos.TokenResponse login(AuthDtos.LoginRequest request, String clientKey) {
        String email = normalizeEmail(request.email());
        String client = safeClientKey(clientKey);
        rateLimit("login-ip:" + client, 30, MINUTE_MILLIS, "LOGIN_IP_RATE_LIMIT",
                "Too many sign-in attempts from this network. Try again in a minute");
        String key = "login:" + client + ":" + email;
        rateLimit(key, LOGIN_ATTEMPTS, MINUTE_MILLIS, "LOGIN_RATE_LIMIT",
                "Too many login attempts. Try again in a minute");

        UserAccount user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(401, "INVALID_CREDENTIALS", "Email or password is incorrect"));
        if (!user.isEnabled() || !encoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
        }
        if (!user.isEmailVerified()) {
            throw new ApiException(403, "EMAIL_NOT_VERIFIED", "Verify your email address before signing in.");
        }
        attempts.remove(key);
        AuthDtos.TokenResponse tokenResponse = tokens(user);
        accountEmails.sendSignInAlert(user);
        return tokenResponse;
    }

    @Transactional
    public AuthDtos.TokenResponse refresh(String raw) {
        String tokenHash = hash(raw);
        RefreshToken token = refreshTokens.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired"));
        if (!token.active()) {
            throw new ApiException(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
        }
        token.revoke();
        return tokens(token.getUser());
    }

    @Transactional
    public void logout(String raw) {
        if (raw == null || raw.isBlank()) return;
        refreshTokens.findByTokenHash(hash(raw)).ifPresent(RefreshToken::revoke);
    }

    @Transactional
    public AuthDtos.UserView profile(String email) {
        return view(users.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(404, "USER_NOT_FOUND", "User was not found")));
    }

    @Transactional
    public AuthDtos.UserView updateProfile(String email, AuthDtos.ProfileRequest request) {
        UserAccount user = users.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(404, "USER_NOT_FOUND", "User was not found"));
        user.setDisplayName(request.displayName().trim());
        return view(user);
    }

    private AuthDtos.TokenResponse tokens(UserAccount user) {
        byte[] bytes = new byte[48];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new RefreshToken(user, hash(raw), Instant.now().plusSeconds(refreshDays * 86400)));
        return new AuthDtos.TokenResponse(jwt.issueAccess(user), raw, jwt.getAccessMinutes() * 60, view(user));
    }

    private void rateLimit(String key, int limit, long windowMillis, String code, String message) {
        long now = System.currentTimeMillis();
        Window window = attempts.compute(key, (ignored, previous) ->
                previous == null || now - previous.start() >= windowMillis
                        ? new Window(now, 1) : new Window(previous.start(), previous.count() + 1));
        if (window.count() > limit) {
            throw new ApiException(429, code, message);
        }
        // Bound process-local state if an attacker submits many distinct email addresses.
        if (attempts.size() > 10_000) {
            attempts.entrySet().removeIf(entry -> now - entry.getValue().start() > 60 * MINUTE_MILLIS);
        }
    }

    private static String normalizeEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static String safeClientKey(String value) {
        return value == null || value.isBlank() ? "unknown-client" : value.trim();
    }

    private static String hash(String value) {
        try {
            return java.util.HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static AuthDtos.UserView view(UserAccount user) {
        return new AuthDtos.UserView(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole().name());
    }
}
