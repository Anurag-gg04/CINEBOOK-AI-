
package com.cinebook.booking;

import com.cinebook.catalog.ShowtimeRepository;
import com.cinebook.common.ApiException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SeatRecommendationService {

        private final ShowSeatRepository seats;
        private final ShowtimeRepository shows;

        public SeatRecommendationService(
                        ShowSeatRepository seats,
                        ShowtimeRepository shows) {
                this.seats = seats;
                this.shows = shows;
        }

        public BookingDtos.RecommendationsView recommend(
                        Long showId,
                        BookingDtos.RecommendationRequest request) {

                var show = shows.getFull(showId)
                                .orElseThrow(() -> new ApiException(
                                                404, "SHOW_NOT_FOUND", "Showtime was not found"));

                String text = request.naturalLanguage() == null
                                ? ""
                                : request.naturalLanguage().toLowerCase(Locale.ROOT);

                int count = request.seatCount() == null
                                ? parseCount(text)
                                : request.seatCount();

                if (count < 1 || count > 8) {
                        throw new ApiException(
                                        400, "INVALID_SEAT_COUNT",
                                        "Choose between 1 and 8 seats");
                }

                BigDecimal budget = request.maxBudget() == null
                                ? parseBudget(text)
                                : request.maxBudget();

                if (budget != null && budget.signum() <= 0) {
                        throw new ApiException(
                                        400, "INVALID_BUDGET", "Budget must be positive");
                }

                // FIX: validate the preference before assigning the final variable.
                String normalizedRow = request.rowPreference() == null
                                ? parseRow(text)
                                : request.rowPreference().toUpperCase(Locale.ROOT);

                if (!Set.of("FRONT", "MIDDLE", "REAR").contains(normalizedRow)) {
                        normalizedRow = "MIDDLE";
                }

                final String rowPreference = normalizedRow;

                boolean adjacent = request.adjacent() == null
                                ? !text.contains("not adjacent")
                                : request.adjacent();

                boolean aisle = Boolean.TRUE.equals(request.aisle())
                                || text.contains("aisle");

                boolean accessible = Boolean.TRUE.equals(request.accessibleOnly())
                                || text.contains("accessible");

                Instant now = Instant.now();

                List<ShowSeat> all = seats.mapForShow(showId).stream()
                                .filter(seat -> seat.isEffectivelyAvailable(now))
                                .filter(seat -> !accessible || seat.getSeat().isAccessible())
                                .toList();

                Map<String, List<ShowSeat>> rows = all.stream()
                                .collect(Collectors.groupingBy(
                                                seat -> seat.getSeat().getRowLabel(),
                                                TreeMap::new,
                                                Collectors.toList()));

                int rowCount = show.getScreen().getRowCount();
                List<Candidate> options = new ArrayList<>();

                if (adjacent) {
                        for (List<ShowSeat> rowSeats : rows.values()) {
                                List<ShowSeat> sorted = rowSeats.stream()
                                                .sorted(Comparator.comparingInt(
                                                                seat -> seat.getSeat().getSeatNumber()))
                                                .toList();

                                for (int i = 0; i + count <= sorted.size(); i++) {
                                        List<ShowSeat> group = sorted.subList(i, i + count);
                                        boolean consecutive = true;

                                        for (int j = 1; j < group.size(); j++) {
                                                int previous = group.get(j - 1)
                                                                .getSeat().getSeatNumber();
                                                int current = group.get(j)
                                                                .getSeat().getSeatNumber();

                                                if (current != previous + 1) {
                                                        consecutive = false;
                                                        break;
                                                }
                                        }

                                        if (consecutive) {
                                                add(options, group, budget, rowPreference,
                                                                aisle, rowCount, count);
                                        }
                                }
                        }
                } else {
                        SearchBudget limit = new SearchBudget();

                        for (List<ShowSeat> rowSeats : rows.values()) {
                                List<ShowSeat> sorted = rowSeats.stream()
                                                .sorted(Comparator.comparingInt(
                                                                seat -> seat.getSeat().getSeatNumber()))
                                                .toList();

                                choose(sorted, 0, count, new ArrayList<>(), options,
                                                budget, rowPreference, aisle, rowCount, limit);

                                if (limit.remaining <= 0 || options.size() >= 1000) {
                                        break;
                                }
                        }
                }

                boolean exact = !options.isEmpty();

                // If no combination fits the budget, show alternatives.
                if (options.isEmpty() && budget != null) {
                        if (adjacent) {
                                for (List<ShowSeat> rowSeats : rows.values()) {
                                        List<ShowSeat> sorted = rowSeats.stream()
                                                        .sorted(Comparator.comparingInt(
                                                                        seat -> seat.getSeat().getSeatNumber()))
                                                        .toList();

                                        for (int i = 0; i + count <= sorted.size(); i++) {
                                                add(options, sorted.subList(i, i + count),
                                                                null, rowPreference, aisle, rowCount, count);
                                        }
                                }
                        } else {
                                SearchBudget limit = new SearchBudget();

                                for (List<ShowSeat> rowSeats : rows.values()) {
                                        List<ShowSeat> sorted = rowSeats.stream()
                                                        .sorted(Comparator.comparingInt(
                                                                        seat -> seat.getSeat().getSeatNumber()))
                                                        .toList();

                                        choose(sorted, 0, count, new ArrayList<>(), options,
                                                        null, rowPreference, aisle, rowCount, limit);

                                        if (limit.remaining <= 0 || options.size() >= 1000) {
                                                break;
                                        }
                                }
                        }
                }

                options.sort(Comparator.comparingInt(Candidate::score)
                                .thenComparing(Candidate::total)
                                .thenComparing(candidate -> String.join(",", candidate.labels())));

                List<BookingDtos.Recommendation> result = options.stream()
                                .distinct()
                                .limit(3)
                                .map(candidate -> new BookingDtos.Recommendation(
                                                showId,
                                                candidate.labels(),
                                                candidate.total(),
                                                budget,
                                                budget == null
                                                                || candidate.total().compareTo(budget) <= 0,
                                                candidate.score(),
                                                reasons(candidate, rowPreference,
                                                                aisle, accessible, budget),
                                                exact && (budget == null
                                                                || candidate.total().compareTo(budget) <= 0)))
                                .toList();

                String interpretation = count + " seat(s), "
                                + rowPreference.toLowerCase(Locale.ROOT)
                                + " viewing area"
                                + (adjacent ? ", adjacent" : "")
                                + (aisle ? ", aisle preferred" : "")
                                + (accessible ? ", accessible seats only" : "")
                                + (budget == null ? "" : "; budget ₹" + budget);

                String message = result.isEmpty()
                                ? "No seat combination matches the requested accessibility "
                                                + "and availability constraints. Try a different showtime "
                                                + "or preference."
                                : (!exact
                                                ? "No option fits every preference; showing the closest "
                                                                + "available alternatives."
                                                : "Recommendations use current backend inventory. "
                                                                + "A recommendation is not a reservation; create a hold "
                                                                + "to secure seats.");

                return new BookingDtos.RecommendationsView(
                                result, interpretation, message);
        }

        private record Candidate(
                        List<String> labels,
                        BigDecimal total,
                        int score,
                        List<Long> ids) {
        }

        private static final class SearchBudget {
                private int remaining = 4000;
        }

        private void add(
                        List<Candidate> out,
                        List<ShowSeat> group,
                        BigDecimal budget,
                        String preference,
                        boolean aisle,
                        int rowCount,
                        int count) {

                if (group.size() != count) {
                        return;
                }

                BigDecimal basePrice = group.stream()
                                .map(ShowSeat::getPrice)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal total = basePrice.add(
                                BookingService.convenienceFee(basePrice));

                if (budget != null && total.compareTo(budget) > 0) {
                        return;
                }

                String rowLabel = group.get(0).getSeat().getRowLabel();

                int rowIndex = rowLabel.isEmpty()
                                ? 0
                                : Math.max(0,
                                                rowLabel.toUpperCase(Locale.ROOT).charAt(0) - 'A');

                int targetRow = switch (preference) {
                        case "FRONT" -> 0;
                        case "REAR" -> Math.max(0, rowCount - 1);
                        default -> Math.max(0, (rowCount - 1) / 2);
                };

                int score = Math.abs(rowIndex - targetRow) * 10;

                int minSeat = group.stream()
                                .mapToInt(seat -> seat.getSeat().getSeatNumber())
                                .min()
                                .orElse(1);

                int maxSeat = group.stream()
                                .mapToInt(seat -> seat.getSeat().getSeatNumber())
                                .max()
                                .orElse(1);

                if (aisle) {
                        int lastSeat = group.get(0).getSeat()
                                        .getScreen().getColumnCount();

                        int distanceFromAisle = Math.min(
                                        minSeat - 1, lastSeat - maxSeat);

                        score += Math.max(0, distanceFromAisle) * 3;
                }

                score += group.stream().mapToInt(seat -> switch (seat.getSeat().getType()) {
                        case STANDARD -> 0;
                        case PREMIUM -> 1;
                        case RECLINER -> 2;
                }).sum();

                out.add(new Candidate(
                                group.stream()
                                                .map(seat -> seat.getSeat().getLabel())
                                                .toList(),
                                total,
                                score,
                                group.stream()
                                                .map(seat -> seat.getSeat().getId())
                                                .toList()));
        }

        private void choose(
                        List<ShowSeat> source,
                        int index,
                        int left,
                        List<ShowSeat> picked,
                        List<Candidate> out,
                        BigDecimal budget,
                        String rowPreference,
                        boolean aisle,
                        int rowCount,
                        SearchBudget limit) {

                if (limit.remaining-- <= 0 || out.size() >= 1000) {
                        return;
                }

                if (left == 0) {
                        add(out, picked, budget, rowPreference,
                                        aisle, rowCount, picked.size());
                        return;
                }

                if (index >= source.size() || source.size() - index < left) {
                        return;
                }

                for (int i = index; i <= source.size() - left
                                && limit.remaining > 0
                                && out.size() < 1000; i++) {

                        picked.add(source.get(i));

                        choose(source, i + 1, left - 1, picked, out,
                                        budget, rowPreference, aisle, rowCount, limit);

                        picked.remove(picked.size() - 1);
                }
        }

        private List<String> reasons(
                        Candidate candidate,
                        String preference,
                        boolean aisle,
                        boolean accessible,
                        BigDecimal budget) {

                List<String> reasons = new ArrayList<>();

                reasons.add("Seat combination is available right now");
                reasons.add("Viewing row matches your "
                                + preference.toLowerCase(Locale.ROOT) + " preference");

                if (aisle) {
                        reasons.add("Closest candidate to an aisle");
                }

                if (accessible) {
                        reasons.add("All recommended seats are marked accessible");
                }

                reasons.add(budget == null
                                ? "Price shown includes the 5% development convenience fee"
                                : candidate.total().compareTo(budget) <= 0
                                                ? "Within your total budget"
                                                : "Closest available alternative exceeds your budget");

                return reasons;
        }

        private int parseCount(String text) {
                Matcher matcher = Pattern
                                .compile("(\\d+)\\s*(?:seat|ticket)")
                                .matcher(text);

                if (matcher.find()) {
                        try {
                                return Math.min(8, Integer.parseInt(matcher.group(1)));
                        } catch (NumberFormatException ignored) {
                                return 8;
                        }
                }

                if (text.contains("three seats"))
                        return 3;
                if (text.contains("four seats"))
                        return 4;
                if (text.contains("two seats"))
                        return 2;

                return 2;
        }

        private BigDecimal parseBudget(String text) {
                Matcher matcher = Pattern.compile(
                                "(?:under|below|budget(?:\\s+(?:is|of))?|less than)"
                                                + "\\s*(?:₹\\s*|rs\\.?\\s*)?([\\d,]+)")
                                .matcher(text);

                if (matcher.find()) {
                        try {
                                return new BigDecimal(
                                                matcher.group(1).replace(",", ""));
                        } catch (NumberFormatException ignored) {
                                return null;
                        }
                }

                return null;
        }

        private String parseRow(String text) {
                if (text.contains("front"))
                        return "FRONT";
                if (text.contains("back") || text.contains("rear"))
                        return "REAR";
                return "MIDDLE";
        }
}
