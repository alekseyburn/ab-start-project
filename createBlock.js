'use strict';

// Использование: node createBlock.js [имя блока] [доп. расширения через пробел]

const fs = require('fs'); // Для работы с файловой системой
const pjson = require('./package.json'); // Чтобы получать настройки из package.json
const dirs = pjson.configProject.dirs; // Объект с директориями
const mkdirp = require('mkdirp'); // Зависимость - создание папки

/*
process.argv[n]
[0] - всегда node
[1] - Имя файла для исполнения
[2-...] - Значения, переданные в коммандную строку после имени файла
В нашем случае [2] - имя блока, [3-...] - имена расширений
 */
let blockName = process.argv[2];
let defaultExtensions = ['scss', 'html', 'img']; //расширения по умолчанию

//добавляем к массиву defaultExtensions additional extensions, заданные при вводе run node createBlock, затем удаляем дубликаты
let extensions = uniqueArray(defaultExtensions.concat(process.argv.slice(3)));

if (blockName) {

  let dirPath = dirs.srcPath + dirs.blocksDirName + '/' + blockName + '/';
  mkdirp(dirPath).then(() => {
    console.log('[NTH] Создание папки ' + dirPath + ' (создана, если ещё не существует)');

    extensions.forEach((extension) => {
      let filePath = dirPath + blockName + '.' + extension;
      let fileContent = '';
      let fileCreateMsg = '';
      if (extension === 'scss') {
        fileContent = '// В этом файле должны быть стили только для БЭМ-блока ' + blockName + ', его элементов, \n//модификаторов, псевдоселекторов, псевдоэлементов, @media-условий...\n// Не пишите здесь другие селекторы.\n\n.' + blockName + ' {\n  \n}\n';

        // Добавим созданный файл в ./package.json
        let hasThisBlock = false;
        for (let block in pjson.configProject.blocks) {
          if (block === blockName) {
            hasThisBlock = true;
            break;
          }
        }

        if (!hasThisBlock) {
          pjson.configProject.blocks[blockName] = [];
          let newPackageJson = JSON.stringify(pjson, '', 2);
          fs.writeFileSync('./package.json', newPackageJson);
          fileCreateMsg = '[NTH] Подключение блока добавлено в package.json';
        }
      }

      else if (extension === 'html') {
        fileContent = '<div class="' + blockName + '">content</div>\n';
      }

      else if (extension === 'js') {
        fileContent = '// (function(){\n// код\n// }());\n';
      }

      // Если нужна подпапка для картинок
      else if (extension === 'img') {
        let imgFolder = dirPath + 'img/';
        if (fileExist(imgFolder) === false) {
          mkdirp(imgFolder).then(() => {
            console.log('[NTH] Папка создана: ' + imgFolder + ' (если отсутствует)');
          });
        }
      }

      if (fileExist(filePath) === false && extension !== 'img') {
        fs.writeFile(filePath, fileContent, (err) => {
          if (err) {
            return console.log('[NTH] Файл не создан: ' + err);
          }
          console.log('[NTH] Файл создан: ' + filePath);
          if (fileCreateMsg) {
            console.warn(fileCreateMsg);
          }
        });
      } else if (extension !== 'img') {
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
