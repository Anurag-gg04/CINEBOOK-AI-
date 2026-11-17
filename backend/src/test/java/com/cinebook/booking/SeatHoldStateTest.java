package com.cinebook.booking;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

class SeatHoldStateTest {
    @Test
    void anExpiredActiveHoldIsNotActive() {
        SeatHold hold = new SeatHold("hold-token", null, null, Instant.now().minusSeconds(1), "idem-1");
        assertFalse(hold.isActiveNow());
    }

    @Test
    void aCancelledHoldCannotBecomeActiveThroughTheActiveNowCheck() {
        SeatHold hold = new SeatHold("hold-token", null, null, Instant.now().plusSeconds(300), "idem-2");
        hold.setStatus(SeatHold.State.CANCELLED);
        assertFalse(hold.isActiveNow());
    }
}
