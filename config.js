// Файл перезаписывается программно при работе автоматизации
let config =
{
  "notGetBlocks": [
    "blocks-demo.html"
  ],
  "ignoredBlocks": [
    "no-js"
  ],
  "blocks": [
    "page-header",
    "page-footer",
    "else",
    "nothing",
    "none"
  ],
  "addStyleBefore": [
    "./src/sass/variables.scss",
    "./src/sass/mixins.scss",
    "./src/sass/fonts.scss"
  ],
  "addStyleAfter": [
    "./src/sass/scaffolding.scss"
  ],
  "addJsBefore": [],
  "addJsAfter": [
    "./src/js/global-script.js"
  ],
  "addImages": [],
  "addAssets": [],
  "copiedCss": [],
  "copiedJs": [],
  "dir": {
    "src": "./src/",
    "build": "./build/",
    "blocks": "./src/blocks/"
  }
};

module.exports = config;
