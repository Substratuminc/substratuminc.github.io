// src/engine/EventBus.ts

type EventCallback = (payload: any) => void;

class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  public on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  public emit(event: string, payload?: any): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(callback => {
        try {
          callback(payload);
        } catch (e) {
          console.error(`Error in EventBus listener for event "${event}":`, e);
        }
      });
    }
  }
}

export const eventBus = new EventBus();
