'use strict';

// Использование: run node createBlock.js [BLOCK_NAME] [additional extensions]

const fs = require('fs');
const pjson = require('./package.json');
const dirs = pjson.config.directories;
const mkdirp = require('mkdirp');


let blockName = process.argv[2];
let defaultExtensions = ['html', 'scss']; //расширения по умолчанию
//добавляем к массиву defaultExtensions additional extensions, заданные при вводе run node createBlock, затем удаляем дубликаты
let extensions = uniqueArray(defaultExtensions.concat(process.argv.slice(3)));

if (blockName) {
  let dirPath = dirs.source + '/blocks/' + blockName + '/';
  mkdirp(dirPath).then(() => {
    console.log('[NTH] Создание папки ' + dirPath + ' (создана, если ещё не существует)');
    let dirImagesPath = dirPath + 'img';
    extensions.forEach((extension) => {
      let filePath = dirPath + blockName + '.' + extension;
      let fileContent = '';
      let fileCreateMsg = '';
      if (extension == 'scss') {
        fileContent = '.' + blockName + ' {\n  \n}\n';
        /*fileContent = '@import "' + dirs.sass + '/variables.scss";     // только для удобства обращения к переменным\n' +
          '@import "' + dirs.sass + '/mixins.scss"; // только для удобства обращения к примесям\n\n\n.' + blockName + ' {\n  \n}\n';*/
      } else if (extension == 'html') {
        fileContent = '<div class="' + blockName + '">content</div>\n';
      }
      if (fileExist(filePath) === false) {
        fs.writeFile(filePath, fileContent, (err) => {
          if (err) {
            return console.log('---------- Файл не создан: ' + err);
          }
          console.log('---------- Файл создан: ' + filePath);
        });
      } else {
        console.log('[NTH] Файл не создан: ' + filePath + ' уже существует');
      }
    });
  });
} else {
  console.log('[NTH]] Отмена операции: не указан блок');
}

// Оставить в массиве только уникальные значения (убрать повторы)
function uniqueArray(arr) {
  let objectTemp = {};
  for (let i = 0; i < arr.length; i++) {
    let str = arr[i];
    objectTemp[str] = true; // запомнить строку в виде свойства объекта
  }
  return Object.keys(objectTemp);
}

// Проверка существования файла
function fileExist(path) {
  const fs = require('fs');
  try {
    fs.statSync(path);
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
}
