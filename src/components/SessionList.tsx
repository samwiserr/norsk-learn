"use client";

import { useContext } from "react";
import { Context } from "@/src/context/Context";
import SessionItem from "./SessionItem";
import "./SessionList.css";

interface SessionListProps {
  onItemClick?: () => void;
}

const SessionList = ({ onItemClick }: SessionListProps) => {
  const { sessions, activeSessionId } = useContext(Context);

  if (!sessions.length) {
    return <p className="session-empty">No conversations yet</p>;
  }

  const ordered = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="session-list">
      {ordered.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          isActive={session.id === activeSessionId}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
};

export default SessionList;

