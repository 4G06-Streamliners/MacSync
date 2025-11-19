/**
 * Cross-tab authentication communication utilities
 * Allows different tabs/windows to notify each other about auth changes
 */

const CHANNEL_NAME = 'large-event-auth';
const STORAGE_KEY = 'large-event-logout-event';

/**
 * Broadcast a logout event to all other tabs/windows
 * Uses BroadcastChannel API with localStorage fallback for compatibility
 */
export function broadcastLogout(): void {
  // Primary method: BroadcastChannel (modern browsers)
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({
        type: 'logout',
        timestamp: Date.now(),
        source: 'teamd-admin'
      });
      channel.close();
    } catch (error) {
      console.error('BroadcastChannel error:', error);
    }
  }

  // Fallback method: localStorage event (works in older browsers)
  try {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    // Remove immediately to trigger storage event in other tabs
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('localStorage error:', error);
  }
}

/**
 * Listen for logout events from other tabs/windows
 * @param onLogout - Callback function to execute when logout is broadcast
 * @returns Cleanup function to stop listening
 */
export function listenForLogout(onLogout: () => void): () => void {
  const cleanupFunctions: (() => void)[] = [];

  // Primary method: BroadcastChannel
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);

      channel.onmessage = (event) => {
        if (event.data?.type === 'logout') {
          console.log('Received logout broadcast from another tab');
          onLogout();
        }
      };

      cleanupFunctions.push(() => channel.close());
    } catch (error) {
      console.error('BroadcastChannel listener error:', error);
    }
  }

  // Fallback method: localStorage event
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      console.log('Received logout via localStorage event');
      onLogout();
    }
  };

  window.addEventListener('storage', storageHandler);
  cleanupFunctions.push(() => window.removeEventListener('storage', storageHandler));

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}
