FROM certbot/certbot:latest

RUN apk add --no-cache docker-cli

COPY renew-loop.sh /renew-loop.sh
RUN chmod +x /renew-loop.sh

ENTRYPOINT ["/renew-loop.sh"]
