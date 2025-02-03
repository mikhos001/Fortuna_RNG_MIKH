import FortunaRNG from './FortunaRNG.js';

// Создаем экземпляр FortunaRNG
const rng = new FortunaRNG();

// Функция для генерации случайных битов
async function generateRandomBits(length) {
    const randomBytes = await rng.generate(Math.ceil(length / 8));
    const randomBits = [];
    for (let byte of randomBytes) {
        for (let i = 7; i >= 0; i--) {
            randomBits.push((byte >> i) & 1);
        }
    }
    return randomBits.slice(0, length);
}

// Тест на частоту (Frequency Test)
function frequencyTest(bits) {
    const n = bits.length;
    const sum = bits.reduce((acc, bit) => acc + bit, 0);
    const s_obs = Math.abs(sum - n / 2) / Math.sqrt(n / 4);
    const p_value = erfc(s_obs / Math.sqrt(2));
    return p_value;
}

// Тест на последовательности (Runs Test)
function runsTest(bits) {
    const n = bits.length;
    const pi = bits.reduce((acc, bit) => acc + bit, 0) / n;
    if (Math.abs(pi - 0.5) > (2 / Math.sqrt(n))) {
        return 0.0;
    }
    let v_n = 1;
    for (let i = 1; i < n; i++) {
        if (bits[i] !== bits[i - 1]) {
            v_n++;
        }
    }
    const p_value = erfc(Math.abs(v_n - 2 * n * pi * (1 - pi)) / (2 * Math.sqrt(2 * n) * pi * (1 - pi)));
    return p_value;
}

// Функция для вычисления комплементарной функции ошибок
function erfc(x) {
    return 1 - erf(x);
}

// Функция для вычисления функции ошибок
function erf(x) {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
}

// Функция для тестирования распределения и расчёта энтропии
function testDistributionAndEntropy(sampleCount = 1000000) {
    const rng = new FortunaRNG();

    // Массив для подсчёта частот значений от 0 до 100
    const frequency = new Array(101).fill(0);

    // Генерируем sampleCount случайных чисел в диапазоне 0-100
    for (let i = 0; i < sampleCount; i++) {
        const number = rng.generateInt32(0, 101);
        frequency[number]++;
    }

    // Вычисляем энтропию по Шеннону
    let entropy = 0;
    for (let i = 0; i <= 100; i++) {
        const p = frequency[i] / sampleCount;
        if (p > 0) {
            entropy -= p * Math.log2(p);
        }
    }


    // Выводим распределение и рассчитанную энтропию
    console.log('Выборка:', sampleCount);
    console.log('Распределение частот для чисел 0-100:', frequency.join(','));
    console.log(`Оценочная энтропия (по Шеннону): ${entropy.toFixed(4)}`);
}


// Генерируем случайные биты и выполняем тесты
async function runTests() {
    const bits = await generateRandomBits(1000000); // Генерируем 1 миллион случайных битов

    const frequencyPValue = frequencyTest(bits);
    console.log(`Frequency Test p-value: ${frequencyPValue}`);

    const runsPValue = runsTest(bits);
    console.log(`Runs Test p-value: ${runsPValue}`);

    testDistributionAndEntropy();
}

runTests();
