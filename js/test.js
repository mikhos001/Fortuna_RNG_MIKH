import FortunaRNG from './FortunaRNG.js';
import fs from 'fs/promises';
import path from 'path';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';

// Создаем экземпляр FortunaRNG
const rng = new FortunaRNG();

// Создаем прогресс-бар
const progressBar = new cliProgress.SingleBar({
    format: 'Progress |' + colors.cyan('{bar}') + '| ' + colors.green('{percentage}%') + ' || ' + colors.yellow('{value}/{total} Tasks') + ' || ' + colors.magenta('{task}') + ' || ' + colors.blue('{duration_formatted} elapsed') + ' || ' + colors.red('{eta_formatted} remaining'),
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    clearOnComplete: false
}, cliProgress.Presets.shades_classic);
let totalTasks = 0;
let completedTasks = 0;
let currentTask = '';

// Функция для обновления прогресс-бара
function updateProgressBar(task) {
    currentTask = task;
    progressBar.update(completedTasks, { task: `${task} ${getSpinner()}` });
}

// Анимация спиннера
const spinnerFrames = ['-', '\\', '|', '/'];
let spinnerIndex = 0;
function getSpinner() {
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    return spinnerFrames[spinnerIndex];
}

// Функция для генерации случайного числа в заданном диапазоне
async function generateRandomNumber(range) {
    return rng.generateInt32(0, range - 1);
}

// Функция для генерации случайных чисел и сохранения их в файл
async function generateNumbersToFile(filename, count, range) {
    const task = `Генерация файла ${filename}`;
    updateProgressBar(task);
    const numbers = rng.generateInt32Batch(count, 0, range - 1);
    const filePath = path.join('result', filename);
    await fs.writeFile(filePath, numbers.join('\n'), 'utf8');
    completedTasks++;
    updateProgressBar(`Файл ${filePath} успешно создан.`);
}

// Функция для генерации бинарных данных и сохранения их в файл
async function generateBinaryFile(filename, sizeInMB) {
    const task = `Генерация бинарного файла ${filename}`;
    updateProgressBar(task);
    const sizeInBytes = sizeInMB * 1024 * 1024;
    const randomBytes = await rng.generate(sizeInBytes, 1024);

    const filePath = path.join('result', filename);
    await fs.writeFile(filePath, randomBytes);
    completedTasks++;
    updateProgressBar(`Файл ${filePath} успешно создан.`);
}

// Создаем директорию result, если она не существует
try {
    await fs.access('result');
} catch (error) {
    await fs.mkdir('result');
}

// Устанавливаем общее количество задач
totalTasks = 8; // 4 бинарных файла + 4 текстовых файлов
progressBar.start(totalTasks, 0, { task: 'Начало генерации файлов' });

// Обновляем прогресс-бар с анимацией спиннера
const spinnerInterval = setInterval(() => {
    progressBar.update(completedTasks, { task: `${currentTask} ${getSpinner()}` });
}, 100);


// Тест 1: Создание 4 файлов "бинарного" вывода из RNG по 10 МБ каждый
await generateBinaryFile('binary_output_1.bin', 10);
await generateBinaryFile('binary_output_2.bin', 10);
await generateBinaryFile('binary_output_3.bin', 10);
await generateBinaryFile('binary_output_4.bin', 10);

// Тест 2 (Cosmotrip): Создание файла с 10 млн строк (число на строку) в диапазоне 0-9901
await generateNumbersToFile('cosmotrip.txt', 10000000, 9902);

// Тест 3 (Fortune): Создание файла с 10 млн строк (число на строку) в диапазоне 0-55
await generateNumbersToFile('wheel_of_fortune.txt', 10000000, 56);

// Тест 4 (two-up): Создание файла с 10 млн строк (число на строку) в диапазоне 0-1
await generateNumbersToFile('two_up.txt', 10000000, 2);

// Тест 5 (blackjackone): Создание файла с 10 млн строк (число на строку) в диапазоне 0-416
await generateNumbersToFile('blackjack_one.txt', 10000000, 417);

progressBar.stop();
clearInterval(spinnerInterval);
console.log(colors.green('Generate file done!'));
process.exit(0);
