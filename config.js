// Файл перезаписывается программно при работе автоматизации
let config =
{
  "notGetBlocks": [
    "blocks-demo.html"
  ],
  "ignoredBlocks": [
    "no-js"
  ],
  "alwaysAddBlocks": [
    "sprite-svg",
    "sprite-png"
  ],
  "blocks": [
    "page-header",
    "page-footer",
    "nothing",
    "sprite-svg",
    "sprite-png",
    "hello"
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
    "./script.js"
  ],
  "addAssets": {
    "./src/img/avatar-*": "img/",
    "./src/img/DSSC_*": "img/",
    "./src/fonts/sample.woff2": "fonts/",
    "./src/favicon/*.{png,ico,svg,xml,webmanifest}": "img/favicon"
  },
  "dir": {
    "src": "./src/",
    "build": "./build/",
    "blocks": "./src/blocks/"
  }
};

module.exports = config;
