class FortunaRNG {
    constructor() {
        this.pools = Array.from({ length: 32 }, () => []);
        this.counter = this.generateInitialCounter(); // Инициализируем счетчик случайными данными
        this.key = this.generateInitialKey();
        this.reseedCounter = 0;
        this.entropyPoolIndex = 0; // Индекс для циклического распределения энтропии
    }

    generateInitialKey() {
        // Генерируем начальный ключ с использованием безопасного генератора случайных чисел
        return crypto.getRandomValues(new Uint8Array(32));
    }

    generateInitialCounter() {
        // Генерируем начальное значение счетчика с использованием безопасного генератора случайных чисел
        return crypto.getRandomValues(new Uint8Array(16));
    }

    concatUint8Arrays(arrays) {
        return Uint8Array.from(arrays.flatMap(array => Array.from(array)));
    }

    async reseed() {
        // Пересеиваем RNG с новой энтропией из пулов, индексы которых соответствуют степени двойки для текущего reseedCounter
        let seedMaterial = new Uint8Array();
        for (let i = 0; i < this.pools.length; i++) {
            if ((this.reseedCounter - 1) % (2 ** i) === 0 && this.pools[i].length > 0) {
                const poolData = this.concatUint8Arrays(this.pools[i]);
                seedMaterial = this.concatUint8Arrays([seedMaterial, poolData]);
                this.pools[i] = [];
            }
        }
        if (seedMaterial.length > 0) {
            this.key = await this.hash(this.key, seedMaterial);
            this.reseedCounter++;
        }
    }

    async hash(key, data) {
        // Хэш-функция с использованием SHA-256
        const combined = this.concatUint8Arrays([key, data]);
        const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
        return new Uint8Array(hashBuffer);
    }

    async generateRandomBytes(length) {
        if (!this.isReady()) {
            throw new Error('Insufficient entropy. Please add more entropy to different pools before generating random bytes.');
        }

        const result = new Uint8Array(length);
        const aesKey = await crypto.subtle.importKey(
            'raw',
            this.key,
            { name: 'AES-CTR' },
            false,
            ['encrypt']
        );

        for (let i = 0; i < length; i += 16) {
            const counterBlock = this.counter.slice();
            const encryptedBlock = new Uint8Array(await crypto.subtle.encrypt(
                { name: 'AES-CTR', counter: counterBlock, length: 128 },
                aesKey,
                new Uint8Array(16)
            ));

            for (let j = 0; j < 16 && i + j < length; j++) {
                result[i + j] = encryptedBlock[j];
            }

            // Увеличиваем счетчик и проверяем на переполнение
            for (let k = 15; k >= 0; k--) {
                this.counter[k]++;
                if (this.counter[k] !== 0) break;
                if (k === 0) {
                    // Счетчик переполнен, сбрасываем генератор
                    this.counter = this.generateInitialCounter();
                    this.key = this.generateInitialKey();
                    this.reseedCounter = 0;
                    await this.reseed(); // Принудительный пересев
                    throw new Error('Counter overflow. RNG has been reset.');
                }
            }
        }

        return result;
    }

    addEntropy(entropy) {
        // Добавляем энтропию в циклический пул
        this.pools[this.entropyPoolIndex].push(entropy);
        this.entropyPoolIndex = (this.entropyPoolIndex + 1) % this.pools.length;
    }

    /**
     * Проверяет, есть ли минимум 64 байта энтропии в пуле 0 для первого пересева.
     * Для последующих пересевов требуется энтропия из других пулов.
     */
    isReady() {
        if (this.reseedCounter === 0) {
            const pool0Length = this.pools[0].reduce((acc, val) => acc + val.length, 0);
            return pool0Length >= 64;
        } else {
            for (let i = 0; i < this.pools.length; i++) {
                if (this.pools[i].length > 0) {
                    return true;
                }
            }
            return false;
        }
    }
}

// Экспортируем класс FortunaRNG
export default FortunaRNG;
