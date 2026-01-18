/**
 * EventBus - Central Event System
 *
 * Phase 04-03: Event-driven communication for Nexus components.
 * Provides type-safe event emission and subscription with wildcard support.
 *
 * Features:
 * - Type-safe event handling with EventPayloadMap
 * - Wildcard subscriptions (e.g., 'task:*')
 * - Once subscriptions (auto-unsubscribe after first call)
 * - Async event handlers
 * - Event history for debugging
 *
 * @module orchestration/events
 */

import { nanoid } from 'nanoid';
import type {
  EventType,
  EventPayloadMap,
  NexusEvent,
  EventHandler,
  TypedNexusEvent,
} from '../../types/events';

/**
 * Options for emitting events
 */
export interface EmitOptions {
  /** Correlation ID for tracing related events */
  correlationId?: string;
  /** Source component name */
  source?: string;
}

/**
 * Wildcard handler for matching multiple event types
 */
export type WildcardHandler = (event: NexusEvent) => void | Promise<void>;

/**
 * Unsubscribe function returned by subscription methods
 */
export type Unsubscribe = () => void;

/**
 * Internal subscription entry
 */
interface Subscription {
  id: string;
  handler: EventHandler | WildcardHandler;
  once: boolean;
}

/**
 * EventBus Interface
 */
export interface IEventBus {
  emit<T extends EventType>(
    type: T,
    payload: EventPayloadMap[T],
    options?: EmitOptions
  ): Promise<void>;
  on<T extends EventType>(
    type: T,
    handler: EventHandler<EventPayloadMap[T]>
  ): Unsubscribe;
  once<T extends EventType>(
    type: T,
    handler: EventHandler<EventPayloadMap[T]>
  ): Unsubscribe;
  off<T extends EventType>(
    type: T,
    handler: EventHandler<EventPayloadMap[T]>
  ): void;
  onAny(handler: WildcardHandler): Unsubscribe;
  offAny(handler: WildcardHandler): void;
  getEventHistory(limit?: number): NexusEvent[];
  clearHistory(): void;
}

/**
 * EventBus - Central event system for Nexus
 *
 * @example
 * ```typescript
 * const bus = new EventBus();
 *
 * // Subscribe to specific event
 * const unsub = bus.on('task:completed', (event) => {
 *   console.log('Task completed:', event.payload.taskId);
 * });
 *
 * // Subscribe to all task events
 * bus.onAny((event) => {
 *   if (event.type.startsWith('task:')) {
 *     console.log('Task event:', event.type);
 *   }
 * });
 *
 * // Emit event
 * await bus.emit('task:completed', {
 *   taskId: 'task-1',
 *   result: { success: true, ... }
 * });
 *
 * // Unsubscribe
 * unsub();
 * ```
 */
export class EventBus implements IEventBus {
  /** Singleton instance for static getInstance() */
  private static instance: EventBus | null = null;

  /** Event subscriptions by type */
  private subscriptions: Map<EventType, Subscription[]> = new Map();

  /** Wildcard subscriptions (receive all events) */
  private wildcardSubscriptions: Subscription[] = [];

  /** Event history for debugging */
  private history: NexusEvent[] = [];

  /** Maximum history size */
  private maxHistorySize: number;

  /** Default source name */
  private defaultSource: string;

  /**
   * Create a new EventBus
   *
   * @param options - Configuration options
   */
  constructor(options: { maxHistorySize?: number; defaultSource?: string } = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 1000;
    this.defaultSource = options.defaultSource ?? 'nexus';
  }

  /**
   * Get the singleton EventBus instance
   * Static method for compatibility with getInstance() pattern
   *
   * @returns Global EventBus instance
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    EventBus.instance = null;
  }

  /**
   * Emit an event to all subscribed handlers
   *
   * @param type - Event type
   * @param payload - Event payload
   * @param options - Emit options
   */
  async emit<T extends EventType>(
    type: T,
    payload: EventPayloadMap[T],
    options: EmitOptions = {}
  ): Promise<void> {
    const event: TypedNexusEvent<T> = {
      id: nanoid(),
      type,
      timestamp: new Date(),
      payload,
      source: options.source ?? this.defaultSource,
      correlationId: options.correlationId,
    };

    // Add to history
    this.addToHistory(event);

    // Get type-specific subscriptions
    const typeSubscriptions = this.subscriptions.get(type) ?? [];

    // Collect handlers to call
    const handlers: { sub: Subscription; handler: EventHandler | WildcardHandler }[] = [];

    // Add type-specific handlers
    for (const sub of typeSubscriptions) {
      handlers.push({ sub, handler: sub.handler });
    }

    // Add wildcard handlers
    for (const sub of this.wildcardSubscriptions) {
      handlers.push({ sub, handler: sub.handler });
    }

    // Track once subscriptions to remove
    const toRemove: { type: EventType | null; id: string }[] = [];

    // Call all handlers
    await Promise.all(
      handlers.map(async ({ sub, handler }) => {
        try {
          await handler(event as NexusEvent);
        } catch (error) {
          // Log error but don't fail other handlers
          console.error(`EventBus handler error for ${type}:`, error);
        }

        // Mark once subscriptions for removal
        if (sub.once) {
          const isWildcard = this.wildcardSubscriptions.includes(sub);
          toRemove.push({ type: isWildcard ? null : type, id: sub.id });
        }
      })
    );

    // Remove once subscriptions
    for (const { type: subType, id } of toRemove) {
      if (subType === null) {
        this.wildcardSubscriptions = this.wildcardSubscriptions.filter((s) => s.id !== id);
      } else {
        const subs = this.subscriptions.get(subType);
        if (subs) {
          this.subscriptions.set(
            subType,
            subs.filter((s) => s.id !== id)
          );
        }
      }
    }
  }

  /**
   * Subscribe to an event type
   *
   * @param type - Event type to subscribe to
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  on<T extends EventType>(
    type: T,
    handler: EventHandler<EventPayloadMap[T]>
  ): Unsubscribe {
    const subscription: Subscription = {
      id: nanoid(),
      handler: handler as EventHandler,
      once: false,
    };

    const existing = this.subscriptions.get(type) ?? [];
    this.subscriptions.set(type, [...existing, subscription]);

    return () => {
      const subs = this.subscriptions.get(type);
      if (subs) {
        this.subscriptions.set(
          type,
          subs.filter((s) => s.id !== subscription.id)
        );
      }
    };
  }

  /**
   * Subscribe to an event type (single trigger)
   *
   * @param type - Event type to subscribe to
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  once<T extends EventType>(
    type: T,
    handler: EventHandler<EventPayloadMap[T]>
  ): Unsubscribe {
    const subscription: Subscription = {
      id: nanoid(),
      handler: handler as EventHandler,
      once: true,
    };

    const existing = this.subscriptions.get(type) ?? [];
    this.subscriptions.set(type, [...existing, subscription]);

    return () => {
      const subs = this.subscriptions.get(type);
      if (subs) {
        this.subscriptions.set(
          type,
          subs.filter((s) => s.id !== subscription.id)
        );
      }
    };
  }

  /**
   * Unsubscribe from an event type
   *
   * @param type - Event type
   * @param handler - Handler function to remove
   */
  off<T extends EventType>(
    type: T,
    handler: EventHandler<EventPayloadMap[T]>
  ): void {
    const subs = this.subscriptions.get(type);
    if (subs) {
      this.subscriptions.set(
        type,
        subs.filter((s) => s.handler !== handler)
      );
    }
  }

  /**
   * Subscribe to all events (wildcard)
   *
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  onAny(handler: WildcardHandler): Unsubscribe {
    const subscription: Subscription = {
      id: nanoid(),
      handler,
      once: false,
    };

    this.wildcardSubscriptions.push(subscription);

    return () => {
      this.wildcardSubscriptions = this.wildcardSubscriptions.filter(
        (s) => s.id !== subscription.id
      );
    };
  }

  /**
   * Unsubscribe from all events (wildcard)
   *
   * @param handler - Handler function to remove
   */
  offAny(handler: WildcardHandler): void {
    this.wildcardSubscriptions = this.wildcardSubscriptions.filter(
      (s) => s.handler !== handler
    );
  }

  /**
   * Get event history
   *
   * @param limit - Maximum number of events to return (default: 100)
   * @returns Array of recent events
   */
  getEventHistory(limit = 100): NexusEvent[] {
    return this.history.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get subscription count for an event type
   *
   * @param type - Event type
   * @returns Number of subscriptions
   */
  getSubscriptionCount(type: EventType): number {
    return (this.subscriptions.get(type) ?? []).length;
  }

  /**
   * Get total subscription count (including wildcards)
   *
   * @returns Total number of subscriptions
   */
  getTotalSubscriptionCount(): number {
    let count = this.wildcardSubscriptions.length;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }

  /**
   * Add event to history with size limit
   */
  private addToHistory(event: NexusEvent): void {
    this.history.push(event);
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }
}

/**
 * Singleton instance for global event bus
 */
let globalEventBus: EventBus | null = null;

/**
 * Get the global EventBus instance
 *
 * @returns Global EventBus instance
 */
export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

/**
 * Reset the global EventBus (for testing)
 */
export function resetEventBus(): void {
  globalEventBus = null;
}
