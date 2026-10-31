package com.cinebook.catalog;
import jakarta.persistence.*;
@Entity @Table(name="seats",uniqueConstraints=@UniqueConstraint(name="uq_seat_screen_row_number",columnNames={"screen_id","row_label","seat_number"}),indexes=@Index(name="idx_seats_screen",columnList="screen_id"))
public class Seat {
 public enum Type { STANDARD, PREMIUM, RECLINER }
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="screen_id",nullable=false) private Screen screen;
 @Column(name="row_label",nullable=false,length=5) private String rowLabel;
 @Column(name="seat_number",nullable=false) private int seatNumber;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Type type=Type.STANDARD;
 @Column(name="is_accessible",nullable=false) private boolean accessible=false;
 protected Seat(){} public Seat(Screen screen,String row,int number,Type type,boolean accessible){this.screen=screen;rowLabel=row;seatNumber=number;this.type=type;this.accessible=accessible;}
 public Long getId(){return id;}public Screen getScreen(){return screen;}public String getRowLabel(){return rowLabel;}public int getSeatNumber(){return seatNumber;}public Type getType(){return type;}public boolean isAccessible(){return accessible;} public String getLabel(){return rowLabel+seatNumber;}
}
