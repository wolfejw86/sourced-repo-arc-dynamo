import arc from '@architect/functions';
import debug from 'debug';

const log = debug('sourced-repo-arc-dynamo');

interface TConstructor<TSourcedEntity> {
  new (snapshot?: any, events?: any[]): TSourcedEntity;
}

interface SourcedEntity {
  id: string;
  eventsToEmit: any[];
  newEvents: any[];
  version: number;
  snapshotVersion: number;
  snapshot: () => any;
}

interface RepositoryOptions {
  snapshotFrequency?: number;
}

export class Repository<T extends SourcedEntity> {
  private entityConstructorRef: TConstructor<T>;
  private snapshotFrequency: number;
  private snapshotTableName: string;
  private eventTableName: string;
  private events: any;
  private snapshots: any;
  private options: RepositoryOptions;
  private entityName: string;

  constructor(entityType: TConstructor<T>, options: RepositoryOptions = {}) {
    this.options = options;
    this.entityConstructorRef = entityType;
    this.snapshotFrequency = this.options.snapshotFrequency || 10;
    this.entityName = entityType.name.toLowerCase();
    this.snapshotTableName = `${this.entityName}snapshots`;
    this.eventTableName = `${this.entityName}events`;
  }

  async get(id: string) {
    const snapshot = await this.getLatestSnapshotById(id);
    const events = await this.getEvents(
      id,
      (snapshot && snapshot.version) || 0
    );

    return new this.entityConstructorRef(snapshot, events);
  }

  async commit(
    entity: T,
    options: { forceSnapshot: boolean } = { forceSnapshot: false }
  ) {
    log('committing %s for id %s', this.entityConstructorRef.name, entity.id);

    try {
      await this.commitEvents(entity);
      await this.commitSnapshots(entity, options);
      this.emitEvents(entity);
    } catch (error) {
      log(
        'error committing %s for id %s',
        this.entityConstructorRef.name,
        entity.id
      );
      throw error;
    }
  }

  /**
   * gets latest snapshot using an index
   */
  private async getLatestSnapshotByIndex(
    key: string,
    keyValue: string,
    indexName: string = key
  ) {
    const record = await this.snapshots
      .query({
        IndexName: indexName + '-index',
        KeyConditionExpression: key + ' = :keyvalue',
        ExpressionAttributeValues: {
          ':keyvalue': keyValue,
        },
        ScanIndexForward: false,
      })
      .catch((err: any) => {
        log(err);
        return {};
      });

    if (!record.Items[0]) {
      return null;
    }

    return record.Items[0];
  }

  private async getEvents(id: string, latestVersion = 0) {
    const latestEvents = await this.events.query({
      KeyConditionExpression: 'id = :id AND version > :version',
      ExpressionAttributeValues: {
        ':id': id,
        ':version': latestVersion,
      },
    });

    return latestEvents.Items;
  }

  /**
   * gets latest snapshot by id
   */
  private async getLatestSnapshotById(id: string) {
    return this.snapshots
      .query({
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': id,
        },
        Limit: 5,
        ScanIndexForward: false,
      })
      .then((result: any) => {
        return result.Items[0] || null;
      });
  }

  /**
   * requires there to already be a snapshot to use this method
   */
  async getByIndex(key: string, keyValue: string, indexName: string = key) {
    const snapshot = await this.getLatestSnapshotByIndex(
      key,
      keyValue,
      indexName
    );

    if (!snapshot) {
      return null;
    }

    const latestVersion = (snapshot && snapshot.version) || 0;

    const events = await this.getEvents(snapshot.id, latestVersion);

    return new this.entityConstructorRef(snapshot, events);
  }

  private async commitEvents(entity: T) {
    if (entity.newEvents.length === 0) {
      return;
    }

    if (!entity.id) {
      new Error(
        `Cannot commit an entity of type [${this.entityConstructorRef.name}] without an [id] property`
      );
    }

    const events = entity.newEvents;

    events.forEach((event: any) => {
      event.id = entity.id;
    });

    log('Inserting events for %s', this.entityConstructorRef.name);
    await Promise.all(events.map((event: any) => this.events.put(event)));
    log('Successfully committed events for %s', this.entityConstructorRef.name);

    entity.newEvents = [];
  }

  private async commitSnapshots(entity: T, options = { forceSnapshot: false }) {
    if (
      options.forceSnapshot ||
      entity.version >= entity.snapshotVersion + this.snapshotFrequency
    ) {
      const snapshot = entity.snapshot();

      log('Inserting snapshot for %s', this.entityConstructorRef.name);
      await this.snapshots.put(snapshot);
      log(
        'Successfully committed snapshot for %s',
        this.entityConstructorRef.name
      );
    }
  }

  private emitEvents(entity: T) {
    const eventsToEmit = entity.eventsToEmit;
    entity.eventsToEmit = [];
    eventsToEmit.forEach(event => {
      const args = Array.from(event);
      this.entityConstructorRef.prototype.emit.apply(entity, args);
    });
  }

  init() {
    return arc
      .tables()
      .then((data: any) => {
        this.events = data[this.eventTableName.toLowerCase()];
        this.snapshots = data[this.snapshotTableName.toLowerCase()];

        log(`initialized ${this.entityName} entity store`);
      })
      .catch((error: any) => {
        log(
          `Error initializing ${this.entityName} entity store - Error: ${error}`
        );
        throw error;
      });
  }
}

export default Repository;
