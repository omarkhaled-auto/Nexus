// EventBus - Cross-Layer Event Communication
// Phase 04-03: Type-safe pub/sub with singleton pattern

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
 * Internal handler wrapper for type-safe handling
 */
type InternalHandler = EventHandler<unknown>;

/**
 * EventBus provides type-safe pub/sub across all Nexus layers.
 * Singleton pattern ensures all components use the same bus.
 *
 * Features:
 * - Type-safe event emission and subscription
 * - Wildcard handlers for logging/monitoring
 * - Once-only subscriptions
 * - Error isolation between handlers
 */
export class EventBus {
  private static instance: EventBus | null = null;

  /** Event type to handlers map */
  private handlers: Map<EventType, Set<InternalHandler>> = new Map();

  /** Wildcard handlers that receive all events */
  private wildcardHandlers: Set<WildcardHandler> = new Set();

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
   *
   * @param type Event type from EventType union
   * @param payload Type-safe payload for the event type
   * @param options Optional correlationId and source override
   */
  emit<T extends EventType>(
    type: T,
    payload: EventPayload<T>,
    options?: EmitOptions
  ): void {
    // Create the event object
    const event: NexusEvent<EventPayload<T>> = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date(),
      payload,
      source: options?.source ?? 'EventBus',
      correlationId: options?.correlationId,
    };

    // Call type-specific handlers
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        this.safeCall(handler, event);
      }
    }

    // Call wildcard handlers
    for (const handler of this.wildcardHandlers) {
      this.safeCall(handler, event);
    }
  }

  /**
   * Subscribe to events of a specific type
   *
   * @param type Event type to subscribe to
   * @param handler Handler function called with NexusEvent
   * @returns Unsubscribe function
   */
  on<T extends EventType>(
    type: T,
    handler: EventHandler<EventPayload<T>>
  ): Unsubscribe {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    const internalHandler = handler as InternalHandler;
    this.handlers.get(type)!.add(internalHandler);

    return () => {
      this.handlers.get(type)?.delete(internalHandler);
    };
  }

  /**
   * Subscribe to events of a specific type, but only fire once
   *
   * @param type Event type to subscribe to
   * @param handler Handler function called with NexusEvent
   * @returns Unsubscribe function
   */
  once<T extends EventType>(
    type: T,
    handler: EventHandler<EventPayload<T>>
  ): Unsubscribe {
    let unsubscribed = false;

    const wrappedHandler: EventHandler<EventPayload<T>> = (event) => {
      if (unsubscribed) return;
      unsubscribed = true;
      unsubscribe();
      handler(event);
    };

    const unsubscribe = this.on(type, wrappedHandler);

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  }

  /**
   * Unsubscribe a specific handler from an event type
   *
   * @param type Event type
   * @param handler Handler to remove
   */
  off<T extends EventType>(
    type: T,
    handler: EventHandler<EventPayload<T>>
  ): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler as InternalHandler);
    }
  }

  /**
   * Subscribe to all events (wildcard)
   *
   * @param handler Handler function called with any event
   * @returns Unsubscribe function
   */
  onAny(handler: WildcardHandler): Unsubscribe {
    this.wildcardHandlers.add(handler);

    return () => {
      this.wildcardHandlers.delete(handler);
    };
  }

  /**
   * Remove all listeners for a specific type or all types
   *
   * @param type Optional event type - if omitted, removes ALL handlers
   */
  removeAllListeners(type?: EventType): void {
    if (type) {
      this.handlers.delete(type);
    } else {
      this.handlers.clear();
      this.wildcardHandlers.clear();
    }
  }

  /**
   * Get the number of listeners for an event type
   *
   * @param type Event type
   * @returns Number of registered handlers
   */
  listenerCount(type: EventType): number {
    return this.handlers.get(type)?.size ?? 0;
  }

  /**
   * Safely call a handler, catching any errors to prevent
   * one handler from affecting others
   */
  private safeCall(
    handler: InternalHandler | WildcardHandler,
    event: NexusEvent<unknown>
  ): void {
    try {
      const result = handler(event);
      // Handle async handlers - just let them run, don't wait
      if (result instanceof Promise) {
        result.catch(() => {
          // Swallow async errors silently
        });
      }
    } catch {
      // Swallow sync errors silently
    }
  }
}
