package com.cinebook.auth;
import jakarta.validation.constraints.*;
public final class AuthDtos { private AuthDtos(){}
 public record RegisterRequest(@NotBlank @Size(max=100) String displayName,@NotBlank @Email @Size(max=190) String email,@NotBlank @Size(min=12,max=72) String password){}
 public record LoginRequest(@NotBlank @Email String email,@NotBlank String password){}
 public record RefreshRequest(@NotBlank String refreshToken){}
 public record ProfileRequest(@NotBlank @Size(max=100) String displayName){}
 public record VerifyEmailRequest(@NotBlank @Size(max=120) String token){}
 public record EmailVerificationResponse(boolean verified, String message){}
 public record UserView(Long id,String email,String displayName,String role){}
 public record TokenResponse(String accessToken,String refreshToken,long expiresInSeconds,UserView user){}
 public record RegisterResponse(TokenResponse tokens, boolean emailSent, boolean verificationRequired, String message){}
}
