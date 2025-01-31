# RNG Fortuna by Mikh

This is a JavaScript library for cryptographic RNG (Fortuna).

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/mikh18rus/Fortuna_RNG_MIKH.git
    cd Fortuna_RNG_MIKH
    ```

2. Install the dependencies:
    ```sh
    npm install
    ```

## Usage

### Running the Web Server

1. Start the web server:
    ```sh
    npm start
    ```

2. Open your browser and navigate to `http://localhost:3000`.

### Generating Random Numbers

1. Open `index.html` in your browser.
2. Click the "Сгенерировать случайное число" button to generate a random number.
3. The generated random number will be displayed on the page.

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
    - **Test 2 (Cosmotrip)**: Create a file with 10 million lines (one number per line) in the range 0-9901
    - **Test 3 (Wheel of Fortune)**: Create a file with 10 million lines (one number per line) in the range 0-55
    - **Test 4 (Two-up)**: Create a file with 10 million lines (one number per line) in the range 0-1
    - **Test 5 (Blackjack-one)**: Create a file with 10 million lines (one number per line) in the range 0-416

2. The results of the tests will be displayed in the console.

## Project Structure

- `server.cjs`: Web server for serving the project files.
- `package.json`: Project configuration and dependencies.
- `js/FortunaRNG.js`: Implementation of the Fortuna RNG algorithm.
- `js/main.js`: Script for generating random numbers and displaying them on the web page.
- `js/test.js`: Script for generating random numbers and saving them to files for various tests.
- `js/statisticalTests.js`: Script for running statistical tests on the generated random numbers.
- `index.html`: Web page for generating and displaying random numbers.
- `.gitignore`: Git ignore file to exclude `node_modules` and `result` directories.
- `LICENSE`: License file for the project.

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.


