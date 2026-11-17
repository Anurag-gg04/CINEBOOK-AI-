package com.cinebook.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;

public interface ShowSeatRepository extends JpaRepository<ShowSeat, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ss from ShowSeat ss join fetch ss.seat where ss.showtime.id=:showId and ss.seat.id in :seatIds order by ss.seat.id")
    List<ShowSeat> lockSelected(@Param("showId") Long showId, @Param("seatIds") List<Long> seatIds);

    @Query("select ss from ShowSeat ss join fetch ss.seat where ss.showtime.id=:showId order by ss.seat.rowLabel,ss.seat.seatNumber")
    List<ShowSeat> mapForShow(@Param("showId") Long showId);

    List<ShowSeat> findAllByHoldId(Long holdId);

    List<ShowSeat> findAllByBookingId(Long bookingId);

    @Query("select count(ss) from ShowSeat ss where ss.showtime.id=:showId and ss.status='BOOKED'")
    long countBooked(@Param("showId") Long showId);

    @Query("select count(ss) from ShowSeat ss where ss.status='HELD' and ss.holdExpiresAt<=:now")
    long countExpiredHeld(@Param("now") Instant now);
}
