declare module 'sourced' {
  import { EventEmitter } from 'events';

  /**
   * Extends native Error object
   */
  export class EntityError extends Error {
    /**
     * @param {string} message An optional error message.
     * @param {object} constructor An optional constructor to pass to `captureStackTrace`. Default: `this`.
     */
    constructor(message?: string, constructor?: any);
  }

  export interface SnapshotBase {
    _eventsCount: number;
    snapshotVersion: number;
    timestamp: number;
    version: number;
    id: string;
  }

  /**
   * Add subclass as T for stronger typings for things like "digest"
   * - TODO add better way to type snapshots, for now TSnapshot will work
   */
  export class Entity<
    T = any,
    TSnapshot extends SnapshotBase = any
  > extends EventEmitter {
    public id: string;

    public static digestMethod(type: string, fn: (...args: any[]) => any): any;

    public eventsToEmit: any[];

    public newEvents: any[];

    public replaying: boolean;

    public snapshotVersion: number;

    public timestamp: number;

    public version: number;

    public constructor(snapshot?: any, events?: any[]);

    public emit<TEvent>(event: string, ...args: TEvent[]): boolean;

    public enqueue<TEvent>(event: string, ...args: TEvent[]): void;

    public digest<TData>(method: keyof T, data?: TData): void;

    public merge(snapshot: TSnapshot): this;

    public mergeProperty(name: keyof T, value: any): void;

    public rehydrate(snapshot?: TSnapshot, events?: any[]): void;

    public replay<TEvent>(events: TEvent[]): void;

    public snapshot(): TSnapshot;

    private trimSnapshot(snapshot: TSnapshot): TSnapshot;

    public static mergeProperty(
      ctor: new (snapshot?: any, events?: any[]) => Entity,
      name: string,
      fn: (...args: any[]) => any
    ): void;
  }
}
