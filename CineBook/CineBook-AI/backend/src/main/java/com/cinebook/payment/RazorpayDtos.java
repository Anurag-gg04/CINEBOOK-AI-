package com.cinebook.payment;
import jakarta.validation.constraints.NotBlank;
public final class RazorpayDtos {private RazorpayDtos(){}
 public record CreateOrderRequest(@NotBlank String holdToken,String couponCode){}
 public record VerifyRequest(@NotBlank String orderId,@NotBlank String paymentId,@NotBlank String signature){}
 public record OrderView(String mode,String keyId,String orderId,long amountPaise,String currency,String paymentRecordId,String status,String message){}
 public record OptionsView(String mode,boolean razorpayEnabled,String razorpayKeyId,boolean simulatorEnabled){}
}
