package com.cinebook.auth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface UserRepository extends JpaRepository<UserAccount, Long> {
 Optional<UserAccount> findByEmailIgnoreCase(String email);
 boolean existsByEmailIgnoreCase(String email);
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select u from UserAccount u where lower(u.email)=lower(:email)")
 Optional<UserAccount> findByEmailIgnoreCaseForUpdate(@Param("email") String email);
}
