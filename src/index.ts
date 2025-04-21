import * as crypto from 'crypto';

// Constants based on the text and AES-256
const KEY_SIZE_BYTES = 32; // 256 bits
const BLOCK_SIZE_BYTES = 16; // 128 bits
const MAX_GENERATE_BYTES = 1 << 20; // 2^20 bytes (1 MiB) limit per request
const NUM_POOLS = 32;
const RESEED_INTERVAL_MS = 100; // Minimum time between reseeds
const POOL_SIZE = 64; // Size of each pool in bytes

// Constants for generateInt32
const UINT32_MAX_COUNT = 0x100000000; // 2^32, the number of possible uint32 values

/**
 * FortunaRNG is a cryptographically secure random number generator
 * based on the Fortuna algorithm. It uses AES-256 in ECB mode
 * for block encryption and maintains multiple pools of entropy.
 * The generator is reseeded periodically based on the amount of
 * entropy collected and the time elapsed since the last reseed.
 * 
 * @link https://www.schneier.com/wp-content/uploads/2015/12/fortuna.pdf
 */
class FortunaRNG {
  private generatorKey: Buffer;
  private generatorCounter: Buffer;
  private pools: Buffer[];
  private reseedCount: number;
  private lastReseedTime: number;
  private minPoolSize: number;
  private seeded: boolean;

  /**
   * Initializes the Fortuna PRNG state.
   * @param seed Initial seed data (optional).
   */
  constructor(seed?: Buffer) {
    if (!seed) {
      throw new Error("Seed data is required to initialize the generator.");
    }

    this.minPoolSize = POOL_SIZE;
    // Initialize Generator (key and counter to zero)
    this.generatorKey = Buffer.alloc(KEY_SIZE_BYTES, 0);
    this.generatorCounter = Buffer.alloc(BLOCK_SIZE_BYTES, 0);

    // Initialize Pools (32 empty pools)
    this.pools = Array(NUM_POOLS).fill(null).map(() => Buffer.alloc(0));

    // Initialize Reseed tracking
    this.reseedCount = 0;
    this.lastReseedTime = 0;
    this.seeded = false; // Mark as not seeded initially

    // Set the initial seed
    this.seedFromData(seed);
  }

  /**
   * Hashes data using SHA-256.
   * @param data The data to hash.
   * @returns The SHA-256 hash digest.
   */
  private hash(data: Buffer): Buffer {
    return crypto.createHash('sha256').update(data).digest();
  }

  /**
   * Sleep for a short duration to avoid blocking the event loop.
   * This is used to prevent the generator from hogging CPU time
   * during large generation requests or when adding random events.
   */
  private async sleep() {
    await new Promise<void>(resolve => {
      setTimeout(() => {
        resolve();
      }, 1);
    })
  }

  /**
   * Increments the 128-bit counter (treating it as big-endian).
   */
  private incrementCounter(): void {
    for (let i = BLOCK_SIZE_BYTES - 1; i >= 0; i--) {
      if (this.generatorCounter[i] < 255) {
        this.generatorCounter[i]++;
        return; // No carry-over needed
      }
      // Carry-over
      this.generatorCounter[i] = 0;
    }
  }

  /**
   * Encrypts a single block using AES-256-ECB with the current generator key.
   * Used to encrypt the counter value.
   * @param block The 16-byte block (counter) to encrypt.
   * @returns The 16-byte encrypted block.
   */
  private blockEncrypt(block: Buffer): Buffer {
    if (!this.seeded && this.reseedCount === 0) {
      // This check might be redundant if generateBlocks already checks seeded status
      throw new Error("Generator not seeded yet.");
    }
    if (this.generatorKey.length !== KEY_SIZE_BYTES) {
      throw new Error(`Internal error: Invalid key size ${this.generatorKey.length}`);
    }
    // Use ECB mode with no padding. The 'iv' argument is ignored for ECB but required by the API.
    const cipher = crypto.createCipheriv('aes-256-ecb', this.generatorKey, null);
    cipher.setAutoPadding(false); // CRITICAL: Disable padding
    const encrypted = Buffer.concat([cipher.update(block), cipher.final()]);
    if (encrypted.length !== BLOCK_SIZE_BYTES) {
      // This should not happen with autoPadding disabled and correct block size input
      throw new Error(`Internal error: Encryption output size mismatch (${encrypted.length})`);
    }
    return encrypted;
  }

  /**
   * Generates k blocks of pseudorandom data using the generator's current state.
   * Corresponds to GENERATEBLOCKS in the text.
   * @param k Number of 16-byte blocks to generate.
   * @returns A Buffer containing k*16 bytes of pseudorandom data.
   */
  private generateBlocks(k: number): Buffer {
    if (!this.seeded) {
      // Check if the generator has been seeded at least once
      // The text uses C != 0 as the check, which means counter > 0
      // We use a separate 'seeded' flag set during the first reseed.
      throw new Error("Generator must be seeded before generating data.");
    }
    if (k <= 0) {
      return Buffer.alloc(0);
    }

    const output = Buffer.alloc(k * BLOCK_SIZE_BYTES);
    for (let i = 0; i < k; i++) {
      const encryptedBlock = this.blockEncrypt(this.generatorCounter);
      encryptedBlock.copy(output, i * BLOCK_SIZE_BYTES);
      this.incrementCounter();
    }

    return output;
  }

  /**
   * Generates n bytes of pseudorandom data and updates the generator key.
   * Corresponds to PSEUDORANDOMDATA in the text.
   * @param n Number of bytes to generate (max 1 MiB).
   * @returns A Buffer containing n bytes of pseudorandom data.
   */
  private pseudoRandomData(n: number): Buffer {
    if (n < 0 || n > MAX_GENERATE_BYTES) {
      throw new Error(`Invalid number of bytes requested: ${n}. Max is ${MAX_GENERATE_BYTES}.`);
    }
    if (n === 0) {
      return Buffer.alloc(0);
    }

    // Calculate number of blocks needed (ceiling division)
    const blocksNeeded = Math.ceil(n / BLOCK_SIZE_BYTES);

    // Generate the required random data
    const generatedData = this.generateBlocks(blocksNeeded);

    // Generate 2 more blocks for the new key (2 * 16 = 32 bytes = 256 bits)
    const newKeyData = this.generateBlocks(2);
    if (newKeyData.length !== KEY_SIZE_BYTES) {
      throw new Error(`Internal error: Failed to generate correct size for new key (${newKeyData.length})`);
    }
    this.generatorKey = newKeyData; // Update the key

    // Return only the requested number of bytes
    return generatedData.subarray(0, n);
  }

  /**
   * Updates the generator's state (key and counter) with new seed material.
   * Corresponds to RESEED in the text.
   * @param seedData Additional seed material (e.g., concatenated pool hashes or seed file data).
   */
  private reseed(seedData: Buffer): void {
    // K <- SHA-256(K || s)
    this.generatorKey = this.hash(Buffer.concat([this.generatorKey, seedData]));

    // Increment counter C <- C + 1
    this.incrementCounter();

    // Mark as seeded after the first reseed operation completes
    if (!this.seeded) {
      this.seeded = true;
    }

    // Increment reseed count
    this.reseedCount++;
  }

  /**
   * Generates 4 raw random bytes and returns them as an unsigned 32-bit integer.
   * @returns A random unsigned 32-bit integer (0 to 2^32 - 1).
   */
  private getRaw32(): number {
    const buffer = this.randomData(4); // Get 4 random bytes
    // Use Big Endian for consistency, though either works if used consistently
    return buffer.readUInt32BE(0);
  }

  // --- Public Methods ---

  /**
   * Adds a random event from a source to a specified pool.
   * Corresponds to ADDRANDOMEVENT in the text.
   * The caller (entropy source) is responsible for choosing the correct poolId
   * based on round-robin distribution.
   * @param sourceId Source identifier (0-255).
   * @param poolId Pool index (0-31).
   * @param eventData The entropy data (1-32 bytes).
   */
  public addRandomEvent(sourceId: number, poolId: number, eventData: Buffer): void {
    if (sourceId < 0 || sourceId > 255 || !Number.isInteger(sourceId)) {
      throw new Error(`Invalid sourceId: ${sourceId}`);
    }
    if (poolId < 0 || poolId >= NUM_POOLS || !Number.isInteger(poolId)) {
      throw new Error(`Invalid poolId: ${poolId}`);
    }
    const eventLen = eventData.length;
    if (eventLen < 1 || eventLen > 32) {
      // Text implies length 1..32 for event data 'e'
      throw new Error(`Invalid eventData length: ${eventLen}. Must be between 1 and 32.`);
    }

    // Encode as: sourceId (1 byte) || length(eventData) (1 byte) || eventData
    const encodedEvent = Buffer.concat([
      Buffer.from([sourceId, eventLen]),
      eventData
    ]);

    // Append to the specified pool
    this.pools[poolId] = Buffer.concat([this.pools[poolId], encodedEvent]);
  }

  /**
   * Generates n bytes of random data. Handles reseeding automatically if needed.
   * Corresponds to RANDOMDATA in the text.
   * @param n Number of bytes to generate.
   * @returns A Buffer containing n bytes of pseudorandom data.
   */
  public randomData(n: number): Buffer {
    const now = Date.now();

    // Check if reseeding is necessary
    if (this.pools[0].length >= this.minPoolSize && now - this.lastReseedTime >= RESEED_INTERVAL_MS) {
      let seedMaterial = Buffer.alloc(0);
      // Collect hashes from relevant pools
      for (let i = 0; i < NUM_POOLS; i++) {
        // Check if 2^i divides reseedCount
        if (this.reseedCount % (1 << i) === 0) {
          seedMaterial = Buffer.concat([seedMaterial, this.hash(this.pools[i])]);
          // Reset the pool after using it
          this.pools[i] = Buffer.alloc(0);
        }
      }

      // Perform the reseed operation
      this.reseed(seedMaterial);
      this.lastReseedTime = now;
    }

    // Check if generator is ready (must have been seeded at least once)
    if (!this.seeded) {
      throw new Error("Fortuna PRNG has not been seeded yet. Add entropy or load seed file.");
    }

    // Generate and return the random data
    if (n <= MAX_GENERATE_BYTES) {
      return this.pseudoRandomData(n);
    }

    // break into chunks and reseed for each chunk
    const chunks: Buffer[] = [];
    let remaining = n;
    let offset = 0;
    while (remaining > 0) {
      const chunkSize = Math.min(remaining, MAX_GENERATE_BYTES);
      // This will update the generator key and counter
      const chunk = this.pseudoRandomData(chunkSize);
      chunks.push(chunk);
      remaining -= chunkSize;
      offset += chunkSize;
      // Add random event to the pool
      this.addRandomEvent(255, 0, this.pseudoRandomData(POOL_SIZE));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Reseeds the generator from provided seed data (e.g., read from a file).
   * Corresponds to the input/reseed part of UPDATESEEDFILE.
   * The caller MUST ensure this seed data is used only once per boot sequence
   * and should call writeSeedData() soon after to generate a *new* seed file.
   * @param seedData The 64 bytes of seed data.
   */
  public seedFromData(seedData: Buffer): void {
    if (!seedData || seedData.length !== 64) {
      throw new Error("Seed data must be a Buffer of exactly 64 bytes.");
    }
    this.reseed(seedData);
    this.seeded = true;
    this.lastReseedTime = Date.now(); // Update time to prevent immediate pool reseed
  }

  /**
   * Generates a cryptographically secure random 32-bit integer uniformly
   * distributed in the range [min, max] (inclusive).
   * Uses rejection sampling to avoid modulo bias.
   *
   * @param min The minimum inclusive value.
   * @param max The maximum inclusive value.
   * @returns A random integer within the specified range.
   */
  public generateInt32(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error("min and max must be integers.");
    }
    if (min > max) {
      throw new Error("min cannot be greater than max.");
    }
    // Check if min/max are within standard 32-bit signed integer range if necessary,
    // but the logic works for any integer range where max-min+1 fits.
    // We assume the range fits within reasonable limits for JS numbers here.

    if (min === max) {
      return min; // Only one possible value
    }

    // Calculate the range size (number of possible values)
    const range = max - min + 1;

    // Calculate the limit to avoid modulo bias.
    // limit is the largest multiple of 'range' that is <= 2^32.
    // We want to reject raw values >= limit.
    const limit = UINT32_MAX_COUNT - (UINT32_MAX_COUNT % range);

    let rnd: number;
    do {
      // Get a raw unsigned 32-bit random number
      rnd = this.getRaw32();
    } while (rnd >= limit); // Reject values that would cause bias

    // Now rnd is uniformly distributed in [0, limit - 1].
    // Taking modulo range gives a uniform value in [0, range - 1].
    // Add min to shift it to the desired range [min, max].
    return (rnd % range) + min;
  }

  /**
 * Generates an array of cryptographically secure random 32-bit integers,
 * each uniformly distributed in the range [min, max] (inclusive).
 *
 * @param count The number of integers to generate.
 * @param min The minimum inclusive value for each integer.
 * @param max The maximum inclusive value for each integer.
 * @returns An array of random integers within the specified range.
 */
  public async generateInt32Batch(count: number, min: number, max: number): Promise<number[]> {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error("count must be a non-negative integer.");
    }
    if (count === 0) {
      return [];
    }

    // Validate min/max once
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error("min and max must be integers.");
    }
    if (min > max) {
      throw new Error("min cannot be greater than max.");
    }
    if (min === max) {
      // Only one possible value, fill the array directly
      return new Array(count).fill(min);
    }

    // create batch using generateInt32 call
    const results: number[] = new Array(count);
    for (let i = 0; i < count; i++) {
      results[i] = this.generateInt32(min, max);
      // Sleep to avoid blocking the event loop
      if (i % 10000 === 0) {
        // Sleep every 1000 iterations to yield control
        await this.sleep();
      }
    }
    return results;
  }
}

export default FortunaRNG;
