package com.cinebook.auth;

import com.cinebook.config.GoogleOAuthConfiguration;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import java.time.Duration;
import java.net.URI;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final EmailVerificationService emailVerification;
    private final OAuthLoginCodeService oauthCodes;
    private final GoogleOAuthConfiguration googleOAuth;
    private final long refreshDays;
    private final boolean refreshCookieSecure;
    private final String refreshCookieSameSite;
    private final Set<String> trustedBrowserOrigins;

    public AuthController(AuthService auth, EmailVerificationService emailVerification,
                          OAuthLoginCodeService oauthCodes, GoogleOAuthConfiguration googleOAuth,
                          @Value("${app.jwt.refresh-days:14}") long refreshDays,
                          @Value("${app.refresh-cookie.secure:false}") boolean refreshCookieSecure,
                          @Value("${app.refresh-cookie.same-site:Lax}") String refreshCookieSameSite,
                          @Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}") String allowedOrigins) {
        this.auth = auth;
        this.emailVerification = emailVerification;
        this.oauthCodes = oauthCodes;
        this.googleOAuth = googleOAuth;
        this.refreshDays = refreshDays;
        this.refreshCookieSecure = refreshCookieSecure;
        this.refreshCookieSameSite = refreshCookieSameSite;
        this.trustedBrowserOrigins = Arrays.stream(allowedOrigins.split(",")).map(String::trim)
                .filter(value -> !value.isEmpty()).map(AuthController::normalizeOrigin).filter(java.util.Objects::nonNull)
                .collect(Collectors.toUnmodifiableSet());
    }

    public record OAuthExchangeRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 100) String code) {}

    @GetMapping("/google/status")
    public Map<String, Object> googleStatus() {
        return Map.of("enabled", googleOAuth.isConfigured(), "provider", "Google",
                "message", googleOAuth.isConfigured() ? "Google sign-in is configured." : "Google sign-in is disabled until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.");
    }

    @PostMapping("/oauth/exchange")
    public AuthDtos.TokenResponse exchangeGoogleCode(@Valid @RequestBody OAuthExchangeRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        verifyBrowserOrigin(httpRequest);
        UserAccount user = oauthCodes.consume(request.code());
        return writeRefreshCookie(auth.issueOAuthTokens(user), response);
    }

    @PostMapping("/register")
    public AuthDtos.RegisterResponse register(@Valid @RequestBody AuthDtos.RegisterRequest request, HttpServletRequest req, HttpServletResponse response) {
        verifyBrowserOrigin(req);
        AuthDtos.RegisterResponse result = auth.register(request, req.getRemoteAddr());
        if (result.tokens() == null) return result;
        return new AuthDtos.RegisterResponse(writeRefreshCookie(result.tokens(), response), result.emailSent(),
                result.verificationRequired(), result.message());
    }

    @PostMapping("/verify-email")
    public AuthDtos.EmailVerificationResponse verifyEmail(@Valid @RequestBody AuthDtos.VerifyEmailRequest request, HttpServletRequest req) {
        return emailVerification.verify(request.token(), req.getRemoteAddr());
    }

    @PostMapping("/login")
    public AuthDtos.TokenResponse login(@Valid @RequestBody AuthDtos.LoginRequest request, HttpServletRequest req, HttpServletResponse response) {
        verifyBrowserOrigin(req);
        return writeRefreshCookie(auth.login(request, req.getRemoteAddr()), response);
    }

    @PostMapping("/refresh")
    public AuthDtos.TokenResponse refresh(
            @CookieValue(name = "cinebook_refresh", required = false) String cookieToken,
            @RequestBody(required = false) AuthDtos.RefreshRequest legacyRequest,
            HttpServletRequest request, HttpServletResponse response) {
        verifyBrowserOrigin(request);
        // Body support is retained only for compatibility with older installed clients.
        String raw = cookieToken != null && !cookieToken.isBlank() ? cookieToken
                : legacyRequest == null ? null : legacyRequest.refreshToken();
        if (raw == null || raw.isBlank()) {
            throw new com.cinebook.common.ApiException(401, "INVALID_REFRESH_TOKEN", "Refresh token is missing or expired");
        }
        return writeRefreshCookie(auth.refresh(raw), response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "cinebook_refresh", required = false) String cookieToken,
            @RequestBody(required = false) AuthDtos.RefreshRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        verifyBrowserOrigin(httpRequest);
        String raw = cookieToken != null && !cookieToken.isBlank() ? cookieToken
                : request == null ? null : request.refreshToken();
        auth.logout(raw);
        clearRefreshCookie(response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public AuthDtos.UserView me(java.security.Principal principal) { return auth.profile(principal.getName()); }

    @PatchMapping("/me")
    public AuthDtos.UserView update(java.security.Principal principal, @Valid @RequestBody AuthDtos.ProfileRequest request) {
        return auth.updateProfile(principal.getName(), request);
    }

    private AuthDtos.TokenResponse writeRefreshCookie(AuthDtos.TokenResponse tokens, HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("cinebook_refresh", tokens.refreshToken())
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/")
                .maxAge(Duration.ofDays(refreshDays))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        // The refresh credential is never returned to JavaScript; only the short-lived access token is.
        return new AuthDtos.TokenResponse(tokens.accessToken(), null, tokens.expiresInSeconds(), tokens.user());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("cinebook_refresh", "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/")
                .maxAge(Duration.ZERO)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /** Reject browser-originated auth mutations from an origin not configured for this app.
     * Non-browser clients may omit Origin/Referer and continue to use bearer/API authentication. */
    private void verifyBrowserOrigin(HttpServletRequest request) {
        String source = request.getHeader("Origin");
        if (source == null || source.isBlank()) source = request.getHeader("Referer");
        if (source == null || source.isBlank()) return;
        String normalized = normalizeOrigin(source);
        if (normalized == null || !trustedBrowserOrigins.contains(normalized)) {
            throw new com.cinebook.common.ApiException(403, "UNTRUSTED_AUTH_ORIGIN",
                    "This authentication request did not originate from an allowed CineBook frontend.");
        }
    }

    private static String normalizeOrigin(String source) {
        try {
            URI uri = URI.create(source.trim());
            if (uri.getScheme() == null || uri.getHost() == null) return null;
            int port = uri.getPort();
            String authority = uri.getHost().toLowerCase(java.util.Locale.ROOT)
                    + (port == -1 ? "" : ":" + port);
            return uri.getScheme().toLowerCase(java.util.Locale.ROOT) + "://" + authority;
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}
