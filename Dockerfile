FROM botfactory/docker-for-terremotibot:8.10.0
ENV REFRESHED_AT 2018-04-14
LABEL mantainer="Francesco Tonini <francescoantoniotonini@gmail.com>"

COPY . src/
RUN echo "Move to /src and install app dependencies"  \
	&& cd /src \
	&& npm install --production \
	&& echo "Done :)"

# Expose ports to host
EXPOSE 5000

# Se envs
ENV NODE_ENV=production

# Start
CMD ["node", "/src/index.js"]
