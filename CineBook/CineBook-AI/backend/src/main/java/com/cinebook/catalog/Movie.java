package com.cinebook.catalog;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
@Entity @Table(name="movies", indexes={@Index(name="idx_movies_active_title",columnList="active,title"),@Index(name="idx_movies_release",columnList="release_date")})
public class Movie {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,length=180) private String title;
 @Column(nullable=false,length=3000) private String synopsis;
 @Column(name="poster_url",length=700) private String posterUrl;
 @Column(name="backdrop_url",length=700) private String backdropUrl;
 @Column(name="duration_minutes",nullable=false) private int durationMinutes;
 @Column(nullable=false,length=80) private String language;
 @Column(nullable=false,length=300) private String genres;
 @Column(name="content_rating",nullable=false,length=20) private String contentRating="UA";
 @Column(name="release_date") private LocalDate releaseDate;
 @Column(nullable=false) private double rating;
 @Column(nullable=false) private boolean active=true;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 protected Movie(){}
 public Movie(String title,String synopsis,String posterUrl,String backdropUrl,int durationMinutes,String language,String genres,String contentRating,LocalDate releaseDate,double rating){this.title=title;this.synopsis=synopsis;this.posterUrl=posterUrl;this.backdropUrl=backdropUrl;this.durationMinutes=durationMinutes;this.language=language;this.genres=genres;this.contentRating=contentRating;this.releaseDate=releaseDate;this.rating=rating;}
 public Long getId(){return id;} public String getTitle(){return title;} public String getSynopsis(){return synopsis;} public String getPosterUrl(){return posterUrl;} public String getBackdropUrl(){return backdropUrl;} public int getDurationMinutes(){return durationMinutes;} public String getLanguage(){return language;} public String getGenres(){return genres;} public List<String> getGenreList(){return Arrays.stream(genres.split(",")).map(String::trim).filter(s->!s.isBlank()).toList();} public String getContentRating(){return contentRating;} public LocalDate getReleaseDate(){return releaseDate;} public double getRating(){return rating;} public boolean isActive(){return active;}
 public void setActive(boolean v){active=v;}
}
