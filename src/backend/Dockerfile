FROM node:24-alpine

WORKDIR /app

COPY requirements-pdf.txt ./
RUN apk add --no-cache python3 py3-pip \
  && pip3 install --break-system-packages -r requirements-pdf.txt

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
