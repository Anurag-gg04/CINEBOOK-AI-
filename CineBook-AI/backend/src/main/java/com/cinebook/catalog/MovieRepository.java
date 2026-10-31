package com.cinebook.catalog;
import org.springframework.data.domain.Page; import org.springframework.data.domain.Pageable; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.data.jpa.repository.Query; import org.springframework.data.repository.query.Param; import java.util.Optional;
public interface MovieRepository extends JpaRepository<Movie,Long>{
 @Query("select m from Movie m where m.active=true and (:q is null or lower(m.title) like lower(concat('%',:q,'%')) or lower(m.synopsis) like lower(concat('%',:q,'%'))) and (:language is null or lower(m.language)=lower(:language)) and (:genre is null or lower(m.genres) like lower(concat('%',:genre,'%'))) ") Page<Movie> search(@Param("q") String q,@Param("language") String language,@Param("genre") String genre,Pageable pageable);
 Optional<Movie> findByIdAndActiveTrue(Long id);
}
