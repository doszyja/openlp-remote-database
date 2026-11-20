# Self-hosted LanguageTool when Docker Hub pull fails (same API as meyay/languagetool).
FROM node:22-alpine

RUN apk add --no-cache openjdk17-jre-headless wget unzip tini

WORKDIR /opt/languagetool

ARG LT_VERSION=6.5
RUN wget -q -O /tmp/lt.zip "https://downloads.languagetool.org/LanguageTool-${LT_VERSION}.zip" \
  && unzip -q /tmp/lt.zip -d /opt \
  && mv /opt/LanguageTool-${LT_VERSION}/* /opt/languagetool/ \
  && rm -rf /tmp/lt.zip "/opt/LanguageTool-${LT_VERSION}"

RUN touch /opt/languagetool/server.properties

EXPOSE 8081

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["java", "-Xms256m", "-Xmx1536m", "-cp", "languagetool-server.jar", "org.languagetool.server.HTTPServer", "--config", "server.properties", "--public", "--port", "8081", "--allow-origin", "*"]