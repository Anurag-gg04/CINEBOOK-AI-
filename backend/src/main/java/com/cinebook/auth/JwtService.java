package com.cinebook.auth;
import io.jsonwebtoken.Jwts; import io.jsonwebtoken.security.Keys; import org.springframework.beans.factory.annotation.Value; import org.springframework.stereotype.Service; import org.springframework.core.env.Environment; import java.util.Arrays; import javax.crypto.SecretKey; import java.nio.charset.StandardCharsets; import java.time.Instant; import java.util.Date; import java.util.Map;
@Service
public class JwtService {
 private final SecretKey key; private final long accessMinutes;
 public JwtService(@Value("${app.jwt.secret:${JWT_SECRET:dev-only-secret-replace-this-with-at-least-32-bytes-0123456789}}") String secret,
                   @Value("${app.jwt.access-minutes:15}") long accessMinutes,
                   Environment environment) {
  boolean production = Arrays.asList(environment.getActiveProfiles()).contains("prod");
  if (production && (secret.startsWith("local-only-") || secret.startsWith("dev-only-") || secret.startsWith("replace-with-"))) {
   throw new IllegalStateException("Production requires a unique random JWT_SECRET; the bundled development placeholder is not allowed.");
  }
  this.key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  this.accessMinutes=accessMinutes;
 }
 public String issueAccess(UserAccount user){Instant now=Instant.now();return Jwts.builder().subject(user.getEmail()).claims(Map.of("role",user.getRole().name(),"uid",user.getId())).issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(accessMinutes*60))).signWith(key).compact();}
 public String subject(String token){return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();}
 public String role(String token){return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().get("role",String.class);}
 public boolean valid(String token){try{Jwts.parser().verifyWith(key).build().parseSignedClaims(token);return true;}catch(Exception ex){return false;}}
 public long getAccessMinutes(){return accessMinutes;}
}
