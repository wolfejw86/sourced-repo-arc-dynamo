import { Repository } from '../src/index';
const Entity = require('sourced/dist/entity').default;

const ArcTablesDynamoMock = {
  testentityevents: {
    put: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue([
      {
        method: 'init',
        data: undefined,
        timestamp: 1606703172298,
        version: 1,
      },
      {
        method: 'addOne',
        data: undefined,
        timestamp: 1606703172298,
        version: 2,
      },
      {
        method: 'addOne',
        data: undefined,
        timestamp: 1606703172298,
        version: 3,
      },
    ]),
  },
  testentitysnapshots: {
    put: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue({
      _eventsCount: 0,
      snapshotVersion: 3,
      timestamp: 1606703254404,
      version: 3,
      total: 2,
      id: 'test-id',
    }),
  },
};

jest.mock('@architect/functions', () => ({
  tables: jest.fn(async () => ArcTablesDynamoMock),
}));

class TestEntity extends Entity {
  constructor(snapshot?: any, events?: any) {
    super();

    this.total = 0;
    this.id = null;
  }

  init() {
    this.id = 'test-id';
    this.digest('init');
  }

  addOne() {
    this.total += 1;
    this.digest('addOne');
    this.enqueue('oneAdded');
  }
}

describe('Repository tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a Repository', () => {
    const repo = new Repository(TestEntity as any);

    expect(repo).toBeInstanceOf(Repository);
  });

  it('should commit events and snapshot when forceSnapshot: true', async () => {
    const testEntity = new TestEntity();
    testEntity.init();
    testEntity.addOne();
    testEntity.addOne();

    const repo = new Repository(TestEntity as any);

    const oneAdded = new Promise(resolve =>
      testEntity.once('oneAdded', resolve)
    );

    await repo.init();
    await repo.commit(testEntity as any, { forceSnapshot: true });

    await oneAdded;

    expect(
      ArcTablesDynamoMock.testentityevents.put.mock.calls[0][0].method
    ).toEqual('init');
    expect(
      ArcTablesDynamoMock.testentityevents.put.mock.calls[1][0].method
    ).toEqual('addOne');
    expect(
      ArcTablesDynamoMock.testentityevents.put.mock.calls[2][0].method
    ).toEqual('addOne');
    expect(
      ArcTablesDynamoMock.testentitysnapshots.put.mock.calls[0][0].total
    ).toEqual(2);
  });

  it('should only commit events when snapshot frequency is not met', async () => {
    const testEntity = new TestEntity();
    testEntity.init();
    testEntity.addOne();
    testEntity.addOne();

    const repo = new Repository(TestEntity as any);

    const oneAdded = new Promise(resolve =>
      testEntity.once('oneAdded', resolve)
    );

    await repo.init();
    await repo.commit(testEntity as any);

    await oneAdded;

    expect(
      ArcTablesDynamoMock.testentityevents.put.mock.calls[0][0].method
    ).toEqual('init');
    expect(
      ArcTablesDynamoMock.testentityevents.put.mock.calls[1][0].method
    ).toEqual('addOne');
    expect(
      ArcTablesDynamoMock.testentityevents.put.mock.calls[2][0].method
    ).toEqual('addOne');
    expect(ArcTablesDynamoMock.testentitysnapshots.put).not.toHaveBeenCalled();
  });

  it.todo('should fire enqueued events after successful commit');
  it.todo('should be able to retrieve entity that only has events');
  it.todo(
    'should retrieve latest snapshot and events for entity and merge together into model'
  );
  it.todo('should throw error when commit fails for events');
  it.todo('should throw when commit fails for events');
});
