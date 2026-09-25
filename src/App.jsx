import React, { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import { takeAfterLogin } from "./lib/afterLogin";
import { colors, fonts } from "./lib/theme";
import { AuthProvider } from "./lib/AuthContext";
import { CategoriesProvider } from "./lib/CategoriesContext";
import Feed from "./pages/Feed.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import Register from "./pages/Register.jsx";
import Chat from "./pages/Chat.jsx";
import Admin from "./pages/Admin.jsx";
import CreateEvent from "./pages/CreateEvent.jsx";
import EditEvent from "./pages/EditEvent.jsx";
import ProposeEvent from "./pages/ProposeEvent.jsx";
import Join from "./pages/Join.jsx";
import Login from "./pages/Login.jsx";
import Account from "./pages/Account.jsx";
import Friends from "./pages/Friends.jsx";
import Venues from "./pages/Venues.jsx";
import Community from "./pages/Community.jsx";
import Help from "./pages/Help.jsx";
import Ticket from "./pages/Ticket.jsx";
import MyTickets from "./pages/MyTickets.jsx";
// Après la connexion par lien magique, renvoie vers la page mémorisée (ex. un événement)
function AfterLoginRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!user) return;
    const path = takeAfterLogin();
    if (path && location.pathname + location.search !== path) navigate(path, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <CategoriesProvider>
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
        <AfterLoginRedirect />
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/event/:id/register" element={<Register />} />
          <Route path="/event/:id/chat" element={<Chat />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/create-event" element={<CreateEvent />} />
          <Route path="/admin/edit-event/:id" element={<EditEvent />} />
          <Route path="/propose-event" element={<ProposeEvent />} />
          <Route path="/join" element={<Join />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/community" element={<Community />} />
          <Route path="/help" element={<Help />} />
          <Route path="/ticket/:id" element={<Ticket />} />
          <Route path="/tickets" element={<MyTickets />} />
      </Routes>
      </div>
      </CategoriesProvider>
    </AuthProvider>
  );
}
