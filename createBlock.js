'use strict';

// Использование: node createBlock.js [имя блока] [доп. расширения через пробел]

const fs = require('fs');
const projectConfig = require('./config.js');

const dir = projectConfig.dir; // Объект с директориями
const mkdirp = require('mkdirp'); // Зависимость - создание папки

/*
process.argv[n]
[0] - всегда node
[1] - Имя файла для исполнения
[2-...] - Значения, переданные в коммандную строку после имени файла
В нашем случае [2] - имя блока, [3-...] - имена расширений
 */
const blockName = process.argv[2];
const defaultExtensions = ['scss', 'pug']; //расширения по умолчанию
//добавляем к массиву defaultExtensions additional extensions, заданные при вводе run node createBlock, затем удаляем дубликаты
const extensions = uniqueArray(defaultExtensions.concat(process.argv.slice(3)));

if (blockName) {
  const dirPath = `${dir.blocks + blockName}/`;
  mkdirp(dirPath).then(() => {
    console.log(`[NTH] Создание папки ${dirPath} (создана, если ещё не существует)`);

    extensions.forEach((extension) => {
      const filePath = `${dirPath + blockName}.${extension}`;
      let fileContent = '';
      let fileCreateMsg = '';
      if (extension === 'scss') {
        fileContent = `// В этом файле должны быть стили для БЭМ-блока ${blockName}, его элементов,\n// модификаторов, псевдоселекторов, псевдоэлементов, @media-условий...\n// Очередность: http://nicothin.github.io/idiomatic-pre-CSS/#priority\n\n.${blockName} {\n\n  $block-name:                &; // #{$block-name}__element\n}\n`;
      } else if (extension === 'js') {
        fileContent = `/* global document */\n\n// const ready = require('../../js/utils/documentReady.js');\n\n// ready(function(){\n//   \n// });\n`;
      } else if (extension === 'md') {
        fileContent = '';
      } else if (extension === 'pug') {
        fileContent = `//- Все примеси в этом файле должны начинаться c имени блока (${blockName})\n\nmixin ${blockName}(classes)\n\n  //- Принимает:\n  //-   classes    {string} - список классов\n  //- Вызов:\n        +${blockName}('some-class')\n\n  -\n    // список классов\n    let allClasses = '';\n    if(typeof(classes) !== 'undefined' && classes) {\n      for (let item of classes.split(',')) {\n        allClasses = allClasses + item.trim();\n      }\n    }\n\n  div(class=\`\${allClasses.length > 0 ? \`\${allClasses}\` : \`\`}${blockName}\`)&attributes(attributes)\n    block\n`;
      } else if (extension === 'img') {
        const imgFolder = `${dirPath}img/`;
        if (fileExist(imgFolder) === false) {
          mkdirp(imgFolder).then(() => {
            console.log(`[NTH] Папка создана: ${imgFolder} (если отсутствует)`);
          });
        }
      }

      if (fileExist(filePath) === false && extension !== 'img' && extension !== 'md') {
        fs.writeFile(filePath, fileContent, (err) => {
          if (err) {
            return console.log(`[NTH] Файл не создан: ${err}`);
          }
          console.log(`[NTH] Файл создан: ${filePath}`);
          if (fileCreateMsg) {
            console.warn(fileCreateMsg);
          }
        });
      } else if (extension !== 'img' && extension !== 'md') {
        console.log(`[NTH] Файл не создан: ${filePath} уже существует`);
      } else if (extension === 'md') {
        fs.writeFile(`${dirPath}readme.md`, fileContent, (err) => {
          if (err) {
            return console.log(`[NTH] Файл НЕ создан: ${err}`);
          }
          console.log(`[NTH] Файл создан: ${dirPath}readme.md`);
          if (fileCreateMsg) {
            console.warn(fileCreateMsg);
          }
        });
      }
    });
  });
} else {
  console.log(`[NTH] Отмена операции: не указан блок`);
}

function uniqueArray(arr) {
  return Array.from(new Set(arr));
}

function fileExist(path) {
  try {
    fs.statSync(path);
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
}
