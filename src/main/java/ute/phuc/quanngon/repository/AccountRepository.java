package ute.phuc.quanngon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ute.phuc.quanngon.entity.Account;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByEmail(String email);
    boolean existsByEmail(String email);

    // Admin: count active account
    @Query(
    """
        select count(a.active) as totalAccounts, 
            count(case when a.active = true then 1 end) as activeAccounts
        from Account a
        where a.role = 'USER'
    """
    )
    AccountStatusCount countAccountActive();

    @Query(value = """
            select cast(a.created_at at time zone :timeZone as date)
                       as "registrationDate",
                   count(*) as "registrationCount"
            from accounts a
            where a.role = 'USER'
              and a.email_verified = true
              and a.created_at >= :startTime
              and a.created_at < :endTimeExclusive
            group by "registrationDate"
            order by "registrationDate"
            """, nativeQuery = true)
    List<DailyRegistrationCount> countRegistrationsByDate(
            @Param("startTime") Instant startTime,
            @Param("endTimeExclusive") Instant endTimeExclusive,
            @Param("timeZone") String timeZone);
}
