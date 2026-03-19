import { 
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  getDocs,
  onSnapshot, 
  writeBatch,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./config";
import { Session, Message, validateSession } from "@/lib/sessions";
import { createLogger } from "@/lib/logger";

const log = createLogger("FirestoreSync");

// Convert Session to Firestore format
const sessionToFirestore = (session: Session) => ({
  title: session.title,
  createdAt: Timestamp.fromMillis(session.createdAt),
  updatedAt: Timestamp.fromMillis(session.updatedAt),
  messageCount: session.messageCount,
  cefrLevel: session.cefrLevel,
  completedTasks: session.completedTasks,
  progress: session.progress,
  srsReviewList: session.srsReviewList,
  userId: session.userId,
});

// Convert Firestore format to Session
const firestoreToSession = (id: string, data: any): Session => ({
  id,
  title: data.title,
  createdAt: data.createdAt?.toMillis() || Date.now(),
  updatedAt: data.updatedAt?.toMillis() || Date.now(),
  messageCount: data.messageCount || 0,
  cefrLevel: data.cefrLevel,
  messages: [], // Loaded separately
  completedTasks: data.completedTasks || 0,
  progress: data.progress || 0,
  srsReviewList: data.srsReviewList || [],
  userId: data.userId,
});

// Convert Message to Firestore format
const messageToFirestore = (message: Message) => ({
  role: message.role,
  content: message.content,
  timestamp: Timestamp.fromMillis(message.timestamp),
});

// Convert Firestore format to Message
const firestoreToMessage = (id: string, data: any): Message => ({
  id,
  role: data.role,
  content: data.content,
  timestamp: data.timestamp?.toMillis() || Date.now(),
});

/**
 * Sync session to Firestore
 */
export const syncSessionToFirestore = async (
  userId: string,
  session: Session
): Promise<void> => {
  if (!db || !userId) {
    throw new Error("Firebase not initialized or user not authenticated");
  }

  try {
    const sessionRef = doc(db, `users/${userId}/sessions/${session.id}`);
    const messagesRef = collection(sessionRef, "messages");

    // Use batch write for atomicity
    const batch = writeBatch(db);

    // Update session metadata
    batch.set(
      sessionRef,
      {
        ...sessionToFirestore(session),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Sync messages (only sync recent messages to avoid batch limits)
    // Firestore batch limit is 500 operations
    const recentMessages = session.messages.slice(-400); // Leave room for other operations
    
    recentMessages.forEach((message) => {
      const messageRef = doc(messagesRef, message.id);
      batch.set(messageRef, messageToFirestore(message), { merge: true });
    });

    await batch.commit();
  } catch (error) {
    log.error("Failed to sync session to Firestore:", error);
    throw error;
  }
};

/**
 * Load session from Firestore
 */
export const loadSessionFromFirestore = async (
  userId: string,
  sessionId: string
): Promise<Session | null> => {
  if (!db || !userId) return null;

  try {
    const sessionRef = doc(db, `users/${userId}/sessions/${sessionId}`);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return null;
    }

    const sessionData = firestoreToSession(sessionId, sessionSnap.data());

    // Load messages
    const messagesRef = collection(sessionRef, "messages");
    const messagesQuery = query(
      messagesRef,
      orderBy("timestamp", "asc"),
      limit(1000) // Limit to recent messages
    );
    
    const messagesSnap = await getDocs(messagesQuery);
    const messages = messagesSnap.docs.map((doc) =>
      firestoreToMessage(doc.id, doc.data())
    );

    return {
      ...sessionData,
      messages,
    };
  } catch (error) {
    log.error("Failed to load session from Firestore:", error);
    return null;
  }
};

/**
 * Load all sessions from Firestore for a user
 */
export const loadAllSessionsFromFirestore = async (
  userId: string
): Promise<Session[]> => {
  if (!db || !userId) return [];

  try {
    const sessionsRef = collection(db, `users/${userId}/sessions`);
    const sessionsSnap = await getDocs(sessionsRef);
    
    const sessions: Session[] = [];
    
    for (const sessionDoc of sessionsSnap.docs) {
      const sessionData = firestoreToSession(sessionDoc.id, sessionDoc.data());
      sessions.push(sessionData);
    }
    
    return sessions;
  } catch (error) {
    log.error("Failed to load sessions from Firestore:", error);
    return [];
  }
};

/**
 * Delete session from Firestore
 */
export const deleteSessionFromFirestore = async (
  userId: string,
  sessionId: string
): Promise<void> => {
  if (!db || !userId) {
    throw new Error("Firebase not initialized or user not authenticated");
  }

  try {
    const sessionRef = doc(db, `users/${userId}/sessions/${sessionId}`);
    await setDoc(sessionRef, { deleted: true, updatedAt: serverTimestamp() }, { merge: true });
    // Note: Firestore doesn't support cascading deletes in client SDK
    // Messages subcollection will remain but won't be loaded
  } catch (error) {
    log.error("Failed to delete session from Firestore:", error);
    throw error;
  }
};

/**
 * Real-time sync listener for a session
 */
export const subscribeToSession = (
  userId: string,
  sessionId: string,
  callback: (session: Session | null) => void
): (() => void) => {
  if (!db || !userId) {
    return () => {};
  }

  const sessionRef = doc(db, `users/${userId}/sessions/${sessionId}`);
  
  return onSnapshot(
    sessionRef,
    async (snapshot: DocumentSnapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      
      try {
        const session = firestoreToSession(sessionId, snapshot.data()!);
        
        // Load messages
        const messagesRef = collection(sessionRef, "messages");
        const messagesQuery = query(
          messagesRef,
          orderBy("timestamp", "asc"),
          limit(1000)
        );
        
        const messagesSnap = await getDocs(messagesQuery);
        const messages = messagesSnap.docs.map((doc) =>
          firestoreToMessage(doc.id, doc.data())
        );
        
        callback({
          ...session,
          messages,
        });
      } catch (error) {
        log.error("Error in session snapshot:", error);
        callback(null);
      }
    },
    (error) => {
      log.error("Session sync error:", error);
      callback(null);
    }
  );
};

/**
 * Real-time sync listener for all sessions
 */
export const subscribeToAllSessions = (
  userId: string,
  callback: (sessions: Session[]) => void
): (() => void) => {
  if (!db || !userId) {
    return () => {};
  }

  const sessionsRef = collection(db, `users/${userId}/sessions`);
  
  return onSnapshot(
    query(sessionsRef, orderBy("updatedAt", "desc")),
    (snapshot: QuerySnapshot) => {
      const sessions: Session[] = snapshot.docs
        .map((doc) => {
          try {
            return firestoreToSession(doc.id, doc.data());
          } catch (error) {
            log.error("Error parsing session:", error);
            return null;
          }
        })
        .filter((s): s is Session => s !== null && validateSession(s));
      
      callback(sessions);
    },
    (error) => {
      log.error("Sessions sync error:", error);
      callback([]);
    }
  );
};

