import React from "react";
import { Routes, Route } from "react-router-dom";
import { colors, fonts } from "./lib/theme";
import Feed from "./pages/Feed.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import Register from "./pages/Register.jsx";
import Chat from "./pages/Chat.jsx";
import Admin from "./pages/Admin.jsx";
import Join from "./pages/Join.jsx";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        color: colors.ink,
        fontFamily: fonts.body,
        maxWidth: 480,
        margin: "0 auto"
      }}
    >
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/event/:id/register" element={<Register />} />
        <Route path="/event/:id/chat" element={<Chat />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/join" element={<Join />} />
      </Routes>
    </div>
  );
}
