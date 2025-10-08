import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import './App.css';

interface User {
  id: string;
  username: string;
  isOnline: boolean;
  joinedAt: Date;
}

interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: Date;
  userId: string;
}

const socket: Socket = io('http://localhost:5000');

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      console.log('Connected to server');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    };

    const handleReceiveMessage = (newMessage: Message) => {
      setMessages(prev => [...prev, newMessage]);
    };

    const handleMessageHistory = (messageHistory: Message[]) => {
      setMessages(messageHistory);
    };

    const handleUsersUpdate = (userList: User[]) => {
      setUsers(userList);
    };

    const handleUserTyping = (typingUsername: string) => {
      setTypingUsers(prev => {
        if (!prev.includes(typingUsername)) {
          return [...prev, typingUsername];
        }
        return prev;
      });
    };

    const handleUserStoppedTyping = () => {
      setTypingUsers([]);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_history', handleMessageHistory);
    socket.on('users_update', handleUsersUpdate);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_history', handleMessageHistory);
      socket.off('users_update', handleUsersUpdate);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit('user_join', { username: username.trim() });
      setIsLoggedIn(true);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('send_message', { text: message.trim() });
      setMessage('');
      socket.emit('typing_stop');
    }
  };

  const handleTyping = () => {
    if (message.trim()) {
      socket.emit('typing_start');
    } else {
      socket.emit('typing_stop');
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>💬 Chat App</h1>
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="username-input"
              maxLength={20}
              required
            />
            <button type="submit" className="join-button">
              Join Chat
            </button>
          </form>
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="chat-container">
        {/* Header */}
        <header className="chat-header">
          <h1>💬 Real-Time Chat</h1>
          <div className="header-info">
            <span className="user-info">Welcome, {username}!</span>
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              ● {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </header>

        <div className="chat-layout">
          {/* Online Users Sidebar */}
          <div className="users-sidebar">
            <h3>Online Users ({users.length})</h3>
            <div className="users-list">
              {users.map(user => (
                <div key={user.id} className="user-item">
                  <span className="online-indicator">●</span>
                  {user.username}
                  {user.username === username && ' (You)'}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="chat-area">
            {/* Messages Container */}
            <div className="messages-container">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.userId === socket.id ? 'own-message' : 'other-message'}`}
                >
                  <div className="message-header">
                    <span className="message-username">
                      {msg.userId === socket.id ? 'You' : msg.username}
                    </span>
                    <span className="message-time">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              ))}
              
              {/* Typing Indicators */}
              {typingUsers.length > 0 && (
                <div className="typing-indicator">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="message-form">
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Type a message..."
                className="message-input"
                maxLength={500}
              />
              <button type="submit" disabled={!message.trim()} className="send-button">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;