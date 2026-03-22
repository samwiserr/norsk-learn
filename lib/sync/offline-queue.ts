import { randomHexBytes } from "@/lib/secureRandom";
import { saveToLocalStorage, loadFromLocalStorage } from "@/lib/storage";
import { Session, validateSession } from "@/lib/sessions";

interface QueuedOperation {
  id: string;
  type: "CREATE_SESSION" | "UPDATE_SESSION" | "DELETE_SESSION" | "SEND_MESSAGE";
  sessionId: string;
  data: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = "norsk_sync_queue";
const MAX_RETRIES = 3;

/**
 * Add an operation to the offline queue
 */
export const addToOfflineQueue = (
  operation: Omit<QueuedOperation, "id" | "timestamp" | "retries">
): void => {
  if (typeof window === "undefined") return;
  
  const queue = getOfflineQueue();
  const operationWithMeta: QueuedOperation = {
    ...operation,
    id: `op_${Date.now()}_${randomHexBytes(6)}`,
    timestamp: Date.now(),
    retries: 0,
  };
  
  queue.push(operationWithMeta);
  saveToLocalStorage(QUEUE_KEY, queue);
};

/**
 * Get all queued operations
 */
export const getOfflineQueue = (): QueuedOperation[] => {
  return loadFromLocalStorage<QueuedOperation[]>(QUEUE_KEY) || [];
};

/**
 * Clear the offline queue
 */
export const clearOfflineQueue = (): void => {
  saveToLocalStorage(QUEUE_KEY, []);
};

/**
 * Remove specific operations from the queue
 */
export const removeFromOfflineQueue = (operationIds: string[]): void => {
  const queue = getOfflineQueue();
  const remaining = queue.filter((op) => !operationIds.includes(op.id));
  saveToLocalStorage(QUEUE_KEY, remaining);
};

/**
 * Process the offline queue
 */
export const processOfflineQueue = async (
  userId: string,
  syncFunction: (userId: string, session: Session) => Promise<void>
): Promise<void> => {
  if (typeof window === "undefined" || !navigator.onLine) {
    return;
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const processed: string[] = [];
  const failed: QueuedOperation[] = [];

  for (const operation of queue) {
    try {
      switch (operation.type) {
        case "UPDATE_SESSION":
          if (operation.data && validateSession(operation.data)) {
            await syncFunction(userId, operation.data);
            processed.push(operation.id);
          } else {
            // Invalid session data - remove from queue
            processed.push(operation.id);
          }
          break;
        case "CREATE_SESSION":
          if (operation.data && validateSession(operation.data)) {
            await syncFunction(userId, operation.data);
            processed.push(operation.id);
          } else {
            processed.push(operation.id);
          }
          break;
        case "DELETE_SESSION":
          // Handle delete operation
          // For now, just mark as processed
          processed.push(operation.id);
          break;
        default:
          // Unknown operation type - remove from queue
          processed.push(operation.id);
      }
    } catch (error) {
      // Operation failed, will be retried
      operation.retries++;
      if (operation.retries < MAX_RETRIES) {
        failed.push(operation);
      } else {
        // Max retries exceeded, removing from queue
        processed.push(operation.id); // Remove from queue
      }
    }
  }

  // Update queue - keep failed operations and remove processed ones
  const remaining = queue.filter(
    (op) => !processed.includes(op.id)
  );
  
  // Update retry counts for failed operations
  const updatedFailed = failed.map((op) => ({
    ...op,
    timestamp: Date.now(), // Update timestamp for retry delay
  }));
  
  saveToLocalStorage(QUEUE_KEY, [...remaining, ...updatedFailed]);
};


/**
 * Get queue statistics
 */
export const getQueueStats = () => {
  const queue = getOfflineQueue();
  return {
    total: queue.length,
    pending: queue.filter((op) => op.retries < MAX_RETRIES).length,
    failed: queue.filter((op) => op.retries >= MAX_RETRIES).length,
  };
};

