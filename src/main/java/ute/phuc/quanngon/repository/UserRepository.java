package ute.phuc.quanngon.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ute.phuc.quanngon.entity.User;
import ute.phuc.quanngon.enums.Role;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @Query("SELECT u FROM User u JOIN FETCH u.account WHERE u.account.email = :email")
    Optional<User> findByAccountEmail(@Param("email") String email);

    //Admin: filter and search USERS
    @Query(
   """
        select u
        from User u join fetch u.account
        where u.account.role = 'USER'
           and (:keyword = '' or (lower(cast(function('unaccent', u.fullName) as String))
                                  like concat(concat('%', lower(cast(function('unaccent', :keyword) as String))),'%'))
                              or (lower(u.account.email) like concat(concat('%',lower(:keyword)), '%')))
           and ((:active is null) or (:active = u.account.active))
   """
    )
    Page<User> searchUsers(
            @Param("keyword") String keyword,
            @Param("active") Boolean active,
            Pageable pageable
    );

}
