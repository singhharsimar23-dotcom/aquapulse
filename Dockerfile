FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY aquapulse-common/pom.xml aquapulse-common/
COPY verify-service/pom.xml verify-service/
COPY allocation-service/pom.xml allocation-service/
COPY guarantee-service/pom.xml guarantee-service/
COPY copilot-service/pom.xml copilot-service/
COPY api-gateway/pom.xml api-gateway/
RUN mvn dependency:go-offline -q 2>/dev/null || true
COPY aquapulse-common/src aquapulse-common/src
COPY verify-service/src verify-service/src
COPY allocation-service/src allocation-service/src
COPY guarantee-service/src guarantee-service/src
COPY copilot-service/src copilot-service/src
COPY api-gateway/src api-gateway/src
RUN mvn clean package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine AS verify
WORKDIR /app
COPY --from=build /app/verify-service/target/verify-service-*.jar app.jar
EXPOSE 8081
CMD ["java","-Xmx450m","-jar","app.jar"]

FROM eclipse-temurin:21-jre-alpine AS allocation
WORKDIR /app
COPY --from=build /app/allocation-service/target/allocation-service-*.jar app.jar
EXPOSE 8082
CMD ["java","-Xmx450m","-jar","app.jar"]

FROM eclipse-temurin:21-jre-alpine AS guarantee
WORKDIR /app
COPY --from=build /app/guarantee-service/target/guarantee-service-*.jar app.jar
EXPOSE 8083
CMD ["java","-Xmx450m","-jar","app.jar"]

FROM eclipse-temurin:21-jre-alpine AS copilot
WORKDIR /app
COPY --from=build /app/copilot-service/target/copilot-service-*.jar app.jar
EXPOSE 8084
CMD ["java","-Xmx450m","-jar","app.jar"]

FROM eclipse-temurin:21-jre-alpine AS gateway
WORKDIR /app
COPY --from=build /app/api-gateway/target/api-gateway-*.jar app.jar
EXPOSE 8080
CMD ["java","-Xmx450m","-jar","app.jar"]
