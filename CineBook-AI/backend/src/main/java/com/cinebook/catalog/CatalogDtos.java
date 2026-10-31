package com.cinebook.catalog;
import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate; import java.util.List;
public final class CatalogDtos {private CatalogDtos(){}
 public record MovieView(Long id,String title,String synopsis,String posterUrl,String backdropUrl,int durationMinutes,String language,List<String> genres,String contentRating,LocalDate releaseDate,double rating){}
 public record ShowtimeView(Long id,Long movieId,String movieTitle,String moviePoster,String theatreName,String city,String address,String screenName,Instant startsAt,Instant endsAt,BigDecimal startingPrice,int rows,int columns){}
 public record TheatreView(Long id,String name,String city,String address){}
 public record SeatView(Long id,String label,String row,int number,String type,boolean accessible,String status,BigDecimal price,Instant holdExpiresAt){}
 public static MovieView movie(Movie m){return new MovieView(m.getId(),m.getTitle(),m.getSynopsis(),m.getPosterUrl(),m.getBackdropUrl(),m.getDurationMinutes(),m.getLanguage(),m.getGenreList(),m.getContentRating(),m.getReleaseDate(),m.getRating());}
 public static ShowtimeView show(Showtime s){return new ShowtimeView(s.getId(),s.getMovie().getId(),s.getMovie().getTitle(),s.getMovie().getPosterUrl(),s.getScreen().getTheatre().getName(),s.getScreen().getTheatre().getCity(),s.getScreen().getTheatre().getAddress(),s.getScreen().getName(),s.getStartsAt(),s.getEndsAt(),s.getBasePrice(),s.getScreen().getRowCount(),s.getScreen().getColumnCount());}
}
