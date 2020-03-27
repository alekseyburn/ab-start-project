'use strict';

// Зависимости
const fs = require('fs');
const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const sourcemaps = require('gulp-sourcemaps'); //карты кода
const buffer = require('vinyl-buffer'); //читает поток данных и сохраняет в буфер для трансформаций
const merge = require('merge-stream'); //объединяет потоки

const postcss = require('gulp-postcss'); //преобразование и оптимизация css, images
const atImport = require('postcss-import'); //импорт .css файлов при сборке стилей
const inlineSVG = require('postcss-inline-svg'); //инлайн svg файлов с параметрами из css
const objectFitImages = require('postcss-object-fit-images'); //полифилит свойство object-fit
const sass = require('gulp-sass');  //компиляция scss
const autoprefixer = require('autoprefixer'); //автопрефиксы
const cssnano = require('cssnano'); //минификация css
const mqpacker = require('css-mqpacker'); //конкатенация mediaquery's

const plumber = require('gulp-plumber'); //отмена прерывания из-за ошибок
const gulpIf = require('gulp-if'); //создание условий
const rename = require('gulp-rename'); //переименовывание файлов
const size = require('gulp-size'); //размер файла
const del = require('del'); //удаление файлов
const newer = require('gulp-newer'); //запускает задачи только для обновившихся файлов
const notify = require('gulp-notify'); //вывод ошибок в систему
const wait = require('gulp-wait2'); //добавляет задержку между пайпами

const imagemin = require('gulp-imagemin');  //оптимизация изображений
const pngquant = require('imagemin-pngquant');  //сжатие png
const svgstore = require('gulp-svgstore');  //создание svg спрайта
const spritesmith = require('gulp.spritesmith');  //создание png спрайта

const uglify = require('gulp-uglify'); //минификация js
const concat = require('gulp-concat'); //объединение файлов в один

const ghPages = require('gh-pages');  //запускает деплой в ветку gh-pages

const pug = require('gulp-pug'); //шаблонизатор html
const prettier = require('gulp-html-beautify'); //бьютификация html
const pugLinter = require('gulp-pug-lint'); //линтер pug

// Получение настроек проекта из projectConfig.json
let projectConfig = require('./projectConfig.json');
let dirs = projectConfig.dirs;
let lists = getFilesList(projectConfig);
// console.log(lists);

// Получение адреса репозитория
let repoUrl = require('./package.json').repository.url.replace(/\.git$/g, '');

// Формирование и запись диспетчера подключений (style.scss), который компилируется в style.min.css
let styleImports = '/* !*\n * ВНИМАНИЕ! Этот файл генерируется автоматически.\n * Не пишите сюда ничего вручную, все такие правки будут потеряны.\n * Читайте ./README.md для понимания.\n */\n\n';
lists.css.forEach(blockPath => styleImports += '@import \'' + blockPath + '\';\n');
fs.writeFileSync(dirs.srcPath + 'sass/style.scss', styleImports);

// Формирование и запись списка примесей (mixins.pug) со списком инклудов всех pug-файлов блоков
let pugMixins = '//- ВНИМАНИЕ! Этот файл генерируется автоматически. Не пишите сюда ничего вручную!\n//- Читайте ./README.md для понимания.\n\n';
lists.pug.forEach(blockPath => pugMixins += 'include ' + blockPath + '\n');
fs.writeFileSync(dirs.srcPath + 'pug/mixins.pug', pugMixins);

// Запуск `NODE_ENV=production npm start [задача]` приведет к сборке без sourcemaps
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'dev';

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

// Очистка папки сборки
gulp.task('clean', () => {
  console.log('---------- Очистка папки сборки');
  return del([
    dirs.buildPath + '/**/*',
    '!' + dirs.buildPath + '/readme.md'
  ]);
});

// Компиляция SCSS и добавочных стилей
gulp.task('scss', () => {
  console.log('---------- Компиляция стилей');
  return gulp.src(dirs.srcPath + 'sass/style.scss')
    .pipe(plumber({
      errorHandler: (err) => {
        notify.onError({
          title: 'Styles compilation error',
          message: err.message
        })(err);
        this.emit('end');
      }
    }))
    .pipe(wait(100))
    .pipe(gulpIf(isDev, sourcemaps.init()))
    .pipe(sass({includePaths: [__dirname+'/']}))
    .pipe(postcss(postCssPlugins))
    .pipe(gulpIf(!isDev, postcss([cssnano()])))
    .pipe(rename('style.min.css'))
    .pipe(gulpIf(isDev, sourcemaps.write('/')))
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.buildPath + '/css'))
    .pipe(browserSync.stream());
});

// Копирование добавочных css, которые будут подключены отдельными файлами
gulp.task('copy:css', (cb) => {
  if (projectConfig.copiedCss.length) {
    return gulp.src(projectConfig.copiedCss)
      .pipe(postcss(postCssPlugins))
      .pipe(postcss([cssnano({
        // discardUnused: false  //не удалять неиспользуемые классы
      })]))
      .pipe(size({
        title: 'Размер',
        showFiles: true,
        showTotal: false,
      }))
      .pipe(gulp.dest(dirs.buildPath + '/css'))
      .pipe(browserSync.stream());
  } else {
    cb();
  }
});

// Копирование изображений
gulp.task('copy:img', () => {
  console.log('---------- Копирование изображений');
  return gulp.src(lists.img)
    .pipe(newer(dirs.buildPath + '/img'))  // оставить в потоке только изменившиеся файлы
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.buildPath + '/img'));
});

// Копирование JS
gulp.task('copy:js', (cb) => {
  if (projectConfig.copiedJs.length) {
    return gulp.src(projectConfig.copiedJs)
      .pipe(size({
        title: 'Размер',
        showFiles: true,
        showTotal: false,
      }))
      .pipe(gulp.dest(dirs.buildPath + '/js'));
  } else {
    cb();
  }
});

// Копирование шрифтов
gulp.task('copy:fonts', () => {
  console.log('---------- Копирование шрифтов');
  return gulp.src(dirs.srcPath + '/fonts/*.{ttf,woff,woff2,eot,svg}')
    .pipe(newer(dirs.buildPath + '/fonts'))  // оставить в потоке только изменившиеся файлы
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.buildPath + '/fonts'));
});

// Фавиконки
gulp.task('copy:favicon', () => {
  console.log('---------- Копирование фавиконок');
  return gulp.src(dirs.srcPath + '/favicon/*.{png,ico,svg}')
    .pipe(gulp.dest(dirs.buildPath + '/img/favicon'));
});
gulp.task('copy:favicon:data', () => {
  return gulp.src(dirs.srcPath + '/favicon/*.{xml,webmanifest}')
    .pipe(gulp.dest(dirs.buildPath + '/'));
});

// Сборка SVG-спрайта для блока sprite-svg
let spriteSvgPath = dirs.srcPath + dirs.blocksDirName + '/sprite-svg/svg/';
gulp.task('sprite:svg', (cb) => {
  if ((projectConfig.blocks['sprite-svg']) !== undefined) {
    if (fileExist(spriteSvgPath) !== false) {
      console.log('---------- Сборка SVG спрайта');
      return gulp.src(spriteSvgPath + '*.svg')
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
        .pipe(rename('sprite-svg.svg'))
        .pipe(size({
          title: 'Размер',
          showFiles: true,
          showTotal: false,
        }))
        .pipe(gulp.dest(dirs.srcPath + dirs.blocksDirName + '/sprite-svg/img/'));
    } else {
      console.log('---------- Сборка SVG спрайта: ОТМЕНА, нет папки с картинками');
      cb();
    }
  } else {
    console.log('---------- Сборка SVG спрайта: ОТМЕНА, блок не используется на проекте');
    cb();
  }
});

// Сборка png-спрайта
let spritePngPath = dirs.srcPath + dirs.blocksDirName + '/sprite-png/png/';
gulp.task('sprite:png', (cb) => {
  if ((projectConfig.blocks['sprite-png']) !== undefined) {
    if (fileExist(spritePngPath) !== false) {
      del(dirs.srcPath + dirs.blocksDirName + '/sprite-png/img/*.png');
      let fileName = 'sprite-' + Math.random().toString().replace(/[^0-9]/g, '') + '.png';
      let spriteData = gulp.src(spritePngPath + '*.png')
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
        .pipe(gulp.dest(dirs.srcPath + dirs.blocksDirName + '/sprite-png/img/'));
      let cssStream = spriteData.css
        .pipe(gulp.dest(dirs.srcPath + dirs.blocksDirName + '/sprite-png/'));
      return merge(imgStream, cssStream);
    } else {
      console.log('---------- Сборка PNG спрайта: ОТМЕНА, нет папки с картинками');
      cb();
    }
  } else {
    console.log('---------- Сборка PNG спрайта: ОТМЕНА, блок не используется на проекте');
    cb();
  }
});

// Сборка Pug
gulp.task('pug', () => {
  console.log('---------- Сборка Pug');
  // Pug-фильтр, выводящий содержимое pug-файла в виде форматированного текста
  const filterShowCode = function (text, options) {
    let lines = text.split('\n');
    let result = '<pre class="code">\n';
    if (typeof (options['first-line']) !== 'undefined') result = result + '<code>' + options['first-line'] + '</code>\n';
    for (let i = 0; i < (lines.length - 1); i++) { // (lines.length - 1) для срезания последней строки (пустая)
      result = result + '<code>' + lines[i] + '</code>\n';
    }
    result = result + '</pre>\n';
    result = result.replace(/<code><\/code>/g, '<code>&nbsp;</code>');
    return result;
  };

  return gulp.src([
    dirs.srcPath + '*.pug',
  ])
    .pipe(plumber())
    .pipe(pug({
      data: {
        repoUrl: repoUrl,
      },
      filters: {
        'show-code': filterShowCode
      },
      // compileDebug: false,
    }))
    .pipe(prettier())
    .pipe(gulp.dest(dirs.buildPath));
});

gulp.task('test:pug', () => {
  return gulp.src('src/**/*.pug')
    .pipe(pugLinter());
});

// Конкатенация и углификация Javascript
gulp.task('js', (cb) => {
  if (lists.js.length > 0) {
    console.log('---------- Обработка JS');
    return gulp.src(lists.js)
      .pipe(plumber({
        errorHandler: (err) => {
          notify.onError({
            title: 'Javascript concat/uglify error',
            message: err.message
          })(err);
          this.emit('end');
        }
      }))
      .pipe(concat('script.min.js'))
      .pipe(gulpIf(!isDev, uglify()))
      .pipe(size({
        title: 'Размер',
        showFiles: true,
        showTotal: false,
      }))
      .pipe(gulp.dest(dirs.buildPath + '/js'));
  } else {
    console.log('---------- Обработка JS: в сборке нет JS-файлов');
    cb();
  }
});

// Оптимизация изображений (ручная)
// set folder=src/img npm start img:opt
const folder = process.env.folder;
gulp.task('img:opt', (cb) => {
  if (folder) {
    console.log('---------- Оптимизация картинок');
    return gulp.src(folder + '/*.{jpg,jpeg,gif,png,svg}')
      .pipe(imagemin([
        imagemin.svgo({
          plugins: [{
            removeViewBox: false
          }]
        }),
        imagemin.mozjpeg({quality: 80}),
        pngquant({
          quality: [0.6, 0.8],
          floyd: 1,
          speed: 1
        })
      ]))
      .pipe(gulp.dest(folder));
  } else {
    console.log('---------- Оптимизация картинок: ошибка (не указана папка)');
    console.log('---------- Пример вызова команды: folder=src/blocks/block-name/img npm start img:opt');
    cb();
  }
});

// Сборка всего
gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('sprite:svg', 'sprite:png', 'copy:favicon', 'copy:favicon:data'),
  gulp.parallel('scss', 'js', 'copy:css', 'copy:img', 'copy:js', 'copy:fonts'),
  'pug'
));

// Публикация на github pages
gulp.task('deploy', (cb) => {
  console.log('---------- Публикация содержимого ./build/ на GH pages');
  ghPages.publish('build', cb);
});

// Локальный сервер
gulp.task('serve', gulp.series('build', () => {
  browserSync.init({
    server: dirs.buildPath,
    notify: false,
    open: false,
    cors: true,
    ui: false,
    startPath: 'index.html'
  });
  // Слежение за стилями
  let stylePaths = [
    dirs.srcPath + 'sass/style.scss'
  ];
  // for (let block of lists.blocksDirs) {
  //   stylePaths.push(dirs.srcPath + block + '*.scss');
  // }
  for (let i = 0, len = lists.blocksDirs.length; i < len; ++i) {
    stylePaths.push(dirs.srcPath + lists.blocksDirs[i] + '*.scss');
  }
  stylePaths = stylePaths.concat(projectConfig.addCssBefore, projectConfig.addCssAfter);
  gulp.watch(stylePaths, gulp.series('scss'));

  // Слежение за добавочными стилями
  if (projectConfig.copiedCss.length) {
    gulp.watch(projectConfig.copiedCss, gulp.series('copy:css', reload));
  }
  // Слежение за JS
  if (lists.js.length) {
    gulp.watch(lists.js, gulp.series('js', reload));
  }
  // Слежение за добавочными js
  if (projectConfig.copiedJs.length) {
    gulp.watch(projectConfig.copiedJs, gulp.series('copy:js', reload));
  }
  // Слежение за изображениями
  if (lists.img.length) {
    gulp.watch(lists.img, gulp.series('copy:img', reload));
  }
  // Слежение за шрифтами
  gulp.watch(dirs.srcPath + 'fonts/*.{ttf,woff,woff2,eot,svg}', gulp.series('copy:fonts', reload));
  // Слежение за svg (спрайты)
  if ((projectConfig.blocks['sprite-svg']) !== undefined) {
    gulp.watch('*.svg', {cwd: spriteSvgPath}, gulp.series('sprite:svg', reload)); // следит за новыми и удаляемыми файлами
  }
  // Слежение за png (спрайты)
  if ((projectConfig.blocks['sprite-png']) !== undefined) {
    gulp.watch('*.png', {cwd: spritePngPath}, gulp.series('sprite:png', reload)); // следит за новыми и удаляемыми файлами
  }
  // Слежение за pug
  if (lists.pug.length) {
    let pugPaths = [
      dirs.srcPath + '*.pug',
      dirs.srcPath + 'pug/*.pug'
    ];
    for (let block of lists.blocksDirs) {
      pugPaths.push(dirs.srcPath + block + '*.pug');
    }
    gulp.watch(pugPaths, gulp.series('pug', reload));
  }
}));

// Задача по умолчанию
gulp.task('default', gulp.series('serve'));

/**
 * Вернет объект с обрабатываемыми файлами и папками
 * @param  {object}
 * @return {object}
 */
function getFilesList(config) {

  let res = {
    'css': [],
    'js': [],
    'img': [],
    'pug': [],
    'blocksDirs': []
  };

  // Обход массива с блоками проекта
  for (let blockName in config.blocks) {
    let blockPath = config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/';

    if (fileExist(blockPath)) {
      // Разметка (Pug)
      if (fileExist(blockPath + blockName + '.pug')) {
        res.pug.push('../' + config.dirs.blocksDirName + '/' + blockName + '/' + blockName + '.pug');
      } else {
        console.log('---------- Блок ' + blockName + ' указан как используемый, но не имеет pug-файла.');
      }

      // Стили
      if (fileExist(blockPath + blockName + '.scss')) {
        res.css.push(blockPath + blockName + '.scss');
        if (config.blocks[blockName].length) {
          config.blocks[blockName].forEach((elementName) => {
            if (fileExist(blockPath + blockName + elementName + '.scss')) {
              res.css.push(blockPath + blockName + elementName + '.scss');
            }
          });
        }
      } else {
        console.log('---------- Блок ' + blockName + ' указан как используемый, но не имеет scss-файла.');
      }

      // Скрипты
      if (fileExist(blockPath + blockName + '.js')) {
        res.js.push(blockPath + blockName + '.js');
        if (config.blocks[blockName].length) {
          config.blocks[blockName].forEach((elementName) => {
            if (fileExist(blockPath + blockName + elementName + '.js')) {
              res.js.push(blockPath + blockName + elementName + '.js');
            }
          });
        }
      } else {
        // console.log('---------- Блок ' + blockName + ' указан как используемый, но не имеет JS-файла.');
      }

      // Изображения
      res.img.push(config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/img/*.{jpg,jpeg,gif,png,svg}');

      res.blocksDirs.push(config.dirs.blocksDirName + '/' + blockName + '/');
    } else {
      console.log('ERR ------ Блок ' + blockPath + ' указан как используемый, но такой папки нет!');
    }
  }

  // Добавления
  res.css = res.css.concat(config.addCssAfter);
  res.css = config.addCssBefore.concat(res.css);
  res.js = res.js.concat(config.addJsAfter);
  res.js = config.addJsBefore.concat(res.js);
  res.img = config.addImages.concat(res.img);

  return res;
}

/**
 * Проверка существования файла или папки
 * @param  {string} path      Путь до файла или папки]
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

// Перезагрузка браузера
function reload(done) {
  browserSync.reload();
  done();
}
