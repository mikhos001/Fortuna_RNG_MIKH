import FortunaRNG from './FortunaRNG.js';

// Создаем экземпляр FortunaRNG
const rng = new FortunaRNG();

// Добавляем энтропию в разные пулы
for (let i = 0; i < 64; i++) {
    rng.addEntropy(new Uint8Array(32)); // Добавляем 32 байта энтропии циклически по пулам
}

// Функция для генерации случайного числа и отображения его на странице
async function generateRandomNumber() {
    const randomBytes = await rng.generateRandomBytes(4);
    const randomNumber = new DataView(randomBytes.buffer).getUint32(0, true);
    document.getElementById('randomNumber').innerText = `Случайное число: ${randomNumber}`;
}

// Добавляем обработчик события для кнопки
document.getElementById('generateButton').addEventListener('click', generateRandomNumber);
