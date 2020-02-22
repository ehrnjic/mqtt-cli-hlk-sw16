FROM node:13.8.0-alpine3.11
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY ./app.js ./
RUN mkdir -p config
COPY ./config/default.json ./config
EXPOSE 9876
CMD [ "npm", "start" ]