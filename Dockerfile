FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Set environment to production
ENV NODE_ENV production

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "dist/server/index.js"]