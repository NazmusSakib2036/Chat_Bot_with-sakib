import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import '../assets/chat_bt.css';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text3D } from '@react-three/drei';
import * as THREE from 'three';

// Markdown related imports
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

// 3D Visualizer Component for Background/Avatar
const AbstractVisualizer = ({ isTyping }) => {
  const meshRef = useRef();
  const lightRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Gentle floating and rotation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      meshRef.current.rotation.y += delta * 0.05;
      meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.3) * 0.02;

      // Dynamic scaling and emissive for typing state
      if (isTyping) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.03; // Fast, subtle pulse
        meshRef.current.scale.set(pulse, pulse, pulse);
        meshRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(meshRef.current.material.emissiveIntensity, 2.0, 0.1);
        if (lightRef.current) {
          lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 3.5, 0.1);
        }
      } else {
        meshRef.current.scale.set(
          THREE.MathUtils.lerp(meshRef.current.scale.x, 1, 0.1),
          THREE.MathUtils.lerp(meshRef.current.scale.y, 1, 0.1),
          THREE.MathUtils.lerp(meshRef.current.scale.z, 1, 0.1)
        );
        meshRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(meshRef.current.material.emissiveIntensity, 0.8, 0.1);
        if (lightRef.current) {
          lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 1.5, 0.1);
        }
      }
    }
  });

  return (
    <>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        {/* Using IcosahedronGeometry for a more abstract, crystalline look */}
        <icosahedronGeometry args={[1, 1]} /> {/* Radius, detail */}
        <meshStandardMaterial
          color="#A722F0" // Vibrant purple
          emissive="#D453FF" // Lighter purple glow
          emissiveIntensity={0.8}
          metalness={0.9}
          roughness={0.1}
          flatShading={true} // For sharp, faceted look
        />
        <pointLight ref={lightRef} color="#D453FF" intensity={1.5} distance={5} decay={2} />
      </mesh>
      {isTyping && (
        <Text3D
          position={[0, -1.3, 0]}
          size={0.15}
          height={0.03}
          curveSegments={4}
          bevelEnabled
          bevelThickness={0.01}
          bevelSize={0.01}
          font="/fonts/helvetiker_regular.typeface.json" // Ensure font path is correct
        >
          Analyzing...
          <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1.2} />
        </Text3D>
      )}
    </>
  );
};

const Chatbot = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [greeting, setGreeting] = useState('Hello!');
  const [isTyping, setIsTyping] = useState(false);
  const [show3DAvatar, setShow3DAvatar] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const API_KEY = import.meta.env.VITE_API_URL;
  const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedTheme);
    document.body.classList.toggle('dark-mode', savedTheme);
    document.body.classList.toggle('light-mode', !savedTheme);

    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      }));
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
      }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    const hours = new Date().getHours();
    let greet = 'Hello!';
    if (hours >= 5 && hours < 12) greet = 'Good Morning!';
    else if (hours >= 12 && hours < 17) greet = 'Good Afternoon!';
    else if (hours >= 17 && hours < 21) greet = 'Good Evening!';
    else greet = 'Good Night!';
    setGreeting(greet);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const toggleTheme = useCallback(() => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.body.classList.toggle('dark-mode', newMode);
    document.body.classList.toggle('light-mode', !newMode);
    localStorage.setItem('darkMode', newMode);
  }, [isDarkMode]);

  const toggle3DAvatar = useCallback(() => {
    setShow3DAvatar(prev => !prev);
  }, []);

  const sendMessage = async (textToSend = message) => {
    if (!textToSend.trim() || isTyping) return;

    const userMessage = {
      type: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    try {
      const response = await axios.post(API_ENDPOINT, {
        contents: [{
          parts: [{
            text: textToSend
          }]
        }]
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const reply = response.data.candidates[0].content.parts[0].text;

      const botMessage = {
        type: 'bot',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: 'Apologies, I\'m unable to process your request at the moment. Please try again later.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`full-page-container ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Background Visualizer */}
      <div className="background-visualizer">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <AbstractVisualizer isTyping={false} /> {/* Not typing for background */}
          <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.8} />
        </Canvas>
      </div>

      {/* 3D Avatar Modal */}
      {show3DAvatar && (
        <div className="avatar-modal" onClick={toggle3DAvatar}>
          <div className="avatar-modal-content" onClick={(e) => e.stopPropagation()}>
            <Canvas camera={{ position: [0, 0, 3], fov: 60 }}>
              <ambientLight intensity={0.7} />
              <AbstractVisualizer isTyping={isTyping} />
              <OrbitControls enableZoom={false} enablePan={false} enableRotate={true} />
              <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            </Canvas>
            <button className="close-avatar-btn" onClick={toggle3DAvatar} aria-label="Close 3D Avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className={`chat-container ${isDarkMode ? 'dark' : 'light'}`}>
        <div className="chat-header">
          <div className="header-content">
            <div className="avatar-header" onClick={toggle3DAvatar} role="button" aria-label="Open AI Visualizer">
              <div className="avatar-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 17.5V21M3.5 12H7M21 12H17M12 6.5V3M6 18l-3 3M18 18l3 3M6 6l-3-3M18 6l3-3"></path>
                </svg>
              </div>
            </div>
            <div className="header-text-group">
              <h1 className="app-title">Chat - AI</h1> {/* New professional name */}
              <p className="status-message">
                <span className={`status-indicator ${isTyping ? 'typing' : 'online'}`}></span>
                {isTyping ? 'Typing...' : 'Online'}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <div className="datetime-display">
              <span className="time-display">{currentTime}</span>
              <span className="date-display">{currentDate}</span>
            </div>
            <button
              className={`theme-toggle-btn ${isDarkMode ? 'dark' : 'light'}`}
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <span className="theme-icon">
                {isDarkMode ?
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg> :
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                }
              </span>
            </button>
          </div>
        </div>

        <div className="chat-body">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-content">
                <p className="welcome-greeting">{greeting}</p>
                <h2 className="welcome-tagline">How can I assist your journey of discovery today?</h2>
                <div className="abstract-graphic">
                  <div className="graphic-core" onClick={toggle3DAvatar} role="button" aria-label="Open AI Visualizer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 11.33a2 2 0 0 0-.07 2.21l8.47 7.47a2 2 0 0 0 2.21.07l8.47-7.47a2 2 0 0 0 .07-2.21L13.71 3.86a2 2 0 0 0-2.21-.07z"></path>
                      <path d="M8 14l4-4 4 4"></path>
                      <path d="M12 2v10"></path>
                    </svg>
                  </div>
                  <div className="graphic-glow-layer"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="messages-container">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`message-bubble ${msg.type}-message-bubble`}
                >
                  <div className="message-meta-top">
                    <span className="message-sender">{msg.type === 'user' ? 'You' : 'AI'}</span>
                    <span className="message-time">{msg.timestamp}</span>
                  </div>
                  <div className="message-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="message-bubble bot-message-bubble typing-indicator-wrapper">
                  <div className="message-meta-top">
                    <span className="message-sender">AI</span>
                    <span className="message-time">...</span>
                  </div>
                  <div className="typing-dots-animated">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="chat-footer">
          <div className="input-area">
            <textarea
              ref={textareaRef}
              placeholder="Start your conversation here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isTyping}
              className={`text-input ${isDarkMode ? 'dark' : 'light'}`}
              aria-label="Message input"
              rows={1}
            />
            <button
              className={`send-msg-btn ${!message.trim() || isTyping ? 'disabled' : ''}`}
              onClick={() => sendMessage()}
              disabled={!message.trim() || isTyping}
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <p className="copyright-note">Powered by Gemini AI. Designed by <a href="http://nazmussakib.me/" target='_blank'>Nazmus Sakib</a>. © 2025 All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;