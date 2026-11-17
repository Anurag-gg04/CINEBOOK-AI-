package com.cinebook.auth;
import com.cinebook.common.ApiException;import org.springframework.web.bind.annotation.*;import java.security.Principal;import java.util.List;
@RestController @RequestMapping("/api/notifications") public class NotificationController {private final UserRepository users;private final NotificationRepository notifications;public NotificationController(UserRepository u,NotificationRepository n){users=u;notifications=n;}
 public record NotificationView(Long id,String type,String title,String message,String status,java.time.Instant createdAt,java.time.Instant readAt){}
 @GetMapping public List<NotificationView> list(Principal p){UserAccount u=user(p.getName());return notifications.findTop100ByUserIdOrderByCreatedAtDesc(u.getId()).stream().map(n->new NotificationView(n.getId(),n.getType(),n.getTitle(),n.getMessage(),n.getStatus(),n.getCreatedAt(),n.getReadAt())).toList();}
 @GetMapping("/unread-count") public java.util.Map<String,Long> unread(Principal p){return java.util.Map.of("count",notifications.countByUserIdAndStatus(user(p.getName()).getId(),"PENDING"));}
 @PostMapping("/{id}/read") public NotificationView read(Principal p,@PathVariable Long id){UserAccount u=user(p.getName());Notification n=notifications.findByIdAndUserId(id,u.getId()).orElseThrow(()->new ApiException(404,"NOTIFICATION_NOT_FOUND","Notification was not found"));n.markRead();return new NotificationView(n.getId(),n.getType(),n.getTitle(),n.getMessage(),n.getStatus(),n.getCreatedAt(),n.getReadAt());}
 private UserAccount user(String email){return users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(404,"USER_NOT_FOUND","User was not found"));}
}
