FROM botfactory/docker-for-terremotibot:8.16.0
LABEL mantainer="Matteo Contrini <matteo@contrini.it>"

# Move to /src folder
WORKDIR /src

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the app files
COPY . .

# Start
CMD ["npm", "test"]
