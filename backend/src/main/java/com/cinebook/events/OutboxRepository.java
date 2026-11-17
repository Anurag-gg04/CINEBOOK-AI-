package com.cinebook.events;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface OutboxRepository extends JpaRepository<OutboxEvent,Long>{List<OutboxEvent> findTop50ByStateOrderByCreatedAtAsc(String state);long countByState(String state);}
