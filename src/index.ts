import assert from "assert";
import crypto from "crypto";

// FortunaRNG: A simple implementation of the Fortuna PRNG algorithm.
class FortunaRNG {
  private readonly NUM_POOLS: number;
  private readonly MIN_POOL_SIZE: number;
  private readonly RESEED_INTERVAL_MS: number;
  private pools: Buffer[];
  private poolIndex: number;
  private key: Uint8Array | null;
  private ctr: Uint8Array;
  private reseedCounter: number;
  private lastReseedTime: number;

  constructor() {
    // CONSTANTS
    this.NUM_POOLS = 32; // Total number of entropy pools
    this.MIN_POOL_SIZE = 64; // Minimum bytes required in pool[0] to trigger reseed
    this.RESEED_INTERVAL_MS = 1000; // Minimum interval (in ms) between reseeds

    // Initialize 32 entropy pools as empty Buffers
    this.pools = Array.from({ length: this.NUM_POOLS }, () => Buffer.alloc(0));
    this.poolIndex = 0; // Next pool index for round-robin insertion

    // Generator state: key is the AES-256 key (32 bytes) and is initially null
    this.key = null;
    // Initialize the counter with 16 random bytes (AES block size)
    this.ctr = crypto.randomBytes(16);
    // Count how many times we have reseeded (affects which pools get used)
    this.reseedCounter = 0;
    // Last reseed time in ms (used to enforce a minimum reseed interval)
    this.lastReseedTime = Date.now();

    // Bootstrap: Warm up all pools with initial entropy.
    // In a production system, you would likely use a high-entropy OS source.
    for (let i = 0; i < this.NUM_POOLS; i++) {
      this.addEntropy(crypto.randomBytes(this.MIN_POOL_SIZE));
    }
  }

  /**
   * Increment the 16-byte counter (treated as a big-endian integer).
   */
  incrementCounter() {
    // Loop from the least-significant byte (end of Buffer) to most
    for (let i = this.ctr.length - 1; i >= 0; i--) {
      if (this.ctr[i] < 0xff) {
        this.ctr[i]++;
        break;
      } else {
        this.ctr[i] = 0;
      }
    }
  }

  /**
   * Compute SHA-256 hash of the given data.
   * @param {Buffer|string} data
   * @returns {Buffer} 32-byte hash
   */
  sha256(data: Buffer) {
    return crypto.createHash("sha256").update(data).digest();
  }

  /**
   * Add entropy data to the current pool.
   * Data may be a string or Buffer.
   * Uses round-robin insertion into the NUM_POOLS pools.
   * If a pool grows too large (exceeding MIN_POOL_SIZE * 4), it is compressed.
   * @param {Buffer|string} data
   */
  addEntropy(data: string | Buffer) {
    // Convert string input to Buffer using UTF-8 encoding
    if (typeof data === "string") {
      data = Buffer.from(data, "utf8");
    } else if (!Buffer.isBuffer(data)) {
      throw new Error("data must be a Buffer or a string");
    }

    // If the current pool is not too large, append the new entropy
    if (this.pools[this.poolIndex].length <= this.MIN_POOL_SIZE * 4) {
      this.pools[this.poolIndex] = Buffer.concat([
        this.pools[this.poolIndex],
        data,
      ]);
    } else {
      // Otherwise, compress the pool with the new data to bound its size.
      this.pools[this.poolIndex] = this.sha256(
        Buffer.concat([this.pools[this.poolIndex], data])
      );
    }
    // Rotate to the next pool in round-robin fashion
    this.poolIndex = (this.poolIndex + 1) % this.NUM_POOLS;
  }

  /**
   * Determine whether the generator should be reseeded.
   * Reseed if the generator has not yet been seeded (key is null) or if
   * pool 0 has at least MIN_POOL_SIZE bytes and the reseed interval has elapsed.
   * @returns {boolean}
   */
  shouldReseed() {
    // If key is null, perform bootstrap seeding.
    if (this.key === null) {
      // Mix current time and additional random bytes into pool 0.
      this.addEntropy(
        Buffer.concat([
          Buffer.from(Date.now().toString(), "utf8"),
          crypto.randomBytes(this.MIN_POOL_SIZE),
        ])
      );
      // Bootstrap the key with 32 secure random bytes.
      this.key = crypto.randomBytes(32);
      return true;
    }

    const now = Date.now();
    // Check if pool 0 has enough data and if the time interval has passed
    if (
      this.pools[0].length >= this.MIN_POOL_SIZE &&
      now - this.lastReseedTime > this.RESEED_INTERVAL_MS
    ) {
      return true;
    }
    return false;
  }

  /**
   * Reseed the generator by mixing entropy from the pools.
   * According to Fortuna, pool i is used if reseedCounter mod 2^i === 0.
   * After use, each pool is reset to empty.
   * The new key is computed as sha256(oldKey || seedMaterial).
   */
  reseed() {
    this.reseedCounter++;
    let seedMaterial = Buffer.alloc(0);

    // For each pool, include its digest if the reseedCounter meets the condition.
    for (let i = 0; i < this.NUM_POOLS; i++) {
      // Include pool i if reseedCounter modulo (2^i) is 0
      if (this.reseedCounter % 2 ** i === 0) {
        const poolHash = this.sha256(this.pools[i]);
        seedMaterial = Buffer.concat([seedMaterial, poolHash]);
        // Reset the used pool to empty
        this.pools[i] = Buffer.alloc(0);
      }
    }

    // Mix in additional entropy from the current time.
    const timeBuffer = Buffer.from(Date.now().toString(), "utf8");
    seedMaterial = Buffer.concat([seedMaterial, this.sha256(timeBuffer)]);

    // Update key: mix old key and collected seed material.
    assert.ok(this.key);
    this.key = this.sha256(Buffer.concat([this.key, seedMaterial]));
    // Update the last reseed time.
    this.lastReseedTime = Date.now();
  }

  /**
   * Generate pseudorandom bytes.
   * This method uses AES-256 in CTR mode with the current key and counter.
   * After generating output, it performs rekeying by deriving a new key from cipher output.
   *
   * @param {number} numBytes - Number of random bytes requested.
   * @returns {Buffer} - Buffer containing numBytes of random data.
   */
  generate(numBytes: number) {
    // Reseed if conditions indicate we should
    if (this.shouldReseed()) {
      this.reseed();
    }

    assert.ok(this.key);

    // Create a new AES-256-CTR cipher using current key and counter
    const cipher = crypto.createCipheriv("aes-256-ctr", this.key, this.ctr);
    // Generate the keystream by encrypting the zeroed plaintext
    let generated = cipher.update(Buffer.alloc(numBytes, 0));
    // Increment our counter for each block used in the output generation
    this.incrementCounter();

    // Rekeying step:
    // Create a new cipher instance with the same key and updated counter to derive new key material.
    const cipher2 = crypto.createCipheriv("aes-256-ctr", this.key, this.ctr);
    // Derive 32 bytes (two 16-byte blocks) of new key material.
    const newKeyMaterial = Buffer.concat([
      cipher2.update(Buffer.alloc(16, 0)),
      cipher2.update(Buffer.alloc(16, 0)),
    ]);
    // Update the internal key with the newly derived key material.
    this.key = newKeyMaterial;

    // Additional security step: Mix in extra entropy from the cipher output
    this.addEntropy(cipher2.update(Buffer.alloc(8, 0)));
    // Increment counter once more to avoid any potential keystream reuse.
    this.incrementCounter();

    // Return exactly the requested number of bytes
    return generated.subarray(0, numBytes);
  }

  /**
   * Generate a random 32-bit integer within the range [min, max).
   * @param {number} [min=0]
   * @param {number} [max=0xFFFFFFFF]
   * @returns {number}
   */
  generateInt32(min: number = 0, max: number = 0xffffffff) {
    const randBytes = this.generate(4);
    const randInt = randBytes.readUInt32BE(0);
    const range = max - min;
    return min + (randInt % range);
  }

  /**
   * Generate an array of random 32-bit integers within the range [min, max).
   * @param {number} count
   * @param {number} min
   * @param {number} max
   * @returns {number[]}
   */
  generateInt32Batch(count: number, min: number = 0, max: number = 0xffffffff) {
    const buf = this.generate(count * 4);
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      const randInt = buf.readUInt32BE(i * 4);
      const range = max - min;
      result.push(min + (randInt % range));
    }
    return result;
  }
}

export default FortunaRNG;
