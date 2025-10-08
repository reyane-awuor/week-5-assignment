const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected users
const users = new Map();
const messages = [];

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('user_join', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username,
      isOnline: true,
      joinedAt: new Date()
    };
    
    users.set(socket.id, user);
    
    // Notify all clients about updated user list
    io.emit('users_update', Array.from(users.values()));
    
    // Send chat history to the new user
    socket.emit('message_history', messages);
    
    // Notify everyone about new user
    socket.broadcast.emit('user_joined', {
      username: userData.username,
      timestamp: new Date(),
      system: true
    });
    
    console.log('User ' + userData.username + ' joined the chat');
  });

  // Handle new messages
  socket.on('send_message', (messageData) => {
    const user = users.get(socket.id);
    if (!user) return;

    const message = {
      id: Date.now().toString(),
      username: user.username,
      text: messageData.text,
      timestamp: new Date(),
      userId: socket.id
    };

    messages.push(message);
    
    // Broadcast to all clients
    io.emit('receive_message', message);
  });

  // Handle typing indicators
  socket.on('typing_start', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('user_typing', user.username);
    }
  });

  socket.on('typing_stop', () => {
    socket.broadcast.emit('user_stopped_typing');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      
      // Notify all clients about updated user list
      io.emit('users_update', Array.from(users.values()));
      
      // Notify about user leaving
      socket.broadcast.emit('user_left', {
        username: user.username,
        timestamp: new Date(),
        system: true
      });
    }
    
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});