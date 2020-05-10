/* eslint-disable no-undef */
// const ready = require('./utils/documentReady.js');

// ready(function(){
// });

// const $ = require('jquery');
// $( document ).ready(function() {});

document.querySelector('html').classList.remove('no-js');
if (/Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)) {
  document.querySelector('html').classList.remove('webp');
  document.querySelector('html').classList.add('no-webp');
}
