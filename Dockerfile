FROM node:10
WORKDIR /usr/src/app
COPY pack*.json ./
RUN npm install
COPY . .
EXPOSE 8888
CMD ["node","index.js"]
