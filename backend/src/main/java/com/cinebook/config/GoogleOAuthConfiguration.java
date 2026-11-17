package com.cinebook.config;

import com.cinebook.auth.GoogleAccountService;
import com.cinebook.auth.OAuthLoginCodeService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Configuration
public class GoogleOAuthConfiguration {
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final String frontendUrl;

    public GoogleOAuthConfiguration(
            @Value("${GOOGLE_CLIENT_ID:}") String clientId,
            @Value("${GOOGLE_CLIENT_SECRET:}") String clientSecret,
            @Value("${GOOGLE_REDIRECT_URI:}") String redirectUri,
            @Value("${FRONTEND_URL:${APP_PUBLIC_URL:http://localhost:5173}}") String frontendUrl) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri == null || redirectUri.isBlank()
                ? "{baseUrl}/login/oauth2/code/{registrationId}" : redirectUri.trim();
        this.frontendUrl = frontendUrl;
    }

    @Bean
    ClientRegistrationRepository clientRegistrationRepository() {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            return registrationId -> null; // Application starts with Google sign-in disabled until configured.
        }
        ClientRegistration google = ClientRegistration.withRegistrationId("google")
                .clientId(clientId)
                .clientSecret(clientSecret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .issuerUri("https://accounts.google.com")
                .redirectUri(redirectUri)
                .scope("openid", "profile", "email")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
                .userNameAttributeName("sub")
                .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .clientName("Google")
                .providerConfigurationMetadata(Map.of("issuer", "https://accounts.google.com"))
                .build();
        return new InMemoryClientRegistrationRepository(google);
    }

    @Bean
    OAuth2UserService<OidcUserRequest, OidcUser> googleOidcUserService() {
        OidcUserService delegate = new OidcUserService();
        return request -> {
            OidcUser user = delegate.loadUser(request);
            Object issuerClaim = user.getIdToken().getClaims().get("iss");
            String issuer = issuerClaim instanceof String value ? value : "";
            boolean issuerValid = "https://accounts.google.com".equals(issuer)
                    || "accounts.google.com".equals(issuer);
            boolean audienceValid = user.getIdToken().getAudience().contains(
                    request.getClientRegistration().getClientId());
            boolean emailVerified = Boolean.TRUE.equals(user.getClaim("email_verified"));
            if (!issuerValid || !audienceValid || !emailVerified) {
                throw new OAuth2AuthenticationException(new OAuth2Error(
                        "invalid_google_identity", "Google returned an untrusted or unverified identity.", null));
            }
            return user;
        };
    }

    @Bean
    AuthenticationSuccessHandler googleAuthenticationSuccessHandler(
            GoogleAccountService accounts, OAuthLoginCodeService loginCodes) {
        return (request, response, authentication) -> {
            if (!(authentication.getPrincipal() instanceof OidcUser oidcUser)) {
                response.sendRedirect(frontendUrl + "/login?oauth=failed");
                return;
            }
            try {
                var user = accounts.resolve(oidcUser);
                String code = loginCodes.issue(user);
                String destination = UriComponentsBuilder.fromUriString(frontendUrl)
                        .path("/auth/callback")
                        .queryParam("code", code)
                        .build().toUriString();
                response.sendRedirect(destination);
            } catch (RuntimeException exception) {
                response.sendRedirect(frontendUrl + "/login?oauth=failed");
            }
        };
    }

    @Bean
    SimpleUrlAuthenticationFailureHandler googleAuthenticationFailureHandler() {
        return new SimpleUrlAuthenticationFailureHandler(frontendUrl + "/login?oauth=failed");
    }

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
    }
}
