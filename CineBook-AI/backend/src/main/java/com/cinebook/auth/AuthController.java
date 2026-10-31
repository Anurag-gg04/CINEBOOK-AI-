package com.cinebook.auth;
import jakarta.servlet.http.HttpServletRequest; import jakarta.validation.Valid; import org.springframework.http.ResponseEntity; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/auth")
public class AuthController {
 private final AuthService auth; private final EmailVerificationService emailVerification; public AuthController(AuthService auth, EmailVerificationService emailVerification){this.auth=auth;this.emailVerification=emailVerification;}
 @PostMapping("/register") public AuthDtos.RegisterResponse register(@Valid @RequestBody AuthDtos.RegisterRequest r, HttpServletRequest req){return auth.register(r, req.getRemoteAddr());}
 @PostMapping("/verify-email") public AuthDtos.EmailVerificationResponse verifyEmail(@Valid @RequestBody AuthDtos.VerifyEmailRequest r,HttpServletRequest req){return emailVerification.verify(r.token(),req.getRemoteAddr());}
 @PostMapping("/login") public AuthDtos.TokenResponse login(@Valid @RequestBody AuthDtos.LoginRequest r,HttpServletRequest req){return auth.login(r,req.getRemoteAddr());}
 @PostMapping("/refresh") public AuthDtos.TokenResponse refresh(@Valid @RequestBody AuthDtos.RefreshRequest r){return auth.refresh(r.refreshToken());}
 @PostMapping("/logout") public ResponseEntity<Void> logout(@RequestBody(required=false) AuthDtos.RefreshRequest r){if(r!=null&&r.refreshToken()!=null)auth.logout(r.refreshToken());return ResponseEntity.noContent().build();}
 @GetMapping("/me") public AuthDtos.UserView me(java.security.Principal p){return auth.profile(p.getName());}
 @PatchMapping("/me") public AuthDtos.UserView update(java.security.Principal p,@Valid @RequestBody AuthDtos.ProfileRequest r){return auth.updateProfile(p.getName(),r);}
}
