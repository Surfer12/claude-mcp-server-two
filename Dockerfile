# Claude MCP Server Dockerfile

# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Install dependencies
RUN npm install

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]