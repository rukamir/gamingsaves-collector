FROM node:10.16-alpine

ENV NODE_ENV=production
ENV DB_ADDRESS=0.0.0.0
ENV DB_USER=retriever
ENV DB_PASS=password
ENV DB_NAME=game
ENV OBJ_STORAGE_ADDR=ewr1.vultrobjects.com
ENV OBJ_STORAGE_PORT=443
ENV AWS_SECRET_ACCESS_KEY=MwP2v9cmB0SaHx9nZtC3Eu3TapQbJOdEcKNwbtcE
ENV AWS_ACCESS_KEY_ID=4EF38HELTPMHXPZ62PI0

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

USER node

RUN npm install

COPY --chown=node:node . .

RUN npm i

CMD npm run start-nc