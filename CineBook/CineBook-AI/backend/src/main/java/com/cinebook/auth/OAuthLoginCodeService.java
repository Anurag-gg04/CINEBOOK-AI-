package com.cinebook.auth;

import com.cinebook.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

@Service
public class OAuthLoginCodeService {
    private final OAuthLoginCodeRepository codes;
    private final SecureRandom random = new SecureRandom();

    public OAuthLoginCodeService(OAuthLoginCodeRepository codes) { this.codes = codes; }

    @Transactional
    public String issue(UserAccount user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        codes.save(new OAuthLoginCode(user, hash(raw), Instant.now().plusSeconds(90)));
        return raw;
    }

    @Transactional
    public UserAccount consume(String rawCode) {
        if (rawCode == null || rawCode.isBlank() || rawCode.length() > 100) {
            throw invalidCode();
        }
        OAuthLoginCode code = codes.findForUpdate(hash(rawCode)).orElseThrow(OAuthLoginCodeService::invalidCode);
        if (!code.isUsable()) throw invalidCode();
        code.consume();
        return code.getUser();
    }

    private static ApiException invalidCode() {
        return new ApiException(401, "OAUTH_CODE_INVALID", "The Google sign-in code is invalid or has expired. Please try again.");
    }

    private static String hash(String value) {
        try {
            return java.util.HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
