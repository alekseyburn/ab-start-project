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
      // "sprite-png",
      // "object-fit-polyfill",
    ],
    "addStyleBefore": [
      "src/sass/variables.scss",
      "src/sass/mixins.scss",
      "src/sass/fonts.scss",
      "src/sass/visually-hidden.scss"
    ],
    "addStyleAfter": [
      "src/sass/scaffolding.scss"
    ],
    "addJsBefore": [],
    "addJsAfter": [
      "./script.js"
    ],
    "addAssets": {
      // "src/img/avatar-*": "img/",
      // "src/img/DSSC_*": "img/",
      "src/fonts/sample.woff2": "fonts/",
      "src/img/demo-*.{png,svg,jpg,jpeg}": "img/",
      // "src/favicon/*.{png,ico,svg,xml,webmanifest}": "img/favicon"
    },
    "dir": {
      "src": "src/",
      "build": "build/",
      "blocks": "src/blocks/"
    }
  };

module.exports = config;
