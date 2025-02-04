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

// Функция для генерации случайных чисел и сохранения их в файл
async function generateNumbersToFile(filename, count, range, startCount = 1) {
    const task = `Генерация файла ${filename}`;
    updateProgressBar(task);
    const numbers = rng.generateInt32Batch(count, startCount, range + 1);
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

// function shufleArr(range, startCount = 1) {
//     // Создаем массив из range (номера от 1 до range)
//     const deck = Array.from({ length: range }, (_, index) => index + 1);

//     // Возвращаем функцию, которая "вытягивает" случайное значение из массива (уникальное)

//     return function shufle() {
//         if (deck.length === 0) {
//             return null;
//         }

//         // Генерируем случайный индекс
//         const randomIndex = rng.generateInt32(startCount, deck.length - 1)
//         // Удаляем индекс из массива и возвращаем его
//         return deck.splice(randomIndex, 1)[0];
//     };
    
// }

// Функция для генерации случайного числа в заданном диапазоне range shufle

// async function generateNumbersToFileWithShufle(filename, count, range, startCount = 1) {
//     const globalList = []
//     let shufle = shufleArr(range, startCount);
//     while (globalList.length < count) {
//         let cardNumber = shufle();
//         if (cardNumber !== null) {
//             globalList.push(cardNumber);
//         } else {
//             // Если карты закончились, создаем новую колоду
//             shufle = shufleArr(range);
//         }
//     }
//     // Удаляем избыток, если есть
//     if (globalList.length > count) {
//         globalList.length = count;
//     }
//     const filePath = path.join('result', filename);
//     await fs.writeFile(filePath, globalList.join('\n'), 'utf8');
//     completedTasks++;
//     updateProgressBar(`Файл ${filePath} успешно создан.`);
// }

// Создаем директорию result, если она не существует
try {
    await fs.access('result');
} catch (error) {
    await fs.mkdir('result');
}

// Устанавливаем общее количество задач
totalTasks = 15; // 4 бинарных файла + 11 текстовых файлов
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

// Тест 2 (Dice): Создание файла с 10 млн строк (число на строку) в диапазоне 1-6
await generateNumbersToFile('dice.txt', 10000000, 6);

// Тест 3 (Slot): Создание файла с 10 млн строк (число на строку) в диапазоне 0-499
await generateNumbersToFile('slot.txt', 10000000, 499, 0);

// Тест 4 (Card shuffle deck 1): Создание файла с 10 млн строк (число на строку) в диапазоне 0-51
await generateNumbersToFile('cardShafl1deks.txt', 10000000, 51, 0)

// Тест 5 (Card shuffle deck 8): Создание файла с 10 млн строк (число на строку) в диапазоне 0-415
await generateNumbersToFile('cardShafl8deks.txt', 10000000, 415, 0)

// Тест 6 (Crash): Создание файла с 10 млн строк (число на строку) в диапазоне 0-9900
await generateNumbersToFile('crash.txt', 10000000, 9900,0);

// Тест 7 (Mines): Создание файла с 10 млн строк (число на строку) в диапазоне 0-249
await generateNumbersToFile('mines.txt', 10000000, 249, 0);

// Тест 8 (Plinko): Создание файла с 10 млн строк (число на строку) в диапазоне 0-1
await generateNumbersToFile('plinko.txt', 10000000, 1, 0);

// Тест 9 (two-up): Создание файла с 10 млн строк (число на строку) в диапазоне 0-1
await generateNumbersToFile('two_up.txt', 10000000, 1, 0);

// Тест 10 (Wheel of Fortune): Создание файла с 10 млн строк (число на строку) в диапазоне 0-53
await generateNumbersToFile('wheel_of_fortune.txt', 10000000, 53, 0);

// Тест 11 (Keno): Создание файла с 10 млн строк (число на строку) в диапазоне 1-40
await generateNumbersToFile('keno.txt', 10000000, 40, 1);

// Тест 12 (Roulette): Создание файла с 10 млн строк (число на строку) в диапазоне 0-37
await generateNumbersToFile('Roulette.txt', 10000000, 37, 0);


progressBar.stop();
clearInterval(spinnerInterval);
console.log(colors.green('Generate file done!'));
process.exit(0);
