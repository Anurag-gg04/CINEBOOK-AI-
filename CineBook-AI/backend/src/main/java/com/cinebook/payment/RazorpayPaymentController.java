package com.cinebook.payment;
import com.cinebook.booking.BookingDtos;import jakarta.validation.Valid;import org.springframework.http.ResponseEntity;import org.springframework.web.bind.annotation.*;import java.security.Principal;import java.util.Map;
@RestController @RequestMapping("/api/payments") public class RazorpayPaymentController {private final RazorpayPaymentService service;public RazorpayPaymentController(RazorpayPaymentService s){service=s;}
 @GetMapping("/options") public RazorpayDtos.OptionsView options(){return service.options();}
 @PostMapping("/razorpay/orders") public RazorpayDtos.OrderView createOrder(Principal p,@Valid @RequestBody RazorpayDtos.CreateOrderRequest r,@RequestHeader(value="Idempotency-Key",required=false) String key,@RequestHeader(value="X-Correlation-ID",required=false) String cid){return service.createOrder(p.getName(),r.holdToken(),key,r.couponCode(),cid);}
 @PostMapping("/razorpay/verify") public BookingDtos.PaymentView verify(Principal p,@Valid @RequestBody RazorpayDtos.VerifyRequest r,@RequestHeader(value="X-Correlation-ID",required=false) String cid){return service.verify(p.getName(),r.orderId(),r.paymentId(),r.signature(),cid);}
 @PostMapping("/razorpay/webhook") public ResponseEntity<Map<String,Object>> webhook(@RequestBody String body,@RequestHeader(value="X-Razorpay-Signature",required=false) String signature,@RequestHeader(value="X-Razorpay-Event-Id",required=false) String eventId,@RequestHeader(value="X-Correlation-ID",required=false) String cid){return ResponseEntity.ok(service.handleWebhook(body,signature,eventId,cid));}
}
