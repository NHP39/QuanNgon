# syntax=docker/dockerfile:1

# Build the backend; the frontend is deployed separately.
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /build/backend
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY src/main/ ./src/main/
RUN mvn -B -ntp -Dmaven.test.skip=true package

# Run only Java and the packaged application as an unprivileged user.
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app
RUN groupadd --system app \
    && useradd --system --gid app --home-dir /app --no-create-home app
COPY --from=backend-build --chown=app:app /build/backend/target/*.jar /app/app.jar
USER app:app
ENV APP_COOKIE_SECURE=true \
    APP_COOKIE_SAME_SITE=None \
    APP_REQUIRE_HTTPS=true \
    FORWARD_HEADERS_STRATEGY=framework
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=65.0", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/app.jar"]
