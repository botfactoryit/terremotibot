FROM botfactory/docker-for-terremotibot:8.16.0
LABEL mantainer="Francesco Tonini <francescoantoniotonini@gmail.com>"
ENV REFRESHED_AT 2019-04-27
ENV NODE_ENV=production

# Move to /src
WORKDIR /src

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the app files
COPY . .

# Expose ports to host
EXPOSE 5000

# Start
CMD ["node", "/src/index.js"]
