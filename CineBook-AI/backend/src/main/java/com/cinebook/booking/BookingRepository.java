package com.cinebook.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Booking> findByIdAndUserId(Long id, Long userId);

    Optional<Booking> findByHoldId(Long holdId);

    long countByStatus(Booking.State status);

    @Query("select count(b) from Booking b where b.status='CONFIRMED' and b.showtime.screen.theatre.partnerOwner.id=:ownerId")
    long countConfirmedForPartner(@Param("ownerId") Long ownerId);

    @Query("select coalesce(sum(b.totalAmount),0) from Booking b where b.status='CONFIRMED' and b.showtime.screen.theatre.partnerOwner.id=:ownerId")
    java.math.BigDecimal revenueForPartner(@Param("ownerId") Long ownerId);

    @Query("select coalesce(sum(b.totalAmount),0) from Booking b where b.status='CONFIRMED'")
    java.math.BigDecimal confirmedRevenue();

    @Query("select count(b) from Booking b where b.user.id=:userId and b.status='CONFIRMED'")
    long countConfirmedForUser(@Param("userId") Long userId);
}
