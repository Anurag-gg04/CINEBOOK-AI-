package com.cinebook.booking;

import com.cinebook.catalog.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeatRecommendationServiceTest {
    @Mock ShowSeatRepository seats;
    @Mock ShowtimeRepository shows;
    @InjectMocks SeatRecommendationService service;

    private final List<ShowSeat> inventory = new ArrayList<>();

    @BeforeEach
    void setup() {
        inventory.clear();
        Theatre theatre = new Theatre("Test Cinema", "Dehradun", "Test address", null);
        Screen screen = new Screen(theatre, "Screen 1", 8, 10);
        Movie movie = new Movie("Test Film", "Synopsis", null, null, 120, "Hindi", "Drama", "U",
                LocalDate.now(), 8.0);
        Showtime show = new Showtime(movie, screen, Instant.now().plusSeconds(7200), Instant.now().plusSeconds(14400), new BigDecimal("200.00"));
        when(shows.getFull(1L)).thenReturn(Optional.of(show));
        for (int seat = 1; seat <= 4; seat++) {
            Seat model = new Seat(screen, "D", seat, Seat.Type.STANDARD, seat == 1);
            inventory.add(new ShowSeat(show, model, new BigDecimal("200.00")));
        }
        when(seats.mapForShow(1L)).thenAnswer(invocation -> inventory);
    }

    @Test
    void recommendsAdjacentSeatsDeterministicallyFromAvailableInventory() {
        var result = service.recommend(1L, new BookingDtos.RecommendationRequest(2, null, "MIDDLE", true, false, false, null));
        assertFalse(result.recommendations().isEmpty());
        assertEquals(List.of("D1", "D2"), result.recommendations().get(0).seats());
        assertTrue(result.recommendations().get(0).reasons().stream().anyMatch(s -> s.contains("available right now")));
    }

    @Test
    void accessibilityPreferenceOnlyReturnsSeatsMarkedAccessible() {
        var result = service.recommend(1L, new BookingDtos.RecommendationRequest(2, null, "MIDDLE", true, false, true, null));
        assertTrue(result.recommendations().isEmpty());
        assertTrue(result.message().contains("No seat combination"));
    }

    @Test
    void returnsOutOfBudgetAlternativesRatherThanInventingASeatOrPrice() {
        var result = service.recommend(1L, new BookingDtos.RecommendationRequest(2, new BigDecimal("100.00"), "MIDDLE", true, false, false, null));
        assertFalse(result.recommendations().isEmpty());
        assertFalse(result.recommendations().get(0).withinBudget());
        assertFalse(result.recommendations().get(0).exactMatch());
        assertEquals(new BigDecimal("420.00"), result.recommendations().get(0).total());
    }
}
