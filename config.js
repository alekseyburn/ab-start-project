// Файл перезаписывается программно при работе автоматизации

let config = {
  'notGetBlocks': [],
  'ignoredBlocks': [
    'no-js'
  ],
  'alwaysAddBlocks': [
    'sprite-svg',
    'sprite-png',
    // 'object-fit-polyfill',
  ],
  'addStyleBefore': [
    'src/sass/variables.scss',
    'src/sass/mixins.scss',
    // 'src/sass/fonts.scss',
    'src/sass/visually-hidden.scss',
    'src/sass/scaffolding.scss'
    // 'src/sass/corrections.scss'
    // 'somePackage/dist/somePackage.css', // для 'node_modules/somePackage/dist/somePackage.css',
  ],
  'addStyleAfter': [

  ],
  'addJsBefore': [
    // 'somePackage/dist/somePackage.js', // для 'node_modules/somePackage/dist/somePackage.js',
  ],
  'addJsAfter': [
    './script.js'
  ],
  'addAssets': {
    // 'src/img/avatar-*': 'img/',
    // 'src/fonts/sample.woff2': 'fonts/',
    'src/img/*.{png,svg,jpg,jpeg}': 'img/',
    // 'src/favicon/*.{png,ico,svg,xml,webmanifest}': 'img/favicon',
    // 'node_modules/somePackage/images/*.{png,svg,jpg,jpeg}': 'img/',
  },
  'dir': {
    'src': 'src/',
    'build': 'build/',
    'blocks': 'src/blocks/'
  }
};

module.exports = config;
