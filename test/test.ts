import fs from 'fs/promises';
import path from 'path';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import crypto from 'crypto';
import FortunaRNG from '../src';

(async () => {
    // Создаем экземпляр FortunaRNG
    const rng = new FortunaRNG(crypto.randomBytes(64));

    // Добавляем случайные события в RNG
    setTimeout(addRandomEvent, 500);
    let seqCounter = 0;

    function addRandomEvent() {
        rng.addRandomEvent(
            0,
            crypto.randomInt(32),
            crypto.randomBytes(32));
        rng.addRandomEvent(
            1,
            crypto.randomInt(32),
            Buffer.from(seqCounter.toString()));
        seqCounter++;
        rng.randomData(32);
        setTimeout(addRandomEvent, 500);
    }

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
    let totalRngCalls = 0;

    // Функция для обновления прогресс-бара
    function updateProgressBar(task: string) {
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
    async function generateNumbersToFile(filename: string, count: number, range: number, startCount: number = 1) {
        const task = `Creating ${filename}`;
        updateProgressBar(task);
        const numbers = await rng.generateInt32Batch(count, startCount, range);
        const filePath = path.join('result', filename);
        await fs.writeFile(filePath, numbers.join('\n'), 'utf8');
        completedTasks++;
        updateProgressBar(`File ${filePath} created.`);
        totalRngCalls += count;
    }

    try {
        await fs.access('result');
    } catch (error) {
        await fs.mkdir('result');
    }

    // Устанавливаем общее количество задач
    totalTasks = 11; // 11 текстовых файлов
    progressBar.start(totalTasks, 0, { task: 'Starting...' });

    // Обновляем прогресс-бар с анимацией спиннера
    const spinnerInterval = setInterval(() => {
        progressBar.update(completedTasks, { task: `${currentTask} ${getSpinner()}` });
    }, 100);

    let startTime = Date.now();

    // Тест 1 (Dice): Создание файла с 1 млн строк (число на строку) в диапазоне 1-6
    await generateNumbersToFile('dice.txt', 1000000, 6);

    // Тест 2 (Slot): Создание файла с 1 млн строк (число на строку) в диапазоне 0-499
    await generateNumbersToFile('slot.txt', 1000000, 499, 0);

    // Тест 3 (Card shuffle deck 1): Создание файла с 1 млн строк (число на строку) в диапазоне 0-51
    await generateNumbersToFile('card_shuffle_1_decks.txt', 1000000, 51, 0)

    // Тест 4 (Card shuffle deck 8): Создание файла с 1 млн строк (число на строку) в диапазоне 0-415
    await generateNumbersToFile('card_shuffle_8_decks.txt', 1000000, 415, 0)

    // Тест 5 (Crash): Создание файла с 1 млн строк (число на строку) в диапазоне 0-9900
    await generateNumbersToFile('crash.txt', 1000000, 9900, 0);

    // Тест 6 (Mines): Создание файла с 1 млн строк (число на строку) в диапазоне 0-249
    await generateNumbersToFile('mines.txt', 1000000, 249, 0);

    // Тест 7 (Plinko): Создание файла с 1 млн строк (число на строку) в диапазоне 0-1
    await generateNumbersToFile('plinko.txt', 1000000, 1, 0);

    // Тест 8 (two-up): Создание файла с 1 млн строк (число на строку) в диапазоне 0-1
    await generateNumbersToFile('two_up.txt', 1000000, 1, 0);

    // Тест 9 (Wheel of Fortune): Создание файла с 1 млн строк (число на строку) в диапазоне 0-53
    await generateNumbersToFile('wheel_of_fortune.txt', 1000000, 53, 0);

    // Тест 10 (Keno): Создание файла с 1 млн строк (число на строку) в диапазоне 1-40
    await generateNumbersToFile('keno.txt', 1000000, 40, 1);

    // Тест 11 (Roulette): Создание файла с 1 млн строк (число на строку) в диапазоне 0-37
    await generateNumbersToFile('roulette.txt', 1000000, 37, 0);

    let endTime = Date.now();
    let callsPerSecond = Math.floor(totalRngCalls / ((endTime - startTime) / 1000));

    progressBar.stop();
    clearInterval(spinnerInterval);
    console.log(colors.green('Generate file done, total RNG calls: ' + totalRngCalls));
    console.log(colors.green('Total time: ' + ((endTime - startTime) / 1000) + ' seconds'));
    console.log(colors.green('Total RNG calls per second: ' + callsPerSecond));
    process.exit(0);
})();