package com.cinebook.auth;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface OAuthLoginCodeRepository extends JpaRepository<OAuthLoginCode, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from OAuthLoginCode c where c.codeHash = :hash")
    Optional<OAuthLoginCode> findForUpdate(@Param("hash") String hash);
}
