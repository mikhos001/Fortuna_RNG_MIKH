# RNG Fortuna by Mikh

This is a JavaScript library for cryptographic RNG (Fortuna).

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/mikhos001/Fortuna_RNG_MIKH.git
    cd Fortuna_RNG_MIKH
    ```

2. Install the dependencies:
    ```sh
    npm install
    ```

## Usage

### Running Tests

#### Statistical Tests

1. Run the statistical tests to check the randomness of the generated numbers:
    ```sh
    npm test
    ```

#### File Generation Tests

1. Run tests and create files:
    ```sh
    npm run testfile
    ```

    Criteria:
    - **Test 1**: Create 4 binary output files from RNG, each 10MB
    - **Test 2 (Dice)**: Create a file with 10 million lines (one number per line) in the range 1-6
    - **Test 3 (Slot)**: Create a file with 10 million lines (one number per line) in the range 1-500
    - **Test 4 (Card shuffle deck 1)**: Create a file with 10 million lines (one number per line) in the range 1-52
    - **Test 5 (Card shuffle deck 8)**: Create a file with 10 million lines (one number per line) in the range 1-416
    - **Test 6 (Crash)**: Create a file with 10 million lines (one number per line) in the range 1-9901
    - **Test 7 (Mines)**: Create a file with 10 million lines (one number per line) in the range 1-416
    - **Test 8 (Plinko)**: Create a file with 10 million lines (one number per line) in the range 0-1
    - **Test 9 (two-up)**: Create a file with 10 million lines (one number per line) in the range 0-1
    - **Test 10 (Wheel of Fortune)**: Create a file with 10 million lines (one number per line) in the range 1-56
    - **Test 11 (Keno)**: Create a file with 10 million lines (one number per line) in the range 1-40
    - **Test 12 (Roulette)**: Create a file with 10 million lines (one number per line) in the range 1-38
    
2. The results of the tests will be displayed in the console.

## Project Structure

- `package.json`: Project configuration and dependencies.
- `js/FortunaRNG.js`: Implementation of the Fortuna RNG algorithm.
- `js/test.js`: Script for generating random numbers and saving them to files for various tests.
- `js/statisticalTests.js`: Script for running statistical tests on the generated random numbers.
- `.gitignore`: Git ignore file to exclude `node_modules` and `result` directories.
- `LICENSE`: License file for the project.

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.


