package com.cinebook.catalog;
import com.cinebook.auth.UserAccount; import jakarta.persistence.*;
@Entity @Table(name="theatres",indexes=@Index(name="idx_theatres_city",columnList="city"))
public class Theatre {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,length=160) private String name;
 @Column(nullable=false,length=100) private String city;
 @Column(nullable=false,length=350) private String address;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="partner_owner_id") private UserAccount partnerOwner;
 @Column(nullable=false) private boolean active=true;
 protected Theatre(){} public Theatre(String name,String city,String address,UserAccount owner){this.name=name;this.city=city;this.address=address;partnerOwner=owner;}
 public Long getId(){return id;}public String getName(){return name;}public String getCity(){return city;}public String getAddress(){return address;}public UserAccount getPartnerOwner(){return partnerOwner;}public boolean isActive(){return active;}
}
