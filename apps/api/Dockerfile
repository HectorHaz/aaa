FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm install --workspaces
COPY . .
WORKDIR /app/apps/api
CMD ["npm","run","dev"]
