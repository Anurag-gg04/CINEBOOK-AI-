package com.cinebook.catalog;
import jakarta.persistence.*;
@Entity @Table(name="screens",uniqueConstraints=@UniqueConstraint(name="uq_screen_theatre_name",columnNames={"theatre_id","name"}))
public class Screen {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="theatre_id",nullable=false) private Theatre theatre;
 @Column(nullable=false,length=80) private String name;
 @Column(name="row_count",nullable=false) private int rowCount;
 @Column(name="column_count",nullable=false) private int columnCount;
 protected Screen(){} public Screen(Theatre theatre,String name,int rows,int cols){this.theatre=theatre;this.name=name;rowCount=rows;columnCount=cols;}
 public Long getId(){return id;}public Theatre getTheatre(){return theatre;}public String getName(){return name;}public int getRowCount(){return rowCount;}public int getColumnCount(){return columnCount;}
}
