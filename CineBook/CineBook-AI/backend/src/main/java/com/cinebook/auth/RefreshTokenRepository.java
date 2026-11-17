package com.cinebook.auth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface RefreshTokenRepository extends JpaRepository<RefreshToken,Long>{
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select r from RefreshToken r where r.tokenHash=:hash")
 Optional<RefreshToken> findByTokenHash(@Param("hash") String tokenHash);
}
