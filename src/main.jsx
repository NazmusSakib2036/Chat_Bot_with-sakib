// main.jsx
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Chat from './pages/chat_bot.jsx';

import ChatBot from './pages/chat_bt';

import './assets/chat.css';

const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/chatbot" element={<ChatBot />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
