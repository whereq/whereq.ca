type Listener<T = unknown> = (data: T) => void;

class EventEmitter {
  private events: { [event: string]: Listener[] } = {};

  on<T>(event: string, listener: Listener<T>) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener as Listener);
  }

  off<T>(event: string, listener: Listener<T>) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit<T>(event: string, data: T) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(data));
  }
}

export const eventEmitter = new EventEmitter();