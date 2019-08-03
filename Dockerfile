FROM node:10.16-alpine

USER node

COPY . /home/node/app
WORKDIR /home/node/app

CMD npm start