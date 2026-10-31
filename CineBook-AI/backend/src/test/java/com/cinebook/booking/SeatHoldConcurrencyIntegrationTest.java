package com.cinebook.booking;

import com.cinebook.CineBookApplication;
import com.cinebook.catalog.ShowtimeRepository;
import com.cinebook.common.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(classes = CineBookApplication.class)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:cinebook_booking_test;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.cache.type=none",
        "app.redis.enabled=false",
        "app.messaging.enabled=false",
        "app.booking.hold-minutes=5"
})
class SeatHoldConcurrencyIntegrationTest {
    @Autowired BookingService bookingService;
    @Autowired ShowtimeRepository showtimes;
    @Autowired ShowSeatRepository inventory;

    @Test
    void twoCustomersCannotHoldTheSameShowSeat() throws Exception {
        var show = showtimes.browse(Instant.now(), null, null).stream().findFirst().orElseThrow();
        var seat = inventory.mapForShow(show.getId()).stream()
                .filter(s -> s.isEffectivelyAvailable(Instant.now())).findFirst().orElseThrow();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> customerA = pool.submit(() -> attempt("customer@cinebook.local", show.getId(), seat.getSeat().getId(), "race-a", ready, start));
            Future<Boolean> customerB = pool.submit(() -> attempt("partner@cinebook.local", show.getId(), seat.getSeat().getId(), "race-b", ready, start));
            ready.await();
            start.countDown();
            int successes = (customerA.get() ? 1 : 0) + (customerB.get() ? 1 : 0);
            assertEquals(1, successes, "exactly one customer must acquire the inventory row");
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void aRepeatedHoldRequestWithTheSameIdempotencyKeyReusesTheOriginalHold() {
        var show = showtimes.browse(Instant.now(), null, null).stream().findFirst().orElseThrow();
        var seat = inventory.mapForShow(show.getId()).stream()
                .filter(s -> s.isEffectivelyAvailable(Instant.now())).findFirst().orElseThrow();
        var request = new BookingDtos.HoldRequest(List.of(seat.getSeat().getId()));
        var first = bookingService.createHold("customer@cinebook.local", show.getId(), request, "duplicate-hold-test", "test-idempotency");
        var retry = bookingService.createHold("customer@cinebook.local", show.getId(), request, "duplicate-hold-test", "test-idempotency");
        assertEquals(first.token(), retry.token(), "an idempotent retry should return the original hold");
    }

    private boolean attempt(String email, Long showId, Long seatId, String key,
                            CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown();
        start.await();
        try {
            bookingService.createHold(email, showId, new BookingDtos.HoldRequest(List.of(seatId)), key, "test-race");
            return true;
        } catch (ApiException conflict) {
            if (conflict.getStatus() != 409) throw conflict;
            return false;
        }
    }
}
