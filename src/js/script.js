/* eslint-disable no-undef */
const ready = require('./utils/documentReady.js');

ready(function(){
  const ready = require('./utils/documentReady.js');

  ready(function(){
    if (/Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)) {
      document.querySelector('body').classList.remove('webp');
      document.querySelector('body').classList.add('no-webp');
    }
  });
});

// const $ = require('jquery');
// $( document ).ready(function() {});
