// __mocks__/pg.js
const mClient = {
    query: jest.fn(),
    release: jest.fn(),
};

const mPool = {
    query: jest.fn(),
    connect: jest.fn(() => Promise.resolve(mClient)), // Return the mocked client
    on: jest.fn(),
    end: jest.fn(),
};

module.exports = {
    Pool: jest.fn(() => mPool),
    // Export these so we can access them in tests to set return values
    _mockClient: mClient,
    _mockPool: mPool
};