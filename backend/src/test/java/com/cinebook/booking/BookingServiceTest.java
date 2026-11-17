package com.cinebook.booking;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.assertEquals;

class BookingServiceTest {
    @Test
    void convenienceFeeRoundsToTwoDecimalsUsingHalfUp() {
        assertEquals(new BigDecimal("12.35"), BookingService.convenienceFee(new BigDecimal("246.90")));
        assertEquals(new BigDecimal("0.01"), BookingService.convenienceFee(new BigDecimal("0.10")));
    }

    @Test
    void zeroSubtotalHasZeroConvenienceFee() {
        assertEquals(new BigDecimal("0.00"), BookingService.convenienceFee(BigDecimal.ZERO));
    }
}
