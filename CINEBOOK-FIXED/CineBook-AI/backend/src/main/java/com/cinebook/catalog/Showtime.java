package com.cinebook.catalog;
import jakarta.persistence.*; import java.time.Instant; import java.math.BigDecimal;
@Entity @Table(name="showtimes",indexes={@Index(name="idx_shows_start",columnList="starts_at"),@Index(name="idx_shows_movie_start",columnList="movie_id,starts_at")})
public class Showtime {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="movie_id",nullable=false) private Movie movie;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="screen_id",nullable=false) private Screen screen;
 @Column(name="starts_at",nullable=false) private Instant startsAt;
 @Column(name="ends_at",nullable=false) private Instant endsAt;
 @Column(name="base_price",nullable=false,precision=10,scale=2) private BigDecimal basePrice;
 @Column(nullable=false,length=20) private String status="SCHEDULED";
 protected Showtime(){} public Showtime(Movie movie,Screen screen,Instant start,Instant end,BigDecimal price){this.movie=movie;this.screen=screen;startsAt=start;endsAt=end;basePrice=price;}
 public Long getId(){return id;}public Movie getMovie(){return movie;}public Screen getScreen(){return screen;}public Instant getStartsAt(){return startsAt;}public Instant getEndsAt(){return endsAt;}public BigDecimal getBasePrice(){return basePrice;}public String getStatus(){return status;}public void setStatus(String s){status=s;}
}
