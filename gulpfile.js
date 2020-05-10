/* eslint-disable no-console */
'use strict';

// setInterval(function(){ // eslint-disable-line
//   let memory = process.memoryUsage();
//   let date = new Date();
//   console.log(`[${addZero(date.getHours())}:${addZero(date.getMinutes())}:${addZero(date.getSeconds())}]`, 'Memory usage (heapUsed):', (memory.heapUsed / 1024 / 1024).toFixed(2) + 'Mb');
// }, 1000 * 10);
//
// function addZero(i) {
//   return (i < 10) ? i = "0" + i : i;
// }

// Пакеты, использующиеся при обработке
const {series, parallel, src, dest, watch, lastRun} = require('gulp');
const fs = require('fs');
const del = require('del');
const pug = require('gulp-pug');
const debug = require('gulp-debug');
const through2 = require('through2');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
// const prettyHtml = require('gulp-pretty-html');
// const replace = require('gulp-replace');
const browserSync = require('browser-sync').create();
const getClassesFromHtml = require('get-classes-from-html');
const sass = require('gulp-sass');  //компиляция scss
const postcss = require('gulp-postcss'); //преобразование и оптимизация css, images
const autoprefixer = require('autoprefixer'); //автопрефиксы
const mqpacker = require('css-mqpacker'); //конкатенация mediaquery's
const atImport = require('postcss-import'); //импорт .css файлов при сборке стилей
const cssnano = require('cssnano'); //минификация css
const inlineSVG = require('postcss-inline-svg'); //инлайн svg файлов с параметрами из css
const objectFitImages = require('postcss-object-fit-images'); //полифилит свойство object-fit
const buffer = require('vinyl-buffer');
const uglify = require('gulp-uglify');
const cpy = require('cpy');
const imagemin = require('gulp-imagemin');  //оптимизация изображений
const pngquant = require('imagemin-pngquant');  //сжатие png
const svgstore = require('gulp-svgstore');  //создание svg спрайта
const spritesmith = require('gulp.spritesmith');  //создание png спрайта
const merge = require('merge-stream'); //объединяет потоки
const ghPages = require('gh-pages');  //запускает деплой в ветку gh-pages
const path = require('path');
const webpackStream = require('webpack-stream');
const webp = require('gulp-webp');
const critical = require('critical').stream;

// Глобальные настройки запуска
const nth = {};
nth.config = require('./config.js');
nth.blocksFromHtml = Object.create(nth.config.alwaysAddBlocks); // блоки из конфига сразу добавим в список блоков
nth.scssImportsList = []; // Список импортов стилей
const dir = nth.config.dir;

// Сообщение для компилируемых файлов
let doNotEditMsg = '\n ВНИМАНИЕ! Этот файл генерируется автоматически.\n Любые изменения этого файла будут потеряны при следующей компиляции.\n Любое изменение проекта без возможности компиляции ДОЛЬШЕ И ДОРОЖЕ в 2-3 раза.\n\n';

// Настройки pug-компилятора
let pugOption = {
  data: {repoUrl: 'https://github.com/alekseyburn/Travelly'}
};

// Настройки html-pretty
// let prettyOption = {
//   indent_size: 2,
//   indent_char: ' ',
//   inline: ['span'],
//   unformatted: ['code', 'em', 'strong', 'span', 'i', 'b', 'br', 'script'],
//   content_unformatted: []
// };

// Плагины PostCSS
let postCssPlugins = [
  autoprefixer(),
  mqpacker({
    sort: true
  }),
  atImport(),
  inlineSVG(),
  objectFitImages(),
  cssnano()
];

function writePugMixinsFile(cb) {
  let allBlocksWithPugFiles = getDirectories('pug');
  let pugMixins = `//-${doNotEditMsg.replace(/\n /gm, '\n ')}`;
  allBlocksWithPugFiles.forEach(function (blockName) {
    pugMixins += `include ${dir.blocks.replace(dir.src, '../')}${blockName}/${blockName}.pug\n`;
  });
  fs.writeFileSync(`${dir.src}pug/mixins.pug`, pugMixins);
  cb();
}

exports.writePugMixinsFile = writePugMixinsFile;

function compilePug() {
  return src([`${dir.src}pages/**/*.pug`])
    .pipe(plumber({
      errorHandler: function (err) {
        console.log(err.message);
        this.emit('end');
      }
    }))
    .pipe(debug({title: 'Compiles '}))
    .pipe(pug(pugOption))
    // .pipe(prettyHtml(prettyOption))
    // .pipe(replace(/^(\s*)(<button.+?>)(.*)(<\/button>)/gm, '$1$2\n$1  $3\n$1$4'))
    // .pipe(replace(/^( *)(<.+?>)(<script>)([\s\S]*)(<\/script>)/gm, '$1$2\n$1$3\n$4\n$1$5\n'))
    // .pipe(replace(/^( *)(<.+?>)(<script\s+src.+>)(?:[\s\S]*)(<\/script>)/gm, '$1$2\n$1$3$4'))
    .pipe(through2.obj(getClassesToBlocksList))
    .pipe(dest(dir.build));
}

exports.compilePug = compilePug;

// Компиляция только изменившегося (с последнего запуска задачи) pug-файла
function compilePugFast() {
  return src([`${dir.src}pages/**/*.pug`], {since: lastRun(compilePugFast)})
    .pipe(plumber({
      errorHandler: function (err) {
        console.log(err.message);
        this.emit('end');
      }
    }))
    .pipe(debug({title: 'Compiles '}))
    .pipe(pug(pugOption))
    // .pipe(prettyHtml(prettyOption))
    // .pipe(replace(/^(\s*)(<button.+?>)(.*)(<\/button>)/gm, '$1$2\n$1  $3\n$1$4'))
    // .pipe(replace(/^( *)(<.+?>)(<script>)([\s\S]*)(<\/script>)/gm, '$1$2\n$1$3\n$4\n$1$5\n'))
    // .pipe(replace(/^( *)(<.+?>)(<script\s+src.+>)(?:[\s\S]*)(<\/script>)/gm, '$1$2\n$1$3$4'))
    .pipe(through2.obj(getClassesToBlocksList))
    .pipe(dest(dir.build));
}

exports.compilePugFast = compilePugFast;

function copyAssets(cb) {
  for (let item in nth.config.addAssets) {
    let dest = `${dir.build}${nth.config.addAssets[item]}`;
    cpy(item, dest);
  }
  cb();
}

exports.copyAssets = copyAssets;

function copyImg(cb) {
  let copiedImages = [];
  nth.blocksFromHtml.forEach((block) => {
    let src = `${dir.blocks}${block}/img`;
    if (fileExist(src)) copiedImages.push(src);
  });
  nth.config.alwaysAddBlocks.forEach((block) => {
    let src = `${dir.blocks}${block}/img`;
    if (fileExist(src)) copiedImages.push(src);
  });
  if (copiedImages.length) {
    (async () => {
      await cpy(copiedImages, `${dir.build}img`);
      cb();
    })();
  } else {
    cb();
  }
}

exports.copyImg = copyImg;

function generateSvgSprite(cb) {
  let spriteSvgPath = `${dir.blocks}sprite-svg/svg/`;
  if (nth.config.alwaysAddBlocks.indexOf('sprite-svg') > -1 && fileExist(spriteSvgPath)) {
    return src(spriteSvgPath + '*.svg')
      .pipe(imagemin([
        imagemin.svgo({
          plugins: [{
            cleanupIDs: {
              minify: true
            }
          }]
        })
      ]))
      .pipe(svgstore({inlineSvg: true}))
      .pipe(rename('sprite.svg'))
      .pipe(dest(`${dir.blocks}sprite-svg/img/`));
  } else {
    cb();
  }
}

exports.generateSvgSprite = generateSvgSprite;

function optimizeImages() {
  let img = src(`${dir.src}img/*.{png,svg,jpg,jpeg}`, {since: lastRun(optimizeImages)})
    .pipe(buffer())
    .pipe(imagemin([
      imagemin.svgo({
        plugins: [{
          removeViewBox: false
        }]
      }),
      imagemin.mozjpeg({quality: 70}),
      pngquant({
        quality: [0.5, 0.8],
        floyd: 1,
        speed: 1
      })
    ]))
    .pipe(dest(`${dir.src}img/`));
  let imgWebp = src(`${dir.src}img/*.{png,jpg,jpeg}`, {since: lastRun(optimizeImages)})
    .pipe(buffer())
    .pipe(webp({
      quality: 70
    }))
    .pipe(dest(`${dir.src}img/`));
  return merge(img, imgWebp);
}

exports.optimizeImages = optimizeImages;

function criticalCssToHtml() {
  return src('build/*.html')
    .pipe(critical({
      base: 'build/',
      inline: true,
      css: [
        'build/css/style.css',
      ],
      minify: true,
      dimensions: [
        {
          height: 480,
          width: 320,
        },
        {
          height: 768,
          width: 1024,
        },
        {
          height: 1080,
          width: 1440,
        }],
      ignore: ['@font-face'],
    }))
    .on('error', (err) => {
      console.error(err.message);
    })
    .pipe(dest('build'));
}

exports.criticalCssToHtml = criticalCssToHtml;

function generatePngSprite(cb) {
  let spritePngPath = `${dir.blocks}sprite-png/png/`;
  if (nth.config.alwaysAddBlocks.indexOf('sprite-png') > -1 && fileExist(spritePngPath)) {
    del(`${dir.blocks}sprite-png/img/*.png`);
    let fileName = 'sprite-' + Math.random().toString().replace(/[^0-9]/g, '') + '.png';
    let spriteData = src(spritePngPath + '*.png')
      .pipe(spritesmith({
        imgName: fileName,
        cssName: 'sprite-png.scss',
        padding: 4,
        imgPath: '../img/' + fileName
      }));
    let imgStream = spriteData.img
      .pipe(buffer())
      .pipe(imagemin([
        pngquant({
          quality: [0.5, 0.8],
          floyd: 1,
          speed: 1
        })
      ]))
      .pipe(dest(`${dir.blocks}sprite-png/img/`));
    let cssStream = spriteData.css
      .pipe(dest(`${dir.blocks}sprite-png/`));
    return merge(imgStream, cssStream);
  } else {
    cb();
  }
}

exports.generatePngSprite = generatePngSprite;

function writeSassImportsFile(cb) {
  const newScssImportsList = [];
  nth.config.addStyleBefore.forEach((src) => {
    newScssImportsList.push(src);
  });
  nth.config.alwaysAddBlocks.forEach((blockName) => {
    if (fileExist(`${dir.blocks}${blockName}/${blockName}.scss`)) {
      newScssImportsList.push(`${dir.blocks}${blockName}/${blockName}.scss`);
    }
  });
  let allBlocksWithScssFiles = getDirectories('scss');
  allBlocksWithScssFiles.forEach((blockWithScssFile) => {
    let url = `${dir.blocks}${blockWithScssFile}/${blockWithScssFile}.scss`;
    if (nth.blocksFromHtml.indexOf(blockWithScssFile) === -1) return;
    if (newScssImportsList.indexOf(url) > -1) return;
    newScssImportsList.push(url);
  });
  nth.config.addStyleAfter.forEach((src) => {
    newScssImportsList.push(src);
  });
  let diff = getArraysDiff(newScssImportsList, nth.scssImportsList);
  if (diff.length) {
    let msg = `\n/* !*${doNotEditMsg.replace(/\n /gm, '\n * ').replace(/\n\n$/, '\n */\n\n')}`;
    let styleImports = msg;
    newScssImportsList.forEach((src) => {
      styleImports += `@import "${src}";\n`;
    });
    styleImports += msg;
    fs.writeFileSync(`${dir.src}sass/style.scss`, styleImports);
    console.log('---------- Write new style.scss');
    nth.scssImportsList = newScssImportsList;
  }
  cb();
}

exports.writeSassImportsFile = writeSassImportsFile;

function compileSass() {
  return src(`${dir.src}sass/style.scss`, {sourcemaps: true})
    .pipe(plumber())
    .pipe(debug({title: 'Compiles:'}))
    .pipe(sass({includePaths: [__dirname + '/', 'node_modules']}))
    .pipe(postcss(postCssPlugins))
    .pipe(dest(`${dir.build}/css`, {sourcemaps: '.'}))
    .pipe(browserSync.stream());
}

exports.compileSass = compileSass;

function writeJsRequiresFile(cb) {
  const jsRequiresList = [];
  nth.config.addJsBefore.forEach((src) => {
    jsRequiresList.push(src);
  });
  const allBlocksWithJsFiles = getDirectories('js');
  allBlocksWithJsFiles.forEach((blockName) => {
    if (nth.config.alwaysAddBlocks.indexOf(blockName) === -1) return;
    jsRequiresList.push(`../blocks/${blockName}/${blockName}.js`)
  });
  allBlocksWithJsFiles.forEach((blockName) => {
    let src = `../blocks/${blockName}/${blockName}.js`;
    if (nth.blocksFromHtml.indexOf(blockName) === -1) return;
    if (jsRequiresList.indexOf(src) > -1) return;
    jsRequiresList.push(src);
  });
  nth.config.addJsAfter.forEach((src) => {
    jsRequiresList.push(src);
  });
  let msg = `\n/*!*${doNotEditMsg.replace(/\n /gm, '\n * ').replace(/\n\n$/, '\n */\n\n')}`;
  let jsRequires = msg;
  jsRequiresList.forEach((src) => {
    jsRequires += `require('${src}');\n`;
  });
  jsRequires += msg;
  fs.writeFileSync(`${dir.src}js/entry.js`, jsRequires);
  console.log('---------- Write new entry.js');
  cb();
}

exports.writeJsRequiresFile = writeJsRequiresFile;

function buildJs() {
  return src(`${dir.src}js/entry.js`)
    .pipe(plumber())
    .pipe(webpackStream({
      mode: 'production',
      entry: {
        'bundle': `./${dir.src}js/entry.js`,
      },
      output: {
        filename: '[name].js',
      },
      module: {
        rules: [
          {
            test: /\.(js)$/,
            exclude: /(node_modules)/,
            loader: 'babel-loader',
            query: {
              presets: ['@babel/preset-env']
            }
          }
        ]
      },
      // externals: {
      //  jquery: 'jQuery'
      // }
    }))
    .pipe(uglify())
    .pipe(dest(`${dir.build}js`));
}

exports.buildJs = buildJs;

function clearBuildDir() {
  return del(`${dir.build}**/*`);
}

exports.clearBuildDir = clearBuildDir;

function reload(done) {
  browserSync.reload();
  done();
}

function deploy(cb) {
  ghPages.publish(path.join(process.cwd(), dir.build), cb);
}

exports.deploy = deploy;

function serve() {
  browserSync.init({
    server: dir.build,
    port: 8080,
    startPath: 'index.html',
    open: false,
    notify: false
  });

  // Страницы: изменение, добавление
  watch([`${dir.src}pages/**/*.pug`], {
    events: ['change', 'add'],
    delay: 100
  }, series(
    compilePugFast,
    parallel(writeSassImportsFile, writeJsRequiresFile),
    parallel(compileSass, buildJs),
    reload
  ));

  // Страницы: удаление
  watch([`${dir.src}pages/**/*.pug`])
    .on('unlink', function (path) {
      console.log(`path: ${path}`);
      // console.log(`dir.src.replace('./', '') + 'pages/': ${dir.src.replace('./', '') + 'pages/'}`);
      // console.log(`path.replace(dir.src.replace('./', '') + 'pages/', dir.build): ${path.replace(`${dir.src.replace('./', '')}pages\\`, dir.build)}`);
      // console.log(`path.replace(dir.src.replace('./', '') + 'pages/', dir.build).replace('.pug', '.html'): ${path.replace(dir.src.replace('./', '') + 'pages/', dir.build).replace('.pug', '.html')}`);
      let filePathInBuildDir = path.replace(dir.src + 'pages/', dir.build).replace('.pug', '.html');
      fs.unlink(filePathInBuildDir, (err) => {
        if (err) throw err;
        console.log(`---------- Delete:  ${filePathInBuildDir}`);
      });
    });

  // Разметка Блоков: изменение
  watch([`${dir.blocks}**/*.pug`], {events: ['change'], delay: 100}, series(
    compilePug,
    reload
  ));

  // Разметка Блоков: добавление
  watch([`${dir.blocks}**/*.pug`], {events: ['add'], delay: 100}, series(
    writePugMixinsFile,
    compilePug,
    reload
  ));

  // Разметка Блоков: удаление
  watch([`${dir.blocks}**/*.pug`], {events: ['unlink'], delay: 100}, writePugMixinsFile);

  // Шаблонные pug-файлы, кроме файла примесей (все события)
  watch([`${dir.src}pug/**/*.pug`, `!${dir.src}pug/mixins.pug`], {
    delay: 100
  }, series(
    compilePug,
    parallel(writeSassImportsFile, writeJsRequiresFile),
    parallel(compileSass, buildJs),
    reload
  ));

  // Стили Блоков: изменение
  watch([`${dir.blocks}**/*.scss`], {events: ['change'], delay: 100}, series(
    compileSass,
  ));

  // Стили Блоков: добавление
  watch([`${dir.blocks}**/*.scss`], {events: ['add'], delay: 100}, series(
    writeSassImportsFile,
    compileSass,
  ));

  // Глобальные стилевые файлы, кроме файла с импортами (любые события)
  watch([`${dir.src}sass/**/*.scss`, `!${dir.src}sass/style.scss`], {events: ['all'], delay: 100}, series(compileSass));

  // Глобальные Js-файлы и js-файлы блоков
  watch([`${dir.src}js/**/*.js`, `!${dir.src}js/entry.js`, `${dir.blocks}**/*.js`], {
    events: ['all'],
    delay: 100
  }, series(writeJsRequiresFile, buildJs, reload));

  // Картинки: все события
  watch([`${dir.blocks}**/img/*.{jpg,jpeg,png,gif,svg,webp}`], {events: ['all'], delay: 100}, series(copyImg, reload));

  // Слежение за спрайтами
  watch([`${dir.blocks}sprite-svg/svg/*.svg`], {
    events: ['all'],
    delay: 100
  }, series(
    generateSvgSprite,
    copyImg,
    reload
  ));
  watch([`${dir.blocks}sprite-png/png/*.png`], {
    events: ['all'],
    delay: 100
  }, series(
    generatePngSprite,
    copyImg,
    compileSass,
    reload
  ));
}

exports.build = series(
  parallel(clearBuildDir, writePugMixinsFile),
  parallel(compilePugFast, copyAssets, generateSvgSprite, generatePngSprite),
  parallel(copyImg, writeSassImportsFile, writeJsRequiresFile),
  parallel(compileSass, buildJs),
);

exports.default = series(
  parallel(clearBuildDir, writePugMixinsFile),
  parallel(compilePugFast, copyAssets, generateSvgSprite, generatePngSprite),
  parallel(copyImg, writeSassImportsFile, writeJsRequiresFile),
  parallel(compileSass, buildJs),
  serve,
);

// Функции, не являющиеся задачами Gulp --------------------

/**
 * Получение списка классов из HTML и запись его в глоб. переменную nth.blocksFromHtml.
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
  nth.config.notGetBlocks.forEach((item) => {
    console.log(`file.relative: ${file.relative}\nitem: ${item}`);
    if (file.relative.trim() === item.trim()) processThisFile = false;
  });
  // Файл не исключён, следующие действия
  if (processThisFile) {
    const fileContent = file.contents.toString();
    let classesInFile = getClassesFromHtml(fileContent);
    // nth.blocksFromHtml = [];
    // Обход всех найденных классов
    for (let item of classesInFile) {
      // Если это не блок или этот блок уже есть, пропуск
      if ((item.indexOf('__') > -1) || (item.indexOf('--') > -1) || (nth.blocksFromHtml.indexOf(item) + 1)) continue;
      // Если этот класс совпадает с классом-исключением из настроек, не будем добавлять
      if (nth.config.ignoredBlocks.indexOf(item) + 1) continue;
      // У этого блока отсутствует папка?
      // if (!fileExist(dir.blocks + item)) continue;
      // Добавляем
      nth.blocksFromHtml.push(item);
    }
    console.log('---------- Used HTML blocks:   ' + nth.blocksFromHtml.join(', '));
    file.contents = new Buffer.from(fileContent);
  }
  this.push(file);
  cb();
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
 * @param  {string} ext    Расширение файлов, которое проверяется
 * @return {array}         Массив из имён блоков
 */
function getDirectories(ext) {
  let source = dir.blocks;
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
