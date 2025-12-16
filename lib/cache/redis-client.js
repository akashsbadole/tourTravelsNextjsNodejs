import "server-only";

/**
 * Redis Client Manager
 * Handles Redis connection and configuration
 */
export class RedisClientManager {
  constructor(config = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB) || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      ...config
    };
    
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis connection
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      // Dynamic import to avoid bundling issues
      const Redis = await import('redis').then(mod => mod.createClient);
      
      this.client = Redis({
        socket: {
          host: this.config.host,
          port: this.config.port,
        },
        password: this.config.password,
        database: this.config.database,
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        enableReadyCheck: this.config.enableReadyCheck,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        lazyConnect: this.config.lazyConnect,
      });

      // Event listeners
      this.client.on('connect', () => {
        console.log('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        console.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('Redis client disconnected');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis client reconnecting');
      });

      // Connect to Redis
      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      
      console.log('Redis connection established successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Get Redis client instance
   * @returns {Object} Redis client
   */
  getClient() {
    return this.client;
  }

  /**
   * Check if Redis is connected
   * @returns {boolean} Connection status
   */
  isRedisConnected() {
    return this.isConnected && this.client;
  }

  /**
   * Health check for Redis
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      if (!this.client) {
        return {
          healthy: false,
          error: 'Redis client not initialized'
        };
      }

      const start = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - start;

      return {
        healthy: true,
        responseTime,
        config: {
          host: this.config.host,
          port: this.config.port,
          database: this.config.database
        }
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Get Redis info
   * @returns {Promise<Object>} Redis server info
   */
  async getInfo() {
    try {
      if (!this.client) {
        throw new Error('Redis client not initialized');
      }

      const info = await this.client.info();
      const infoLines = info.split('\r\n');
      const infoObj = {};

      infoLines.forEach(line => {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            infoObj[key] = value;
          }
        }
      });

      return infoObj;
    } catch (error) {
      console.error('Failed to get Redis info:', error);
      throw error;
    }
  }

  /**
   * Flush all data from current database
   * @returns {Promise<boolean>} Success status
   */
  async flushDb() {
    try {
      if (!this.client) {
        throw new Error('Redis client not initialized');
      }

      await this.client.flushDb();
      return true;
    } catch (error) {
      console.error('Failed to flush Redis database:', error);
      return false;
    }
  }
}

// Singleton instance
let redisClientManager = null;

/**
 * Get or create Redis client manager instance
 * @param {Object} config - Configuration
 * @returns {RedisClientManager} Redis client manager instance
 */
export async function getRedisClientManager(config) {
  if (!redisClientManager) {
    redisClientManager = new RedisClientManager(config);
    await redisClientManager.connect();
  }
  return redisClientManager;
}

/**
 * Get Redis client directly
 * @param {Object} config - Configuration
 * @returns {Object} Redis client
 */
export async function getRedisClient(config) {
  const manager = await getRedisClientManager(config);
  return manager.getClient();
}