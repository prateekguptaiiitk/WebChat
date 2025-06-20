<h1>Scalable WebChat Application</h1> 



### 🚀 Project Overview

The Scalable WebChat Application is a full-stack, real-time chat platform built with **React.js** on the frontend and **Node.js/Express** on the backend. It supports real-time messaging, online user presence tracking, file uploads, and is designed to scale horizontally using **Redis pub/sub**. The backend persists data using **MongoDB**, and files are securely stored in **AWS S3**.

---

### 📄 Key Features

* **User Authentication**: JWT-based login, registration, and logout with secure cookie storage.
* **Real-Time Messaging**: WebSocket-based chat using the `ws` library.
* **User Presence**: Online users list using ping/pong heartbeats and socket tracking.
* **File Uploads**: Uploaded files sent to AWS S3 and messages contain S3 links.
* **Message Storage**: MongoDB stores chat history between users.
* **Scalability**: Redis pub/sub decouples WebSocket instances for horizontal scaling.

---

### 📆 Tech Stack

| Layer         | Technology         |
| ------------- | ------------------ |
| Frontend      | React.js, Axios    |
| Backend       | Node.js, Express   |
| Database      | MongoDB + Mongoose |
| Real-time     | WebSocket (ws)     |
| File Storage  | AWS S3             |
| Auth          | JWT, bcryptjs      |
| Messaging Bus | Redis (ioredis)    |

---

### ⚙️ System Design Highlights

* **WebSocket Connections**: Each client establishes a WebSocket connection after authentication. The server uses JWT in cookies to validate the user.
* **Redis Pub/Sub**: Ensures messages are routed to the correct recipient even if multiple WebSocket servers are used.
* **MongoDB Schema**:

  * `User`: `{ username, passwordHash }`
  * `Message`: `{ sender, recipient, text, file, timestamps }`
* **S3 Integration**: Uses `multer.memoryStorage()` for efficient file buffering and `AWS-SDK` for upload.

---

### 📉 End-to-End Flow

1. **Register/Login**: User credentials are posted to backend; JWT token is issued in cookie.
2. **Connection Establishment**: React app opens WebSocket and sends cookie with JWT.
3. **Message Send/Receive**: User sends message/file via WebSocket. Backend stores message, publishes to Redis. Redis triggers recipient delivery.
4. **Chat History**: On chat open, app fetches messages via REST API.
5. **File Handling**: Files are uploaded via `/api/upload`, stored in S3, and link is sent in chat.

---

### 📅 Future Improvements

* Add typing indicators
* Implement message read receipts
* Use signed URLs for private file access
* Use load balancer (Nginx) for round-robin WebSocket distribution

