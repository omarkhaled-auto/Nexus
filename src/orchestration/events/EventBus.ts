// EventBus - Stub for TDD RED phase
// Phase 04-03: Cross-layer event communication

import type {
  EventType,
  EventPayload,
  NexusEvent,
  EventHandler,
} from '@/types/events';

/**
 * Options for emitting events
 */
export interface EmitOptions {
  correlationId?: string;
  source?: string;
}

/**
 * Wildcard handler type - receives all events
 */
export type WildcardHandler = (event: NexusEvent<unknown>) => void | Promise<void>;

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * EventBus provides type-safe pub/sub across all Nexus layers.
 * Singleton pattern ensures all components use the same bus.
 */
export class EventBus {
  private static instance: EventBus | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    EventBus.instance = null;
  }

  /**
   * Emit an event to all registered handlers
   */
  emit<T extends EventType>(
    _type: T,
    _payload: EventPayload<T>,
    _options?: EmitOptions
  ): void {
    throw new Error('Not implemented');
  }

  /**
   * Subscribe to events of a specific type
   */
  on<T extends EventType>(
    _type: T,
    _handler: EventHandler<EventPayload<T>>
  ): Unsubscribe {
    throw new Error('Not implemented');
  }

  /**
   * Subscribe to events of a specific type, but only fire once
   */
  once<T extends EventType>(
    _type: T,
    _handler: EventHandler<EventPayload<T>>
  ): Unsubscribe {
    throw new Error('Not implemented');
  }

  /**
   * Unsubscribe a specific handler from an event type
   */
  off<T extends EventType>(
    _type: T,
    _handler: EventHandler<EventPayload<T>>
  ): void {
    throw new Error('Not implemented');
  }

  /**
   * Subscribe to all events (wildcard)
   */
  onAny(_handler: WildcardHandler): Unsubscribe {
    throw new Error('Not implemented');
  }

  /**
   * Remove all listeners for a specific type or all types
   */
  removeAllListeners(_type?: EventType): void {
    throw new Error('Not implemented');
  }

  /**
   * Get the number of listeners for an event type
   */
  listenerCount(_type: EventType): number {
    throw new Error('Not implemented');
  }
}
