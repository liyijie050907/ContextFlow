FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /app/private-data && chown node:node /app/private-data
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
