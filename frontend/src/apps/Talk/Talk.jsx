import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import './Talk.css';

const Talk = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  
  // Chat states
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const chatContainerRef = useRef(null);
  
  const socketRef = useRef();
  const peerConnections = useRef({});
  const localVideoRef = useRef();
  const remoteVideosRef = useRef({});

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Get current user info and initialize socket
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get user info');
        }

        const data = await response.json();
        if (!data.user || !data.user.username) {
          throw new Error('Invalid user data received');
        }

        setUsername(data.user.username);
        setUserId(data.user.userId);
        console.log('User info fetched successfully:', data.user);

        // Initialize socket after getting user info
        initializeSocket({
          userId: data.user.userId,
          username: data.user.username
        });

      } catch (error) {
        console.error('Error fetching user info:', error);
        if (error.message === 'Not authenticated') {
          window.location.href = '/login';
        }
        setError(error.message);
      }
    };

    fetchUserInfo();

    // Initialize local video stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error('Error accessing media devices:', err);
        setError('Failed to access camera/microphone. Please make sure you have granted the necessary permissions.');
      });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const initializeSocket = (userInfo) => {
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Create new socket connection
    const socket = io('http://localhost:5000', {
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Join video chat with user info
      socket.emit('join-video-chat', userInfo);
    });

    socket.on('chat-message', (message) => {
      // Only add message if it's not from the current user
      // or if it's a system message
      if (message.socketId !== socket.id || message.type === 'system') {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on('user-joined', (user) => {
      console.log('User joined:', user);
      setUsers(prev => [...prev, user]);
      createPeerConnection(user.socketId, false);
    });

    socket.on('user-left', (user) => {
      console.log('User left:', user);
      setUsers(prev => prev.filter(u => u.socketId !== user.socketId));
      if (peerConnections.current[user.socketId]) {
        peerConnections.current[user.socketId].close();
        delete peerConnections.current[user.socketId];
      }
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to chat server. Please try again.');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setError('An error occurred with the chat connection.');
    });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current?.connected) return;

    const message = {
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'user',
      username: username
    };

    // Add message to local state immediately for sender
    setMessages(prev => [...prev, {
      ...message,
      socketId: socketRef.current.id,
      username: username
    }]);

    // Send message to server
    socketRef.current.emit('chat-message', message);
    setNewMessage('');
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const createPeerConnection = (socketId, isInitiator) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    peerConnections.current[socketId] = pc;

    // Add local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          target: socketId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [socketId]: event.streams[0]
      }));
    };

    // Create and send offer if initiator
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current.emit('offer', {
            target: socketId,
            offer: pc.localDescription
          });
        })
        .catch(err => console.error('Error creating offer:', err));
    }

    return pc;
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="talk-container">
      <div className="video-chat-section">
        <div className="video-grid">
          {/* Local video */}
          <div className="video-container local-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={isVideoOff ? 'video-off' : ''}
            />
            <div className="video-label">You ({username})</div>
          </div>

          {/* Remote videos */}
          {Object.entries(remoteStreams).map(([socketId, stream]) => {
            const user = users.find(u => u.socketId === socketId);
            return (
              <div key={socketId} className="video-container remote-video">
                <video
                  ref={el => {
                    if (el) {
                      el.srcObject = stream;
                      remoteVideosRef.current[socketId] = el;
                    }
                  }}
                  autoPlay
                  playsInline
                />
                <div className="video-label">{user?.username || 'Unknown User'}</div>
              </div>
            );
          })}
        </div>

        {/* Video controls */}
        <div className="video-controls">
          <button 
            className={`control-button ${isMuted ? 'active' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <i className={`fas fa-microphone${isMuted ? '-slash' : ''}`}></i>
          </button>
          <button 
            className={`control-button ${isVideoOff ? 'active' : ''}`}
            onClick={toggleVideo}
            title={isVideoOff ? 'Show Video' : 'Hide Video'}
          >
            <i className={`fas fa-video${isVideoOff ? '-slash' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Chat section */}
      <div className="chat-section">
        <div className="chat-header">
          <h3>Chat</h3>
          <span className="online-users">{users.length + 1} online</span>
        </div>
        
        <div className="chat-messages" ref={chatContainerRef}>
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.socketId === socketRef.current?.id ? 'own-message' : ''}`}
            >
              {message.type === 'system' ? (
                <div className="system-message">{message.content}</div>
              ) : (
                <>
                  <div className="message-header">
                    <span className="username">{message.username}</span>
                    <span className="timestamp">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="message-content">{message.content}</div>
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="chat-inputBox">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className='input-textBox'
          />
          <button type="submit" className='sub-btn'>Send</button>
        </form>
      </div>
    </div>
  );
};

export default Talk;
