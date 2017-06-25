FROM botfactory/docker-graphicsmagick:43793
MAINTAINER Francesco Tonini <francescoantoniotonini@gmail.com>
ENV REFRESHED_AT 2017-06-25

COPY . src/
RUN echo "Install nodejs + set npm loglevel" \
	&& apk add --update nodejs \
	&& npm set loglevel info \
	&& echo "Move to /src and install app dependencies"  \
	&& cd /src \
	&& npm install --production \
	&& echo "Done :)"

# Expose ports to host
EXPOSE 5000

# Se envs
ENV NODE_ENV=production

# Start
CMD ["node", "/src/index.js"]
