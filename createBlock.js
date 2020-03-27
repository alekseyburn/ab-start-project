'use strict';

// Использование: node createBlock.js [имя блока] [доп. расширения через пробел]

const fs = require('fs'); // Для работы с файловой системой
const projectConfig = require('./projectConfig.json'); // Чтобы получать настройки из package.json
const dirs = projectConfig.dirs; // Объект с директориями
const mkdirp = require('mkdirp'); // Зависимость - создание папки

/*
process.argv[n]
[0] - всегда node
[1] - Имя файла для исполнения
[2-...] - Значения, переданные в коммандную строку после имени файла
В нашем случае [2] - имя блока, [3-...] - имена расширений
 */
const blockName = process.argv[2];
const defaultExtensions = ['scss', 'pug', 'md', 'img']; //расширения по умолчанию

//добавляем к массиву defaultExtensions additional extensions, заданные при вводе run node createBlock, затем удаляем дубликаты
const extensions = uniqueArray(defaultExtensions.concat(process.argv.slice(3)));

if (blockName) {

  const dirPath = `${dirs.srcPath + dirs.blocksDirName}/${blockName}/`;
  mkdirp(dirPath).then(() => {
    console.log(`[NTH] Создание папки ${dirPath} (создана, если ещё не существует)`);

    extensions.forEach((extension) => {
      const filePath = `${dirPath + blockName}.${extension}`;
      let fileContent = '';
      let fileCreateMsg = '';
      if (extension === 'scss') {
        fileContent = `// В этом файле должны быть стили для БЭМ-блока ${blockName}, его элементов,\n// модификаторов, псевдоселекторов, псевдоэлементов, @media-условий...\n// Очередность: http://nicothin.github.io/idiomatic-pre-CSS/#priority\n\n.${blockName} {\n\n  $block-name:                &; // #{$block-name}__element\n}\n`;      }

      else if (extension === 'html') {
        fileContent = `<div class="${blockName}">content</div>\n`;
      }

      else if (extension === 'js') {
        fileContent = '// (function(){\n// код\n// }());\n';
      }

      else if (extension === 'md') {
        fileContent = '';
      }

      else if (extension === 'pug') {
        fileContent = `//- Все примеси в этом файле должны начинаться c имени блока (${blockName})\n\nmixin ${blockName}(text, mods)\n\n  //- Принимает:\n  //-   text    {string} - текст\n  //-   mods    {string} - список модификаторов\n  //- Вызов:\n        +${blockName}('Текст', 'some-mod')\n\n  -\n    // список модификаторов\n    var allMods = '';\n    if(typeof(mods) !== 'undefined' && mods) {\n      var modsList = mods.split(',');\n      for (var i = 0; i < modsList.length; i++) {\n        allMods = allMods + ' ${blockName}--' + modsList[i].trim();\n      }\n    }\n\n  .${blockName}(class=allMods)&attributes(attributes)\n    .${blockName}__inner!= text\n`;
      }

      // Если нужна подпапка для картинок
      else if (extension === 'img') {
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

    // Добавим созданный файл
    let hasThisBlock = false;
    for (const block in projectConfig.blocks) {
      if (block === blockName) {
        hasThisBlock = true;
        break;
      }
    }
    if (!hasThisBlock) {
      projectConfig.blocks[blockName] = [];
      const newPackageJson = JSON.stringify(projectConfig, '', 2);
      fs.writeFileSync('./projectConfig.json', newPackageJson);
      console.log('[NTH] Подключение блока добавлено в projectConfig.json');
    }
  });
} else {
  console.log(`[NTH] Отмена операции: не указан блок`);
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
