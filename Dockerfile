FROM node:10.16-alpine

RUN npm i pino-pretty -g
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app


USER node


WORKDIR /home/node/app
COPY . /home/node/app


RUN npm i

CMD npm start