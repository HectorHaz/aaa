FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm install --workspaces
COPY . .
WORKDIR /app/apps/web
CMD ["npm","run","dev","--","--host","0.0.0.0"]
