package com.cinebook.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SeatHoldRepository extends JpaRepository<SeatHold, Long> {
    Optional<SeatHold> findByUserIdAndIdempotencyKey(Long userId, String key);

    Optional<SeatHold> findByToken(String token);

    List<SeatHold> findAllByStatusAndExpiresAtBefore(SeatHold.State status, Instant now);
}
