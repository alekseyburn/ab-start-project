'use strict';

// Использование: node createBlock.js [имя блока] [доп. расширения через пробел]

const fs = require('fs');
const pjson = require('./package.json');
const dirs = pjson.config.directories;
const mkdirp = require('mkdirp');

/*
process.argv[n]
[0] - всегда node
[1] - Имя файла для исполнения
[2-...] - Значения, переданные в коммандную строку после имени файла
В нашем случае [2] - имя блока, [3-...] - имена расширений
 */
let blockName = process.argv[2];
let defaultExtensions = ['html', 'scss']; //расширения по умолчанию
//добавляем к массиву defaultExtensions additional extensions, заданные при вводе run node createBlock, затем удаляем дубликаты
let extensions = uniqueArray(defaultExtensions.concat(process.argv.slice(3)));

if (blockName) {
  let dirPath = dirs.source + '/blocks/' + blockName + '/';
  mkdirp(dirPath).then(() => {
    console.log('[NTH] Создание папки ' + dirPath + ' (создана, если ещё не существует)');
    extensions.forEach((extension) => {
      let filePath = dirPath + blockName + '.' + extension;
      let fileContent = '';
      let fileCreateMsg = '';
      if (extension === 'scss') {
        fileContent = '.' + blockName + ' {\n  \n}\n';
        fileCreateMsg = '[NTH] Для импорта стилей: @import "' + dirs.source + '/blocks/' + blockName + '/' + blockName + '.scss";';
      } else if (extension === 'html') {
        fileContent = '<div class="' + blockName + '">content</div>\n';
      }
      if (fileExist(filePath) === false) {
        fs.writeFile(filePath, fileContent, (err) => {
          if (err) {
            return console.log('[NTH] Файл не создан: ' + err);
          }
          console.log('[NTH] Файл создан: ' + filePath);
          if (fileCreateMsg) {
            console.warn(fileCreateMsg);
          }
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
  return Array.from(new Set(arr));
}

// Проверка существования файла
function fileExist(path) {
  try {
    fs.statSync(path);
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
}
