import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";

const DEMO_MESSAGES = [
  { id: 1, name: "Fabio", role: "organisateur", text: "Ciao a tutti ! On se retrouve directement sur les quais." }
];

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [draft, setDraft] = useState("");
  const [venueName, setVenueName] = useState(null); // renseigné si le compte connecté est celui du lieu de l'événement
  const bottomRef = useRef(null);

  // Si l'utilisateur connecté est le compte du lieu de cet événement, il écrit sous le nom du lieu
  useEffect(() => {
    setVenueName(null);
    if (!user || !import.meta.env.VITE_SUPABASE_URL) return;
    supabase.rpc("my_venue_for_event", { p_event_id: id }).then(({ data }) => {
      if (typeof data === "string" && data) setVenueName(data);
    });
  }, [id, user]);

  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL) return;

    async function load() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    }
    load();

    const channel = supabase
      .channel(`event-${id}-chat`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `event_id=eq.${id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!draft.trim() || !user) return;
    const name = venueName || profile?.name || user.email.split("@")[0];
    const role = venueName ? "lieu" : profile?.is_member ? "membre" : "participant";

    if (!import.meta.env.VITE_SUPABASE_URL) {
      setMessages((prev) => [...prev, { id: Date.now(), name, role, text: draft }]);
      setDraft("");
      return;
    }
    await supabase.from("messages").insert({ event_id: id, user_id: user.id, name, role, text: draft });
    setDraft("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 12px" }}>
        <button onClick={() => navigate(`/event/${id}`)} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 22, margin: 0, color: colors.navy }}>Discussion</h1>
        <i style={{ display: "inline-block", width: 30, height: 6, background: colors.orange, borderRadius: 99, transform: "rotate(-6deg)" }} />
      </div>
      <p style={{ fontSize: 12, color: colors.muted, margin: "0 20px 14px" }}>
        Ouvert à tous : organisateur, co-organisateurs, lieu et participants inscrits.
      </p>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: "8px 12px",
              maxWidth: "80%"
            }}
          >
            {m.role === "lieu" ? (
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.navy, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                {m.name}
                <span style={{ background: colors.orange, color: "#fff", borderRadius: 99, padding: "1px 8px", fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Lieu
                </span>
              </div>
            ) : (
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.orange, marginBottom: 2 }}>
                {m.name} · {m.role}
              </div>
            )}
            <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!authLoading && !user ? (
        <div style={{ padding: "12px 16px 24px", textAlign: "center" }}>
          <button
            onClick={() => navigate("/login")}
            style={{ background: colors.orange, color: colors.ink, border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            Se connecter pour participer
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, padding: "12px 16px 24px" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Écrire un message…"
            style={{
              flex: 1,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: "10px 12px",
              color: colors.ink,
              fontSize: 13,
              outline: "none"
            }}
          />
          <button onClick={send} style={{ background: colors.orange, border: "none", borderRadius: 12, width: 40, cursor: "pointer" }}>
            <Send size={16} color={colors.ink} />
          </button>
        </div>
      )}
    </div>
  );
}
