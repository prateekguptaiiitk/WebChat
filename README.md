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

## System Design Deep Dive

## 🎯 Problem Statement

Design and implement a **real-time web chat application** that supports:

- One-on-one messaging
- File sharing (via AWS S3)
- User presence tracking (online/offline)
- Real-time delivery via WebSockets
- Scalability using Redis Pub/Sub

---

## 🔍 Component Breakdown

### 1. **Frontend (React.js)**

- Manages routing and UI rendering.
- Maintains WebSocket connection per session.
- Handles optimistic message updates.
- Supports file upload and renders file links.

### 2. **Backend (Node.js + Express.js)**

- REST APIs for authentication, message history, people listing.
- File uploads handled via `multer` to in-memory buffer.
- JWT-secured user sessions.
- WebSocket server for real-time messaging.

### 3. **MongoDB**

- Stores user profiles and message history.
- Messages are queried based on sender/recipient pairs.
- **MongoDB Schema**:

  * `User`: `{ username, passwordHash }`
  * `Message`: `{ sender, recipient, text, file, timestamps }`

### 4. **Redis Pub/Sub**

- Ensures message propagation across horizontally scaled WebSocket servers.
- Channel: `MESSAGES` (published/subscribed to by each server instance).

### 5. **AWS S3**

- File attachments are uploaded directly.
- Returns public URL that is stored in DB and sent in message payload.

---

## 🔁 End-to-End Flow

### 🔐 Login Flow

1. User logs in via form (React.js).
2. JWT is issued and stored in cookies (`HttpOnly`, `SameSite=None`, `Secure=true`).
3. JWT used for subsequent API and WS authentication.

### 💬 Messaging Flow

1. Client sends message via WebSocket.
2. Server:
   - Validates JWT from cookie.
   - Persists message to MongoDB.
   - Publishes to Redis `MESSAGES` channel.
3. All subscribed servers receive the event.
4. If any server has a WebSocket open for the recipient, it forwards the message.

### 📁 File Upload Flow

1. File is uploaded via `/upload` REST endpoint.
2. `multer` parses file → buffered to memory.
3. AWS S3 SDK uploads file with public-read ACL.
4. S3 URL is returned and included in WebSocket payload.

---

## 🔐 Security Measures

- Passwords hashed with bcrypt.
- JWT used for stateless session management.
- CORS configured to allow specific origins.
- File uploads size-limited via `multer` + S3 MIME type validation.

---

## 📈 Scalability Considerations

- Stateless server instances → horizontal scaling behind NGINX/ALB.
- Redis enables WebSocket consistency across instances.
- MongoDB used as persistent store (can migrate to Atlas for global replication).
- S3 offloads binary storage — cheap and scalable.

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

## 📂 File Structure (Partial)

```
client/
├── Chat.jsx
├── Contact.jsx
├── UserContext.jsx
├── Routes.jsx
└── App.jsx

server/
├── models/
│   ├── Message.js
│   └── User.js
├── index.js
```

### 📉 End-to-End Flow

1. **Register/Login**: User credentials are posted to backend; JWT token is issued in cookie.
2. **Connection Establishment**: React app opens WebSocket and sends cookie with JWT.
3. **Message Send/Receive**: User sends message/file via WebSocket. Backend stores message, publishes to Redis. Redis triggers recipient delivery.
4. **Chat History**: On chat open, app fetches messages via REST API.
5. **File Handling**: Files are uploaded via `/api/upload`, stored in S3, and link is sent in chat.

---

### 📅 Future Improvements

- Add typing indicators
- Implement message read receipts
- Use load balancer (Nginx) for round-robin WebSocket distribution
- Group chat support
- Rate limiting & abuse detection
- End-to-end encryption
- MongoDB indexes for faster querying
- Redis cache layer for frequent messages

## Author

<table>
<tr>
<td align="center">
     <img src="https://avatars2.githubusercontent.com/u/29523950?s=400&u=878e242ca2c624eb45a62bf62ae580a370b7a0ae&v=4" width="180"/>

<p><strong>Prateek Gupta</strong></p>

<p align="center">
<a href="https://github.com/prateekguptaiiitk">
  <img src="http://www.iconninja.com/files/241/825/211/round-collaboration-social-github-code-circle-network-icon.svg" width="36" height="36"/>
</a>
<a href="https://www.linkedin.com/in/prateekjpg/">
  <img src="http://www.iconninja.com/files/863/607/751/network-linkedin-social-connection-circular-circle-media-icon.svg" width="36" height="36"/>
</a>
</p>
</td>
</tr> 
</table>
