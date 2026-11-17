package com.cinebook.catalog;
import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.data.jpa.repository.Query; import org.springframework.data.repository.query.Param; import java.time.Instant; import java.util.List; import java.util.Optional;
public interface ShowtimeRepository extends JpaRepository<Showtime,Long>{
 @Query("select s from Showtime s join fetch s.movie m join fetch s.screen sc join fetch sc.theatre t where s.startsAt>=:from and s.status='SCHEDULED' and (:movieId is null or m.id=:movieId) and (:city is null or lower(t.city)=lower(:city)) order by s.startsAt") List<Showtime> browse(@Param("from") Instant from,@Param("movieId") Long movieId,@Param("city") String city);
 @Query("select s from Showtime s join fetch s.movie join fetch s.screen sc join fetch sc.theatre where s.id=:id") Optional<Showtime> getFull(@Param("id") Long id);
 @Query("select s from Showtime s join fetch s.movie join fetch s.screen sc join fetch sc.theatre t where lower(t.partnerOwner.email)=lower(:email) order by s.startsAt desc") List<Showtime> findPartnerShows(@Param("email") String email);
}
