const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Message = require('./models/Message');
const ws = require('ws');
const fs = require('fs');
const Redis = require('ioredis')
const multer = require('multer');
const AWS = require('aws-sdk')

dotenv.config();
mongoose.connect(process.env.MONGO_URL, (err) => {
  if (err) throw err;
});
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const upload = multer({ storage: multer.memoryStorage() });

const s3 = new AWS.S3({
  region: 'us-east-2',
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

const pub = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD
})
const sub = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD
})

const app = express();
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL,
}));

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject('no token');
    }
  });

}

app.get('/api/test', (req,res) => {
  res.json('test ok');
});

app.get('/api/messages/:userId', async (req,res) => {
  const {userId} = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  const messages = await Message.find({
    sender:{$in:[userId,ourUserId]},
    recipient:{$in:[userId,ourUserId]},
  }).sort({createdAt: 1});
  res.json(messages);
});

app.get('/api/people', async (req,res) => {
  const users = await User.find({}, {'_id':1,username:1});
  res.json(users);
});

app.get('/api/profile', (req,res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json('no token');
  }
});

app.post('/api/login', async (req,res) => {
  const {username, password} = req.body;
  const foundUser = await User.findOne({username});
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign({userId:foundUser._id,username}, jwtSecret, {}, (err, token) => {
        res.cookie('token', token, {sameSite:'none', secure:true}).json({
          id: foundUser._id,
        });
      });
    }
  }
});

app.post('/api/logout', (req,res) => {
  res.cookie('token', '', {sameSite:'none', secure:true}).json('ok');
});

app.post('/api/register', async (req,res) => {
  const {username,password} = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username:username,
      password:hashedPassword,
    });
    jwt.sign({userId:createdUser._id,username}, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
        id: createdUser._id,
      });
    });
  } catch(err) {
    if (err) throw err;
    res.status(500).json('error');
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file provided' });

  const parts = file.originalname.split('.');
  const ext = parts[parts.length - 1];
  const filename = Date.now() + '.'+ext;

  try {
    const result = await s3.upload({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    }).promise();

    res.json({ url: result.Location });
  } catch (err) {
    console.error('S3 upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

const server = app.listen(4040);

const wss = new ws.WebSocketServer({server});
wss.on('connection', (connection, req) => {

  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach(client => {
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({userId:c.userId,username:c.username})),
      }));
    });
  }

  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      console.log('dead');
    }, 1000);
  }, 5000);

  connection.on('pong', () => {
    clearTimeout(connection.deathTimer);
  });

  // read username and id form the cookie for this connection
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          const {userId, username} = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

  connection.on('message', async (message) => {
    const messageData = JSON.parse(message.toString());
    const {recipient, text, file} = messageData;
    sub.subscribe('MESSAGES')
    if (recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender:connection.userId,
        recipient,
        text,
        file: file ? file : null,
      });
      await pub.publish('MESSAGES', JSON.stringify({
        sender:connection.userId,
        recipient,
        text,
        file: file ? file : null,
      }))
      console.log('created message');
      sub.on('message', (channel, message) => {
        // if (channel === 'MESSAGES') {
          [...wss.clients]
          .filter(c => c.userId === recipient)
          .forEach(c => c.send(JSON.stringify({ 
            text,
            sender:connection.userId,
            recipient,
            file: file ? file : null,
            _id:messageDoc._id,
          })));
        // }
      });
    }
  });

  // notify everyone about online people (when someone connects)
  notifyAboutOnlinePeople();
});
