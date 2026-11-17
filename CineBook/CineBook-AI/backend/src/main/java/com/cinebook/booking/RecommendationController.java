package com.cinebook.booking;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shows/{showId}/recommendations")
public class RecommendationController {
    private final SeatRecommendationService service;

    public RecommendationController(SeatRecommendationService s) {
        service = s;
    }

    @PostMapping
    public BookingDtos.RecommendationsView recommend(@PathVariable Long showId,
            @Valid @RequestBody BookingDtos.RecommendationRequest r) {
        return service.recommend(showId, r);
    }
}
