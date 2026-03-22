import { randomHexBytes } from "@/lib/secureRandom";

export interface SyncMessage {
  type: "SESSION_UPDATED" | "SESSION_CREATED" | "SESSION_DELETED" | "SYNC_REQUEST" | "SYNC_RESPONSE";
  sessionId?: string;
  data?: any;
  timestamp: number;
  source?: string; // Tab identifier
}

const SYNC_CHANNEL = "norsk_sync_channel";

export class MultiTabSync {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private tabId: string;

  constructor() {
    if (typeof window === "undefined") {
      this.tabId = "server";
      return;
    }
    
    this.tabId = `tab_${Date.now()}_${randomHexBytes(6)}`;
    this.channel = new BroadcastChannel(SYNC_CHANNEL);
    this.channel.onmessage = (event) => this.handleMessage(event);
    
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.broadcast({
          type: "SYNC_REQUEST",
          timestamp: Date.now(),
          source: this.tabId,
        });
      }
    });
  }

  private handleMessage(event: MessageEvent<SyncMessage>) {
    const { type, sessionId, data, source } = event.data;
    
    // Ignore messages from this tab
    if (source === this.tabId) {
      return;
    }

    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach((callback) => callback({ sessionId, data }));
    }
  }

  /**
   * Subscribe to a specific message type
   */
  subscribe(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /**
   * Broadcast a message to all tabs
   */
  broadcast(message: SyncMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage({
          ...message,
          timestamp: Date.now(),
          source: this.tabId,
        });
      } catch {
        // Channel may have been closed during page unload
      }
    }
  }

  /**
   * Close the broadcast channel
   */
  close(): void {
    this.channel?.close();
    this.listeners.clear();
  }
}

// Singleton instance
let multiTabSyncInstance: MultiTabSync | null = null;

export const getMultiTabSync = (): MultiTabSync => {
  if (typeof window === "undefined") {
    return new MultiTabSync(); // Return a dummy instance on server
  }
  
  if (!multiTabSyncInstance) {
    multiTabSyncInstance = new MultiTabSync();
  }
  
  return multiTabSyncInstance;
};

// Cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    multiTabSyncInstance?.close();
  });
}

