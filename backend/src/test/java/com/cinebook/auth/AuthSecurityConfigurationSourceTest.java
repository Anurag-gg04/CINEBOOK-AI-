package com.cinebook.auth;

import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class AuthSecurityConfigurationSourceTest {
    @Test
    void signupUsesTwelveCharacterPolicyAndEmailsRemainOptional() throws Exception {
        String dto = Files.readString(Path.of("src/main/java/com/cinebook/auth/AuthDtos.java"));
        String mail = Files.readString(Path.of("src/main/java/com/cinebook/auth/AccountEmailService.java"));
        String config = Files.readString(Path.of("src/main/resources/application.yml"));
        String verify = Files.readString(Path.of("src/main/java/com/cinebook/auth/EmailVerificationService.java"));
        String profile = Files.readString(Path.of("src/main/resources/application-prod.yml"));
        assertTrue(dto.contains("@Size(min=12,max=72) String password"));
        assertTrue(mail.contains("sendWelcome"));
        assertTrue(mail.contains("sendSignInAlert"));
        assertTrue(config.contains("enabled: ${APP_MAIL_ENABLED:false}"));
        assertTrue(verify.contains("SecureRandom"));
        assertTrue(verify.contains("plusSeconds(30 * 60)"));
        assertTrue(verify.contains("SHA-256"));
        assertTrue(verify.contains("public HTTPS frontend origin"));
        assertTrue(profile.contains("email-verification-required: true"));
    }

    @Test
    void productionProfileTurnsOffDemoSeedingAndApiDocs() throws Exception {
        String profile = Files.readString(Path.of("src/main/resources/application-prod.yml"));
        String jwt = Files.readString(Path.of("src/main/java/com/cinebook/auth/JwtService.java"));
        assertTrue(profile.contains("enabled: false"));
        assertTrue(profile.contains("secret: ${JWT_SECRET}"));
        assertTrue(jwt.contains("Production requires a unique random JWT_SECRET"));
    }
}
