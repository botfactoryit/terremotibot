FROM botfactory/docker-graphicsmagick:43793
MAINTAINER Francesco Tonini <francescoantoniotonini@gmail.com>
ENV REFRESHED_AT 2017-02-11

# Install odejs
RUN apk add --update nodejs=6.9.2-r1

# Cleanup
RUN rm -rf /var/lib/apt/lists/*

# Install app dependencies
COPY package.json /src/package.json
RUN npm set loglevel info
RUN cd /src; npm install --production

# Copy app bundle
COPY . /src

# Expose ports to host
EXPOSE 5000

# Set envs
ENV NODE_ENV=production

# Start
CMD ["node", "/src/index.js"]
