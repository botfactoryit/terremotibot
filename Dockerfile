FROM botfactory/docker-for-terremotibot:8.10.0
LABEL mantainer="Francesco Tonini <francescoantoniotonini@gmail.com>"
ENV REFRESHED_AT 2018-05-13
ENV NODE_ENV=production

WORKDIR /src
COPY package.json yarn.lock ./
RUN yarn install --production
COPY . .

# Expose ports to host
EXPOSE 5000

# Start
CMD ["node", "/src/index.js"]
