package com.cinebook.events;
import org.springframework.amqp.core.*; import org.springframework.context.annotation.Bean; import org.springframework.context.annotation.Configuration; import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
@Configuration @ConditionalOnProperty(name="app.messaging.enabled",havingValue="true")
public class RabbitEventConfig {
 @Bean DirectExchange cinebookExchange(){return new DirectExchange("cinebook.events",true,false);}
 @Bean Queue bookingEventsQueue(){return QueueBuilder.durable("cinebook.booking.events").withArgument("x-dead-letter-exchange","cinebook.events.dlx").build();}
 @Bean DirectExchange deadLetterExchange(){return new DirectExchange("cinebook.events.dlx",true,false);}
 @Bean Queue deadLetterQueue(){return QueueBuilder.durable("cinebook.booking.events.dlq").build();}
 @Bean Binding bookingBinding(Queue bookingEventsQueue,DirectExchange cinebookExchange){return BindingBuilder.bind(bookingEventsQueue).to(cinebookExchange).with("booking.#");}
 @Bean Binding deadLetterBinding(Queue deadLetterQueue,DirectExchange deadLetterExchange){return BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange).with("#");}
}
