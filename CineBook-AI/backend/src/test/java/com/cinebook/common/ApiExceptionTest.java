package com.cinebook.common;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ApiExceptionTest {
    @Test
    void retainsHttpStatusCodeAndStableMachineCode() {
        ApiException exception = new ApiException(409, "SEAT_UNAVAILABLE", "Seat already taken");
        assertEquals(409, exception.getStatus());
        assertEquals("SEAT_UNAVAILABLE", exception.getCode());
        assertEquals("Seat already taken", exception.getMessage());
    }
}
