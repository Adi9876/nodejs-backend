# Social Media Microservice Platform

A scalable, distributed social media platform built with Node.js using microservices architecture. This project demonstrates modern backend engineering practices including service decomposition, event-driven communication, caching strategies, and API gateway patterns.

![Architecture Diagram](image.png)

## 🏗️ Architecture Overview

This project follows a **microservices architecture** pattern with the following components:

- **API Gateway**: Single entry point for all client requests
- **Identity Service**: User authentication and authorization
- **Post Service**: Post creation, retrieval, and management
- **Media Service**: File upload and media management
- **Search Service**: Full-text search functionality for posts

### Communication Patterns

- **Synchronous**: HTTP/REST API calls through the API Gateway
- **Asynchronous**: Event-driven communication via RabbitMQ for inter-service messaging
- **Caching**: Redis for session management, rate limiting, and response caching

## 📦 Services

### 1. API Gateway (`api-gateway`)
**Port**: 3000

The central entry point that handles:
- Request routing and proxying to appropriate microservices
- Authentication middleware (JWT validation)
- Rate limiting (50 requests per 15 minutes per IP)
- Request/response logging
- Security headers (Helmet)
- CORS configuration

**Routes**:
- `/v1/auth/*` → Proxies to Identity Service
- `/v1/posts/*` → Proxies to Post Service (requires authentication)
- `/v1/media/*` → Proxies to Media Service (requires authentication)
- `/v1/search/*` → Proxies to Search Service (requires authentication)

### 2. Identity Service (`identity-service`)
**Port**: 3001

Handles user authentication and authorization:
- User registration with email/username validation
- User login with password hashing (Argon2)
- JWT token generation (access token + refresh token)
- Token refresh mechanism
- User logout with token invalidation
- Rate limiting for sensitive endpoints

**Endpoints**:
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout user

### 3. Post Service (`post-service`)
**Port**: 3002

Manages social media posts:
- Create posts with content and media references
- Retrieve posts with pagination
- Get individual post details
- Delete posts (with ownership validation)
- Redis caching for improved performance
- Event publishing for post lifecycle (created/deleted)

**Endpoints**:
- `POST /api/posts/create-post` - Create a new post
- `GET /api/posts/all-posts` - Get all posts (paginated)
- `GET /api/posts/:id` - Get post by ID
- `DELETE /api/posts/:id` - Delete a post

**Features**:
- Pagination support (page & limit query parameters)
- Redis caching (5 minutes for post lists, 10 minutes for individual posts)
- Automatic cache invalidation on create/delete
- Event-driven architecture (publishes `post.created` and `post.deleted` events)

### 4. Media Service (`media-service`)
**Port**: 3003

Handles media file uploads and management:
- File upload to Cloudinary (image hosting)
- Media metadata storage in MongoDB
- File size validation (max 5MB)
- Event listener for post deletion (cleans up orphaned media)

**Endpoints**:
- `POST /api/media/upload` - Upload a media file
- `GET /api/media/get` - Get all media files

**Features**:
- Multer for file handling (memory storage)
- Cloudinary integration for cloud storage
- Automatic cleanup when posts are deleted (via RabbitMQ events)

### 5. Search Service (`search-service`)
**Port**: 3004

Provides full-text search capabilities:
- Indexes post content for fast searching
- Event-driven indexing (listens to post creation/deletion)
- Search functionality with MongoDB text indexes

**Endpoints**:
- `GET /api/search/posts` - Search posts by content

**Features**:
- Real-time indexing via RabbitMQ event listeners
- Maintains search index synchronized with post data
- Automatic cleanup when posts are deleted

## 🛠️ Technology Stack

### Core Technologies
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database (via Mongoose)
- **Redis** - Caching and rate limiting
- **RabbitMQ** - Message broker for event-driven communication

### Key Libraries
- **JWT (jsonwebtoken)** - Authentication tokens
- **Argon2** - Password hashing
- **Cloudinary** - Media storage
- **Multer** - File upload handling
- **Joi** - Input validation
- **Winston** - Logging
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB instance
- Redis instance
- RabbitMQ instance
- Cloudinary account (for media service)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd social-media-microservice
   ```

2. **Install dependencies for each service**
   ```bash
   cd api-gateway && npm install
   cd ../identity-service && npm install
   cd ../post-service && npm install
   cd ../media-service && npm install
   cd ../search-service && npm install
   ```

3. **Configure environment variables**

   Create `.env` files in each service directory:

   **api-gateway/.env**:
   ```env
   PORT=3000
   REDIS_URL=redis://localhost:6379
   IDENTITY_SERVICE_URL=http://localhost:3001
   POST_SERVICE_URL=http://localhost:3002
   MEDIA_SERVICE_URL=http://localhost:3003
   SEARCH_SERVICE_URL=http://localhost:3004
   JWT_SECRET=your-secret-key
   ```

   **identity-service/.env**:
   ```env
   PORT=3001
   MONGODB_URL=mongodb://localhost:27017/social-media-identity
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret-key
   ```

   **post-service/.env**:
   ```env
   PORT=3002
   MONGODB_URL=mongodb://localhost:27017/social-media-posts
   REDIS_URL=redis://localhost:6379
   RABBITMQ_URL=amqp://localhost:5672
   JWT_SECRET=your-secret-key
   ```

   **media-service/.env**:
   ```env
   PORT=3003
   MONGODB_URL=mongodb://localhost:27017/social-media-media
   REDIS_URL=redis://localhost:6379
   RABBITMQ_URL=amqp://localhost:5672
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   JWT_SECRET=your-secret-key
   ```

   **search-service/.env**:
   ```env
   PORT=3004
   MONGODB_URL=mongodb://localhost:27017/social-media-search
   REDIS_URL=redis://localhost:6379
   RABBITMQ_URL=amqp://localhost:5672
   JWT_SECRET=your-secret-key
   ```

4. **Start services**

   In separate terminal windows:

   ```bash
   # Terminal 1 - API Gateway
   cd api-gateway && npm run dev

   # Terminal 2 - Identity Service
   cd identity-service && npm run dev

   # Terminal 3 - Post Service
   cd post-service && npm run dev

   # Terminal 4 - Media Service
   cd media-service && npm run dev

   # Terminal 5 - Search Service
   cd search-service && npm run dev
   ```

## 📡 API Usage Examples

### Authentication Flow

1. **Register a new user**:
   ```bash
   curl -X POST http://localhost:3000/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "johndoe",
       "email": "john@example.com",
       "password": "securepassword123"
     }'
   ```

2. **Login**:
   ```bash
   curl -X POST http://localhost:3000/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "john@example.com",
       "password": "securepassword123"
     }'
   ```

3. **Create a post** (requires authentication):
   ```bash
   curl -X POST http://localhost:3000/v1/posts/create-post \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{
       "content": "Hello, world! This is my first post.",
       "mediaIds": []
     }'
   ```

4. **Get all posts**:
   ```bash
   curl -X GET "http://localhost:3000/v1/posts/all-posts?page=1&limit=10" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

5. **Upload media**:
   ```bash
   curl -X POST http://localhost:3000/v1/media/upload \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -F "file=@/path/to/image.jpg"
   ```

6. **Search posts**:
   ```bash
   curl -X GET "http://localhost:3000/v1/search/posts?q=hello" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

## 🔄 Event-Driven Architecture

The system uses RabbitMQ for asynchronous event-driven communication:

### Events Published

- **`post.created`**: Published when a post is created
  - Payload: `{ postId, userId, content, createdAt }`
  - Consumers: Search Service (indexes the post)

- **`post.deleted`**: Published when a post is deleted
  - Payload: `{ postId, userId, mediaIds }`
  - Consumers: Media Service (cleans up media), Search Service (removes from index)

## 🎯 Key Features

- ✅ **Microservices Architecture** - Scalable and maintainable service separation
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Rate Limiting** - Protection against abuse (Redis-backed)
- ✅ **Caching Strategy** - Redis caching for improved performance
- ✅ **Event-Driven Communication** - Loose coupling via RabbitMQ
- ✅ **Input Validation** - Joi schema validation
- ✅ **Error Handling** - Centralized error handling middleware
- ✅ **Logging** - Winston-based logging across all services
- ✅ **Security** - Helmet for security headers, password hashing
- ✅ **File Upload** - Cloudinary integration for media storage
- ✅ **Search Functionality** - Full-text search with MongoDB indexes
- ✅ **Pagination** - Efficient data retrieval with pagination

## 📁 Project Structure

```
social-media-microservice/
├── api-gateway/
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── errorHandler.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   └── server.js
│   └── package.json
├── identity-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── server.js
│   └── package.json
├── post-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── server.js
│   └── package.json
├── media-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── eventHandlers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── server.js
│   └── package.json
├── search-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── eventHandlers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── server.js
│   └── package.json
└── README.md
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with Argon2
- Rate limiting to prevent abuse
- Helmet.js for security headers
- Input validation with Joi
- CORS configuration
- Authorization checks (e.g., post ownership validation)

## 📝 Development

### Running in Development Mode

Each service supports hot-reload with `nodemon`:

```bash
npm run dev
```

### Logging

All services use Winston for structured logging. Logs are written to:
- Console output
- Error log files (`error-log`, `combined-error-log`)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

ISC

## 🐛 Troubleshooting

### Common Issues

1. **Connection refused errors**: Ensure all services (MongoDB, Redis, RabbitMQ) are running
2. **JWT errors**: Verify `JWT_SECRET` is consistent across all services
3. **RabbitMQ connection issues**: Check RabbitMQ is running and `RABBITMQ_URL` is correct
4. **Cloudinary upload failures**: Verify Cloudinary credentials in `media-service/.env`

## 📚 Additional Notes

- Each service maintains its own MongoDB database for data isolation
- Redis is shared across services for caching and rate limiting
- RabbitMQ uses a topic exchange named `facebook_events`
- All services implement consistent error handling and logging patterns
- The API Gateway handles authentication and routes requests to appropriate services
