CREATE TABLE users (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(100) NOT NULL,
 display_name VARCHAR(100) NOT NULL,
 role VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER',
 created_at DATETIME(6) NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 INDEX idx_users_role(role)
) ENGINE=InnoDB;
CREATE TABLE movies (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 title VARCHAR(180) NOT NULL,
 synopsis VARCHAR(3000) NOT NULL,
 poster_url VARCHAR(700), backdrop_url VARCHAR(700),
 duration_minutes INT NOT NULL,
 language VARCHAR(80) NOT NULL,
 genres VARCHAR(300) NOT NULL,
 content_rating VARCHAR(20) NOT NULL DEFAULT 'UA',
 release_date DATE,
 rating DOUBLE NOT NULL DEFAULT 0,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at DATETIME(6) NOT NULL,
 INDEX idx_movies_active_title(active,title), INDEX idx_movies_release(release_date)
) ENGINE=InnoDB;
CREATE TABLE theatres (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(160) NOT NULL, city VARCHAR(100) NOT NULL, address VARCHAR(350) NOT NULL,
 partner_owner_id BIGINT, active BOOLEAN NOT NULL DEFAULT TRUE,
 CONSTRAINT fk_theatre_owner FOREIGN KEY(partner_owner_id) REFERENCES users(id), INDEX idx_theatres_city(city)
) ENGINE=InnoDB;
CREATE TABLE screens (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 theatre_id BIGINT NOT NULL, name VARCHAR(80) NOT NULL,
 row_count INT NOT NULL, column_count INT NOT NULL,
 CONSTRAINT fk_screen_theatre FOREIGN KEY(theatre_id) REFERENCES theatres(id),
 CONSTRAINT uq_screen_theatre_name UNIQUE(theatre_id,name)
) ENGINE=InnoDB;
CREATE TABLE seats (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 screen_id BIGINT NOT NULL, row_label VARCHAR(5) NOT NULL, seat_number INT NOT NULL,
 type VARCHAR(20) NOT NULL, is_accessible BOOLEAN NOT NULL DEFAULT FALSE,
 CONSTRAINT fk_seat_screen FOREIGN KEY(screen_id) REFERENCES screens(id),
 CONSTRAINT uq_seat_screen_row_number UNIQUE(screen_id,row_label,seat_number), INDEX idx_seats_screen(screen_id)
) ENGINE=InnoDB;
CREATE TABLE showtimes (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, movie_id BIGINT NOT NULL, screen_id BIGINT NOT NULL,
 starts_at DATETIME(6) NOT NULL, ends_at DATETIME(6) NOT NULL,
 base_price DECIMAL(10,2) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
 CONSTRAINT fk_show_movie FOREIGN KEY(movie_id) REFERENCES movies(id), CONSTRAINT fk_show_screen FOREIGN KEY(screen_id) REFERENCES screens(id),
 INDEX idx_shows_start(starts_at), INDEX idx_shows_movie_start(movie_id,starts_at),
 CONSTRAINT ck_show_price CHECK(base_price > 0), CONSTRAINT ck_show_time CHECK(ends_at > starts_at)
) ENGINE=InnoDB;
CREATE TABLE refresh_tokens (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL,
 token_hash CHAR(64) NOT NULL UNIQUE, expires_at DATETIME(6) NOT NULL, revoked_at DATETIME(6), created_at DATETIME(6) NOT NULL,
 CONSTRAINT fk_refresh_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_refresh_user(user_id)
) ENGINE=InnoDB;
CREATE TABLE seat_holds (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, token CHAR(36) NOT NULL UNIQUE, user_id BIGINT NOT NULL, showtime_id BIGINT NOT NULL,
 expires_at DATETIME(6) NOT NULL, status VARCHAR(20) NOT NULL, idempotency_key VARCHAR(100) NOT NULL, created_at DATETIME(6) NOT NULL,
 CONSTRAINT fk_hold_user FOREIGN KEY(user_id) REFERENCES users(id), CONSTRAINT fk_hold_show FOREIGN KEY(showtime_id) REFERENCES showtimes(id),
 CONSTRAINT uq_hold_user_idempotency UNIQUE(user_id,idempotency_key), INDEX idx_holds_expiry_status(status,expires_at)
) ENGINE=InnoDB;
CREATE TABLE bookings (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, booking_code VARCHAR(24) NOT NULL UNIQUE,
 user_id BIGINT NOT NULL, showtime_id BIGINT NOT NULL, hold_id BIGINT NOT NULL UNIQUE,
 status VARCHAR(24) NOT NULL, total_amount DECIMAL(10,2) NOT NULL, created_at DATETIME(6) NOT NULL, cancelled_at DATETIME(6),
 CONSTRAINT fk_booking_user FOREIGN KEY(user_id) REFERENCES users(id), CONSTRAINT fk_booking_show FOREIGN KEY(showtime_id) REFERENCES showtimes(id), CONSTRAINT fk_booking_hold FOREIGN KEY(hold_id) REFERENCES seat_holds(id),
 INDEX idx_booking_user_created(user_id,created_at), INDEX idx_booking_state(status), CONSTRAINT ck_booking_amount CHECK(total_amount >= 0)
) ENGINE=InnoDB;
CREATE TABLE show_seats (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, showtime_id BIGINT NOT NULL, seat_id BIGINT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', price DECIMAL(10,2) NOT NULL,
 hold_id BIGINT, hold_expires_at DATETIME(6), booking_id BIGINT, version BIGINT NOT NULL DEFAULT 0,
 CONSTRAINT fk_showseat_show FOREIGN KEY(showtime_id) REFERENCES showtimes(id), CONSTRAINT fk_showseat_seat FOREIGN KEY(seat_id) REFERENCES seats(id),
 CONSTRAINT fk_showseat_hold FOREIGN KEY(hold_id) REFERENCES seat_holds(id), CONSTRAINT fk_showseat_booking FOREIGN KEY(booking_id) REFERENCES bookings(id),
 CONSTRAINT uq_show_seat UNIQUE(showtime_id,seat_id), INDEX idx_show_seats_status(showtime_id,status), INDEX idx_show_seats_hold_expiry(status,hold_expires_at),
 CONSTRAINT ck_showseat_price CHECK(price > 0)
) ENGINE=InnoDB;
CREATE TABLE payments (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, hold_id BIGINT NOT NULL, booking_id BIGINT,
 provider VARCHAR(30) NOT NULL, status VARCHAR(20) NOT NULL, amount DECIMAL(10,2) NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'INR',
 provider_reference VARCHAR(120) UNIQUE, provider_payment_id VARCHAR(120) UNIQUE, coupon_code VARCHAR(40), idempotency_key VARCHAR(120) NOT NULL UNIQUE, webhook_event_id VARCHAR(140),
 created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 CONSTRAINT fk_payment_hold FOREIGN KEY(hold_id) REFERENCES seat_holds(id), CONSTRAINT fk_payment_booking FOREIGN KEY(booking_id) REFERENCES bookings(id),
 INDEX idx_payment_state_created(status,created_at), CONSTRAINT ck_payment_amount CHECK(amount >= 0)
) ENGINE=InnoDB;
CREATE TABLE outbox_events (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, event_type VARCHAR(100) NOT NULL, aggregate_id VARCHAR(100) NOT NULL,
 state VARCHAR(40) NOT NULL DEFAULT 'PENDING', payload TEXT NOT NULL, correlation_id VARCHAR(100), attempts INT NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL, published_at DATETIME(6), INDEX idx_outbox_state_created(state,created_at)
) ENGINE=InnoDB;
CREATE TABLE coupons (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, code VARCHAR(40) NOT NULL UNIQUE, description VARCHAR(200) NOT NULL,
 discount_percent DECIMAL(5,2) NOT NULL, max_discount DECIMAL(10,2), min_subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
 starts_at DATETIME(6) NOT NULL, ends_at DATETIME(6) NOT NULL, usage_limit INT, used_count INT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT TRUE, version BIGINT NOT NULL DEFAULT 0,
 CONSTRAINT ck_coupon_discount CHECK(discount_percent > 0 AND discount_percent <= 100), INDEX idx_coupon_active(active,starts_at,ends_at)
) ENGINE=InnoDB;
CREATE TABLE refund_records (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, payment_id BIGINT NOT NULL, amount DECIMAL(10,2) NOT NULL,
 status VARCHAR(30) NOT NULL, provider_reference VARCHAR(120), reason VARCHAR(500), created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 CONSTRAINT fk_refund_payment FOREIGN KEY(payment_id) REFERENCES payments(id), INDEX idx_refund_status(status,created_at)
) ENGINE=InnoDB;
CREATE TABLE notifications (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL, type VARCHAR(50) NOT NULL,
 title VARCHAR(180) NOT NULL, message VARCHAR(1000) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 created_at DATETIME(6) NOT NULL, read_at DATETIME(6), CONSTRAINT fk_notification_user FOREIGN KEY(user_id) REFERENCES users(id), INDEX idx_notification_user_status(user_id,status,created_at)
) ENGINE=InnoDB;
CREATE TABLE audit_events (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, actor_user_id BIGINT, action VARCHAR(100) NOT NULL,
 target_type VARCHAR(80) NOT NULL, target_id VARCHAR(100), details TEXT, correlation_id VARCHAR(100), created_at DATETIME(6) NOT NULL,
 CONSTRAINT fk_audit_actor FOREIGN KEY(actor_user_id) REFERENCES users(id), INDEX idx_audit_created(created_at), INDEX idx_audit_target(target_type,target_id)
) ENGINE=InnoDB;
CREATE TABLE payment_webhook_events (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, event_id VARCHAR(140) NOT NULL UNIQUE, provider VARCHAR(30) NOT NULL,
 event_type VARCHAR(100) NOT NULL, status VARCHAR(30) NOT NULL, payload_hash CHAR(64) NOT NULL,
 received_at DATETIME(6) NOT NULL, processed_at DATETIME(6), INDEX idx_webhook_received(received_at)
) ENGINE=InnoDB;
