import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import '../assets/chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const messagesEndRef = useRef(null);
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    scrollToBottom();
    setTimeout(addCopyButtonsToCode, 100);
  }, [messages]);

  useEffect(() => {
    updateGreetingAndDate();
    const interval = setInterval(updateGreetingAndDate, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addCopyButtonsToCode = () => {
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      if (block.parentElement.querySelector('.copy-btn')) return;
      const button = document.createElement('button');
      button.className = 'copy-btn';
      button.innerHTML = '📋';
      button.onclick = () => {
        const text = block.innerText;
        navigator.clipboard.writeText(text);
        button.innerText = '✅';
        setTimeout(() => (button.innerText = '📋'), 1500);
      };
      block.parentElement.style.position = 'relative';
      block.parentElement.appendChild(button);
    });
  };

  const updateGreetingAndDate = () => {
    const now = new Date();
    const hour = now.getHours();
    let greet = '';
    if (hour >= 5 && hour < 12) greet = 'Good Morning!';
    else if (hour >= 12 && hour < 17) greet = 'Good Afternoon!';
    else if (hour >= 17 && hour < 21) greet = 'Good Evening!';
    else greet = 'Good Night!';

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString(undefined, options);

    setGreeting(greet);
    setCurrentDate(formattedDate);
  };

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: input }] }],
          }),
        }
      );

      const data = await res.json();
      const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '🤖 No response';

      setMessages((prev) => [...prev, { role: 'bot', content: botReply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Error: Could not fetch response.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`chat-app ${isDark ? 'dark' : 'light'}`}>
      <div className="chat-header">
        <div className="logo">
          <div className="logo-icon">🤖</div>
          <h2>ChatBot</h2>
        </div>
        <div className="header-right">
          <div className="current-time">
            {new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </div>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? '🌞' : '🌙'}
          </button>
        </div>
      </div>

      <div className="welcome-section">
        <h1>{greeting}</h1>
        <p className="current-date">{currentDate}</p>
        <h2>
          <span className="highlight-cyan">Your AI</span>{' '}
          <span className="highlight-blue">Assistant</span>
        </h2>
        <p className="welcome-text">
          I'm here to help with any questions you have. Ask me about coding, general knowledge, or anything else that comes to mind.
        </p>

        <div className="features">
          <div className="feature-card">
            <div className="feature-icon">&lt;/&gt;</div>
            <h3>Code Help</h3>
            <p>Get coding solutions in multiple languages</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">?</div>
            <h3>Knowledge</h3>
            <p>Answers to your general questions</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💡</div>
            <h3>Fast Responses</h3>
            <p>Quick and accurate information</p>
          </div>
        </div>
      </div>

      <div className="chat-window">
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">✨</div>
              <p>Ask me anything!</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message ${msg.role}`}
              style={{
                animation: `message-${msg.role}-in 0.3s ease forwards`,
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <div className="message-content">
                {msg.role === 'bot' && <div className="bot-avatar">🤖</div>}
                <div className="message-bubble">
                  <ReactMarkdown
                    children={msg.content}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  />
                </div>
                {msg.role === 'user' && <div className="user-avatar">🧑‍💻</div>}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message bot typing">
              <div className="message-content">
                <div className="bot-avatar">🤖</div>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          placeholder="Type your message..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} disabled={!input.trim() || loading}>
          <span>Send</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      <footer className="footer">
        © 2025. Developed with <span className="heart">❤️</span> by <a href="https://nazmussakib.me" target="_blank" rel="noopener noreferrer">Nazmus Sakib</a>
      </footer>
    </div>
  );
};

export default Chat;
