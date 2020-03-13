'use strict';

// Использование: node createBlock.js [имя блока] [доп. расширения через пробел]

const fs = require('fs'); // Для работы с файловой системой
const pjson = require('./package.json'); // Чтобы получать настройки из package.json
const dirs = pjson.config.directories; // Объект с директориями
const mkdirp = require('mkdirp'); // Зависимость - создание папки

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

    // Читаем файл диспетчера подключений
    let connectManager = fs.readFileSync(dirs.source + '/sass/style.scss', 'utf8');

    // Делаем из строк массив, фильтруем, оставляя только строки с незакомментированными импортами
    let fileSystem = connectManager.split('\n').filter(item => {
      return /^(\s*)@import/.test(item);
    });

    extensions.forEach((extension) => {
      let filePath = dirPath + blockName + '.' + extension;
      let fileContent = '';
      let SCSSfileImport = ''; // конструкция импорта будущего scss
      let fileCreateMsg = '';
      if (extension === 'scss') {
        SCSSfileImport = '@import \'' + dirs.source + '/blocks/' + blockName + '/' + blockName + '.scss\';';
        fileContent = '.' + blockName + ' {\n  \n}\n';

        let reg = new RegExp(SCSSfileImport, '');

        // флаг отсутствия блока среди импортов
        let importExist = false;

        // Обойдем массив и проверим наличие импорта
        for (let item of fileSystem) {
          if (reg.test(item)) {
            importExist = true;
            break;
          }
        }

        // Если импорт по-прежнему false, то допишем импорт
        if (!importExist) {
          fs.open(dirs.source + '/sass/style.scss', 'a', (err, fileHandle) => {
            if (!err) {
              fs.write(fileHandle, SCSSfileImport + '\n', null, 'utf8', (err, written) => {
                if (!err) {
                  console.log('[NTH] В диспетчер подключений (' + dirs.source + '/sass/style.scss) записано: ' + SCSSfileImport);
                } else {
                  console.log('[NTH] ОШИБКА записи в ' + dirs.source + '/sass/style.scss: ' + err);
                }
              });
            } else {
              console.log('[NTH] ОШИБКА открытия ' + dirs.source + '/sass/style.scss: ' + err);
            }
          });
        } else {
          console.log('[NTH] Импорт НЕ прописан в ' + dirs.source + '/sass/style.scss (он там уже есть)');
        }
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
