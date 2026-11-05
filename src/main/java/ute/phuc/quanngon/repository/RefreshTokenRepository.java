package ute.phuc.quanngon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ute.phuc.quanngon.entity.RefreshToken;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByRefreshToken(String refreshToken);

    @Modifying
    @Query("""
        delete from RefreshToken token
        where token.account.id = :accountId
        """)
    int deleteByAccountId(@Param("accountId") Long accountId);
}
