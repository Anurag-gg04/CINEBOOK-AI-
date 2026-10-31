package com.cinebook.auth;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/** Sends account lifecycle emails when SMTP is configured; delivery failure never exposes SMTP details to users. */
@Service
public class AccountEmailService {
    private static final Logger log = LoggerFactory.getLogger(AccountEmailService.class);
    private static final DateTimeFormatter SIGN_IN_TIME = DateTimeFormatter.ofPattern("d MMM yyyy, h:mm a z");

    private final ObjectProvider<JavaMailSender> mailSenders;
    private final boolean enabled;
    private final boolean loginAlertsEnabled;
    private final String from;

    public AccountEmailService(
            ObjectProvider<JavaMailSender> mailSenders,
            @Value("${app.mail.enabled:false}") boolean enabled,
            @Value("${app.mail.login-alerts:true}") boolean loginAlertsEnabled,
            @Value("${app.mail.from:noreply@cinebook.local}") String from) {
        this.mailSenders = mailSenders;
        this.enabled = enabled;
        this.loginAlertsEnabled = loginAlertsEnabled;
        this.from = from;
    }

    public boolean sendWelcome(UserAccount user) {
        String name = safeName(user.getDisplayName());
        String subject = "Welcome to CineBook AI — your account is ready";
        String text = "Hi " + name + ",\n\nYour CineBook AI account has been created successfully. You can now discover movies, choose seats, and manage your bookings.\n\nIf you did not create this account, please contact the CineBook administrator and secure your email account.\n\nEnjoy the show,\nCineBook AI";
        String html = emailShell(
                "WELCOME TO CINEBOOK",
                "Your next movie night starts here.",
                "Hi " + escapeHtml(name) + ", your CineBook AI account has been created successfully.",
                "Discover films, find your seats, and keep your tickets together in one place.",
                "If you did not create this account, contact the CineBook administrator and secure your email account.");
        return send(user, "welcome", subject, text, html);
    }

    public boolean sendEmailVerification(UserAccount user, String verificationUrl) {
        String name = safeName(user.getDisplayName());
        String subject = "Verify your CineBook AI email address";
        String text = "Hi " + name + ",\n\nConfirm your email address to finish setting up CineBook AI: " + verificationUrl
                + "\n\nThis link expires in 30 minutes and can only be used once. If you did not create this account, you can ignore this email.\n\nCineBook AI Security";
        String html = "<div style=\"margin:0;background:#090b12;padding:32px 12px;font-family:Arial,sans-serif;color:#f5f1e8\">"
                + "<div style=\"max-width:560px;margin:0 auto;border:1px solid #34313a;border-radius:18px;overflow:hidden;background:#11141c\">"
                + "<div style=\"padding:24px 26px;border-bottom:1px solid #302c33;background:linear-gradient(120deg,#1b1d26,#13141b)\">"
                + "<div style=\"font-size:11px;letter-spacing:2px;color:#dfba78;font-weight:bold\">CINEBOOK <span style=\"color:#f7f0e4\">AI</span></div>"
                + "<h1 style=\"font-size:27px;line-height:1.2;margin:18px 0 0;color:#fff9ef\">Verify your email</h1></div>"
                + "<div style=\"padding:26px\"><p style=\"font-size:15px;line-height:1.7;margin:0 0 12px\">Hi " + escapeHtml(name) + ", confirm that this email address belongs to you.</p>"
                + "<p style=\"font-size:13px;line-height:1.7;color:#c7c4cc;margin:0 0 24px\">This single-use link expires in 30 minutes.</p>"
                + "<a href=\"" + escapeHtml(verificationUrl) + "\" style=\"display:inline-block;padding:13px 20px;border-radius:9px;background:#d8b978;color:#17151a;text-decoration:none;font-weight:bold\">Verify email address</a>"
                + "<p style=\"font-size:12px;line-height:1.7;color:#c7c4cc;margin:24px 0 0\">If the button does not work, copy this link into your browser:<br><a style=\"color:#e4c989;overflow-wrap:anywhere\" href=\"" + escapeHtml(verificationUrl) + "\">" + escapeHtml(verificationUrl) + "</a></p>"
                + "<div style=\"margin-top:22px;padding:14px;border:1px solid #d6ae6d44;border-radius:10px;background:#d6ae6d0b;color:#d7d0c1;font-size:12px;line-height:1.7\">If you did not start this sign-up, ignore this email. The account will remain unverified.</div>"
                + "<p style=\"font-size:11px;color:#898994;margin:22px 0 0\">Automated message from CineBook AI. Please do not reply.</p></div></div></div>";
        return send(user, "email verification", subject, text, html);
    }

    public void sendSignInAlert(UserAccount user) {
        if (!loginAlertsEnabled) return;
        String when = ZonedDateTime.now(ZoneId.of("Asia/Kolkata")).format(SIGN_IN_TIME);
        String name = safeName(user.getDisplayName());
        String subject = "New sign-in to your CineBook AI account";
        String text = "Hi " + name + ",\n\nA sign-in to your CineBook AI account succeeded at " + when + " (India Standard Time).\n\nIf this was you, no action is needed. If you do not recognize this activity, secure your email account and contact the CineBook administrator.\n\nCineBook AI Security";
        String html = emailShell(
                "ACCOUNT SECURITY",
                "A sign-in was successful.",
                "Hi " + escapeHtml(name) + ", a sign-in to your CineBook AI account succeeded.",
                "Time: " + escapeHtml(when) + " (India Standard Time)",
                "If this was you, no action is needed. If you do not recognize this activity, secure your email account and contact the CineBook administrator.");
        send(user, "sign-in alert", subject, text, html);
    }

    private boolean send(UserAccount user, String kind, String subject, String text, String html) {
        if (!enabled) {
            log.debug("Account email delivery is disabled; set APP_MAIL_ENABLED=true and configure SMTP to enable it.");
            return false;
        }
        try {
            JavaMailSender sender = mailSenders.getIfAvailable();
            if (sender == null) {
                log.warn("Account email delivery is enabled but no mail sender is configured; check MAIL_HOST and SMTP settings.");
                return false;
            }
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(user.getEmail());
            helper.setSubject(subject);
            helper.setText(text, html);
            sender.send(message);
            log.info("Account {} email sent for user id {}.", kind, user.getId());
            return true;
        } catch (Exception ex) {
            // Do not log SMTP exception messages; they can contain addresses or other configuration details.
            log.warn("Could not deliver account {} email for user id {} ({}). Check SMTP settings.", kind, user.getId(), ex.getClass().getSimpleName());
            return false;
        }
    }

    private static String emailShell(String eyebrow, String title, String intro, String detail, String safetyNote) {
        return "<div style=\"margin:0;background:#090b12;padding:32px 12px;font-family:Arial,sans-serif;color:#f5f1e8\">"
                + "<div style=\"max-width:560px;margin:0 auto;border:1px solid #34313a;border-radius:18px;overflow:hidden;background:#11141c\">"
                + "<div style=\"padding:22px 26px;border-bottom:1px solid #302c33;background:linear-gradient(120deg,#1b1d26,#13141b)\">"
                + "<div style=\"font-size:11px;letter-spacing:2px;color:#dfba78;font-weight:bold\">CINEBOOK <span style=\"color:#f7f0e4\">AI</span></div>"
                + "<div style=\"margin-top:18px;color:#d9b875;font-size:10px;letter-spacing:1.6px\">" + escapeHtml(eyebrow) + "</div>"
                + "<h1 style=\"font-size:27px;line-height:1.2;margin:10px 0 0;color:#fff9ef\">" + escapeHtml(title) + "</h1></div>"
                + "<div style=\"padding:26px\"><p style=\"font-size:15px;line-height:1.7;margin:0 0 12px\">" + intro + "</p>"
                + "<p style=\"font-size:13px;line-height:1.7;color:#c7c4cc;margin:0\">" + escapeHtml(detail) + "</p>"
                + "<div style=\"margin-top:22px;padding:14px;border:1px solid #d6ae6d44;border-radius:10px;background:#d6ae6d0b;color:#d7d0c1;font-size:12px;line-height:1.7\">" + escapeHtml(safetyNote) + "</div>"
                + "<p style=\"font-size:11px;color:#898994;margin:22px 0 0\">Automated message from CineBook AI. Please do not reply.</p></div></div></div>";
    }

    private static String safeName(String value) {
        String name = value == null ? "there" : value.replaceAll("[\\r\\n\\t]", " ").trim();
        return name.isBlank() ? "there" : name;
    }

    private static String escapeHtml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
