'use strict';

// Пакеты, использующиеся при обработке
const {series, parallel, src, dest, watch, lastRun} = require('gulp');
const fs = require('fs');
const del = require('del');
const pug = require('gulp-pug');
const debug = require('gulp-debug');
const through2 = require('through2');
const plumber = require('gulp-plumber');
const replace = require('gulp-replace');
const jsonFormat = require('json-format');
const htmlbeautify = require('gulp-html-beautify');
const browserSync = require('browser-sync').create();
const getClassesFromHtml = require('get-classes-from-html');
const sass = require('gulp-sass');  //компиляция scss
const notify = require('gulp-notify'); //вывод ошибок в систему
const gulpIf = require('gulp-if'); //создание условий
const postcss = require('gulp-postcss'); //преобразование и оптимизация css, images
const autoprefixer = require('autoprefixer'); //автопрефиксы
const mqpacker = require('css-mqpacker'); //конкатенация mediaquery's
const atImport = require('postcss-import'); //импорт .css файлов при сборке стилей
const cssnano = require('cssnano'); //минификация css
const inlineSVG = require('postcss-inline-svg'); //инлайн svg файлов с параметрами из css
const objectFitImages = require('postcss-object-fit-images'); //полифилит свойство object-fit

// Настройки из файла
let config = require('./config.js');
// Директории из настроек (dir.src = './src/', dir.build = './build/', dir.blocks = './src/blocks/')
let dir = config.dir;
// Список блоков, который будет получен из классов html после компиляции pug
let blocksList = [];
// Старый список блоков в виде строки
let oldBlocksListString = JSON.stringify(config.blocks);
// Адрес репозитория
let repoUrl = require('./package.json').repository.url.replace(/\.git$/g, '');
// Определение: разработка это или финальная сборка
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'dev';
// Сообщение для компилируемых файлов
let doNotEditMsg = '\n ВНИМАНИЕ! Этот файл генерируется автоматически.\n Любые изменения этого файла будут потеряны при следующей компиляции.\n Любое изменение проекта без возможности компиляции ДОЛЬШЕ И ДОРОЖЕ в 2-3 раза.\n\n';
// Настройки pug-компилятора
let pugOption = {
  data: {repoUrl: repoUrl},
  filters: {'show-code': filterShowCode}
};
// Плагины PostCSS
let postCssPlugins = [
  autoprefixer(),
  mqpacker({
    sort: true
  }),
  atImport(),
  inlineSVG(),
  objectFitImages()
];

function compilePug() {
  return src([`${dir.src}pages/**/*.pug`])
    .pipe(plumber())
    .pipe(debug({title: 'Compiles '}))
    .pipe(pug(pugOption))
    .pipe(through2.obj(getClassesToBlocksList))
    .on('end', function () {
      checkBlockList(true) // Компилируются все; можно убирать блоки, которых больше нет
    })
    .pipe(dest(dir.build));
}

exports.compilePug = compilePug;

// Компиляция только изменившегося (с последнего запуска задачи) pug-файла
function compilePugFast() {
  return src([`${dir.src}pages/**/*.pug`], {since: lastRun(compilePugFast)})
    .pipe(plumber())
    .pipe(debug({title: 'Compiles '}))
    .pipe(pug(pugOption))
    .pipe(through2.obj(getClassesToBlocksList))
    .on('end', checkBlockList)
    .pipe(dest(dir.build));
}

exports.compilePugFast = compilePugFast;

function writePugMixinsFile(cb) {
  const regExp = dir.blocks.replace('./', '');
  let allBlocksWithPugFiles = getDirectories(dir.blocks, 'pug');
  //console.log(allowBlocksWithPugFiles);
  let pugMixins = doNotEditMsg.replace(/\n /gm, '\n//- ');
  allBlocksWithPugFiles.forEach(function (blockName) {
    pugMixins += `include ${dir.blocks.replace(dir.src, '../')}${blockName}/${blockName}.pug\n`;
  });
  fs.writeFileSync(`${dir.src}pug/mixins.pug`, pugMixins);
  cb();
}

exports.writePugMixinsFile = writePugMixinsFile;

function compileSass() {
  return src(`${dir.src}sass/style.scss`, {sourcemaps: true})
    .pipe(plumber())
    .pipe(debug({title: 'Compiles:'}))
    .pipe(sass({includePaths: [__dirname+'/']}))
    .pipe(postcss(postCssPlugins))
    .pipe(gulpIf(!isDev, postcss([cssnano()])))
    .pipe(dest(`${dir.build}/css`, {sourcemaps: '.'}))
    .pipe(browserSync.stream());
}

exports.compileSass = compileSass;

function writeSassImportsFile(cb) {
  let msg = `\n/* !*${doNotEditMsg.replace(/\n /gm, '\n * ').replace(/\n\n$/, '\n */\n')}`;
  let styleImports = msg;
  config.addStyleBefore.forEach(function (src) {
    styleImports += `@import "${src}";\n`;
  });
  config.blocks.forEach((block) => {
    let src = `${dir.blocks}${block}/${block}.scss`;
    if (fileExist(src)) styleImports += `@import "${src}";\n`;
  });
  config.addStyleAfter.forEach((src) => {
    styleImports += `@import "${src}";\n`;
  });
  styleImports += msg;
  fs.writeFileSync(`${dir.src}sass/style.scss`, styleImports);
  cb();
}

exports.writeSassImportsFile = writeSassImportsFile;

function clearBuildDir() {
  return del(`${dir.build}**/*`)
}

exports.clearBuildDir = clearBuildDir;

function reload(done) {
  browserSync.reload();
  done();
}

function serve() {
  browserSync.init({
    server: dir.build,
    port: 8080,
    startPath: 'index.html',
    open: false
  });
  // Файлы разметки страниц (изменение, добавление)
  watch([`${dir.src}pages/**/*.pug`], {
    events: ['change', 'add'],
    delay: 100
  }, series(compilePugFast, writeSassImportsFile, compileSass, reload));
  // Файлы разметки страниц (удаление)
  watch([`${dir.src}pages/**/*.pug`])
    .on('unlink', function (path, stats) {
      console.log(`path: ${path}`);
      // console.log(`dir.src.replace('./', '') + 'pages/': ${dir.src.replace('./', '') + 'pages/'}`);
      // console.log(`path.replace(dir.src.replace('./', '') + 'pages/', dir.build): ${path.replace(`${dir.src.replace('./', '')}pages\\`, dir.build)}`);
      // console.log(`path.replace(dir.src.replace('./', '') + 'pages/', dir.build).replace('.pug', '.html'): ${path.replace(dir.src.replace('./', '') + 'pages/', dir.build).replace('.pug', '.html')}`);
      let filePathInBuildDir = path.replace('src\\pages\\', dir.build).replace('.pug', '.html');
      fs.unlink(filePathInBuildDir, (err) => {
        if (err) throw err;
        console.log(`---------- ${filePathInBuildDir} удалён`);
      });
    });
  // Файлы разметки БЭМ-блоков (изменение, добавление)
  watch([`${dir.blocks}**/*.pug`], {
    events: ['change', 'add'],
    delay: 100
  }, series(compilePug, writeSassImportsFile, compileSass, reload));
  // Файлы разметки БЭМ-блоков (удаление)
  watch([`${dir.blocks}**/*.pug`], {events: ['unlink'], delay: 100}, series(writePugMixinsFile));
  // Глобальные pug-файлы, кроме файла примесей (все события)
  watch([`${dir.src}pug/**/*.pug`, `!${dir.src}pug/mixins.pug`], series(compilePug, writeSassImportsFile, compileSass, reload));
  // Стилевые файлы БЭМ-блоков (любые события)
  watch([`${dir.blocks}**/*.scss`], {events: ['all'], delay: 100}, series(writeSassImportsFile, compileSass));
  // Глобальные стилевые файлы, кроме файла с импортами (любые события)
  watch([`${dir.src}sass/**/*.scss`, `!${dir.src}sass/style.scss`], {events: ['all'], delay: 100}, series(compileSass));
}

exports.default = series(
  parallel(clearBuildDir, writePugMixinsFile),
  compilePugFast,
  writeSassImportsFile,
  compileSass,
  serve
);


// Функции, не являющиеся задачами Gulp --------------------

/**
 * Запись конфигурационного файла
 * @param  {object} config Конфиг
 */
function writeConfig(config) {
  let settings = {
    type: 'space',
    size: 2
  };
  let configText = '// Файл перезаписывается программно при работе автоматизации\nlet config =\n' + jsonFormat(config, settings) + ';\n\nmodule.exports = config;\n';
  fs.writeFile('./config.js', configText, function (err) {
    if (err) throw err;
    console.log('---------- Записан новый config.js');
  })
}

/**
 * Pug-фильтр, выводящий содержимое pug-файла в виде форматированного текста
 */
function filterShowCode(text, options) {
  let lines = text.split('\n');
  let result = '<pre class="code">\n';
  if (typeof (options['first-line']) !== 'undefined') result = result + '<code>' + options['first-line'] + '</code>\n';
  for (let i = 0; i < (lines.length - 1); i++) { // (lines.length - 1) для срезания последней строки (пустая)
    result = result + '<code>' + lines[i] + '</code>\n';
  }
  result = result + '</pre>\n';
  result = result.replace(/<code><\/code>/g, '<code>&nbsp;</code>');
  return result;
}

/**
 * Проверка существования файла или папки
 * @param  {string} path      Путь до файла или папки
 * @return {boolean}
 */
function fileExist(path) {
  let flag = true;
  try {
    fs.accessSync(path, fs.F_OK);
  } catch (e) {
    flag = false;
  }
  return flag;
}

/**
 * Получение всех названий поддиректорий, содержащих файл указанного расширения, совпадающий по имени с поддиректорией
 * @param  {string} source Путь к папке всех блоков.
 * @param  {string} ext    Расширение файлов, которое проверяется
 * @return {array}         Массив из имён блоков
 */
function getDirectories(source, ext) {
  console.log(`source: ${source}`);
  return fs.readdirSync(source)
    .filter(item => fs.lstatSync(source + item).isDirectory())
    .filter(item => fileExist(source + item + '/' + item + '.' + ext));
}

/**
 * Получение разницы между двумя массивами.
 * @param  {array} a1 Первый массив
 * @param  {array} a2 Второй массив
 * @return {array}    Элементы, которые отличаются
 */
function getArraysDiff(a1, a2) {
  return a1.filter(i => !a2.includes(i)).concat(a2.filter(i => !a1.includes(i)))
}

// Оставить в массиве только уникальные значения (убрать повторы)
function uniqueArray(arr) {
  return Array.from(new Set(arr));
}

/**
 * СЛУЖЕБНАЯ: Добавляет список классов из принятого HTML в переменную blocksList, используется в потоке обработки Pug.
 * @param  {object}   file Обрабатываемый файл
 * @param  {string}   enc  Кодировка
 * @param  {Function} cb   Коллбэк
 */

function getClassesToBlocksList(file, enc, cb) {
  // Если файл не существует
  if (file.isNull()) {
    cb(null, file);
    return;
  }
  // Проверка, не является ли обрабатываемый файл исключением
  let processThisFile = true;
  config.notGetBlocks.forEach((item) => {
    console.log(`file.relative: ${file.relative}\nitem: ${item}`);
    if (file.relative.trim() === item.trim()) processThisFile = false;
  });
  // Файл не исключён, следующие действия
  if (processThisFile) {
    const fileContent = file.contents.toString();
    let classesInFile = getClassesFromHtml(fileContent);
    // Обход всех найденных классов
    for (let item of classesInFile) {
      // Если это не блок или этот блок уже есть, пропуск
      if ((item.indexOf('__') + 1 !== 0) || (item.indexOf('--') + 1 !== 0) || (blocksList.indexOf(item) + 1)) continue;
      // Если этот класс совпадает с классом-исключением из настроек, не будем добавлять
      if (config.ignoredBlocks.indexOf(item) + 1) continue;
      // Добавляем
      blocksList.push(item);
    }
    file.contents = Buffer.from(fileContent);
  }
  this.push(file);
  cb();
}

/**
 * СЛУЖЕБНАЯ: Обновляет глобальную переменную с актуальным список блоков
 * @param  {Boolean} removeBlocks Удалять ли не найденные блоки
 */
function checkBlockList(removeBlocks = false) {
  if (blocksList.length) {
    if (removeBlocks) {
      // Убрать из списка блоков те элементы, которых нет в списке блоков, полученном из HTML
      config.blocks = config.blocks.filter(item => blocksList.indexOf(item) >= 0);
      console.log(`убрали из конфига блоки, которых нет в html: ${config.blocks}`);
    }
    // Добавить в конец списка блоков те элементы, которые использованы в HTML, но отсутствуют в списке
    // Array.prototype.push.apply(config.blocks, getArraysDiff(blocksList, config.blocks));
    config.blocks = config.blocks.concat(getArraysDiff(blocksList, config.blocks));
    config.blocks = uniqueArray(config.blocks);
    // ИМЕЕМ СПИСОК ИСПОЛЬЗОВАННЫХ СЕЙЧАС НА ПРОЕКТЕ БЛОКОВ
    // console.log(`добавили блоки, которые есть в html, но нет в списке: ${config.blocks}`);
    // Если есть изменения списка блоков
    if (oldBlocksListString !== JSON.stringify(config.blocks)) {
      // Записать новый конфиг
      writeConfig(config);
      // Подновить старый список блоков
      oldBlocksListString = JSON.stringify(config.blocks);
    }
  } else {
    console.log('---------- В проекте нет блоков. Сурово. По-челябински.');
  }
}
