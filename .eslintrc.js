module.exports = {
  "env": {
    "commonjs": true,
    "es6": true,
    "node": true
  },
  "parser": "babel-eslint",
  "extends": "eslint:recommended",
  "globals": {
    "Atomics": "readonly",
    "SharedArrayBuffer": "readonly",
    "require": true
  },
  "parserOptions": {
    "ecmaVersion": 2018
  },
  "rules": {
    "strict": 0
  }
};
