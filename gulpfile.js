'use strict';

// Зависимости
const fs = require('fs');
const gulp = require('gulp');
const postcss = require('gulp-postcss'); //преобразование и оптимизация css, js
const browserSync = require('browser-sync').create();
const plumber = require('gulp-plumber'); //отмена прерывания из-за ошибок
const gulpIf = require('gulp-if'); //создание условий
const sourcemaps = require('gulp-sourcemaps'); //карты кода
const sass = require('gulp-sass');  //компиляция scss
const cssnano = require('cssnano'); //минификация css
const autoprefixer = require('autoprefixer'); //автопрефиксы
const mqpacker = require('css-mqpacker'); //конкатенация mediaquery's
const rename = require('gulp-rename'); //переименовывание файлов
const size = require('gulp-size'); //размер файла
const del = require('del'); //удаление файлов
const newer = require('gulp-newer'); //запускает задачи только для обновившихся файлов
const imagemin = require('gulp-imagemin');  //оптимизация изображений
const mozjpeg = require('imagemin-mozjpeg');  //сжатие jpeg
const pngquant = require('imagemin-pngquant');  //сжатие png
const svgstore = require('gulp-svgstore');  //создание спрайта
const cheerio = require('gulp-cheerio'); //удаление ненужных параметров в svg
const spritesmith = require('gulp.spritesmith');  //создание png спрайта
const buffer = require('vinyl-buffer'); //читает поток данных и сохраняет в буфер для трансформаций
const merge = require('merge-stream');  //объединяет потоки
const uglify = require('gulp-uglify'); //минификация js
const concat = require('gulp-concat'); //объединение файлов в один
const ghPages = require('gh-pages');  //запускает деплой в ветку gh-pages

// Получим настройки проекта из package.json
let pjson = require('./package.json');
let dirs = pjson.configProject.dirs;
let lists = getFilesList(pjson.configProject);
console.log(lists);

// Запишем стилевой файл в диспетчер подключений
let styleImports = '';
lists.css.forEach(blockPath => {
  styleImports += '@import \''+blockPath+'\';\n';
});
console.log(`styleImports: ${styleImports}`);
fs.writeFileSync(dirs.srcPath + 'sass/style.scss', styleImports);

// Запуск `NODE_ENV=production npm start [задача]` приведет к сборке без sourcemaps
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'dev';

// Очистка папки сборки
gulp.task('clean', function () {
  console.log('---------- Очистка папки сборки');
  return del([
    dirs.buildPath + '/**/*',
    '!' + dirs.buildPath + '/readme.md'
  ]);
});

// Компиляция SCSS
gulp.task('scss', () => {
  console.log('---------- Компиляция стилей');
  return gulp.src(dirs.srcPath + 'sass/style.scss')
    .pipe(plumber())
    .pipe(gulpIf(isDev, sourcemaps.init()))
    .pipe(sass())
    .pipe(postcss([
      autoprefixer(),
      mqpacker({
        sort: true
      })
    ]))
    .pipe(gulpIf(!isDev, postcss([cssnano()])))
    .pipe(rename('style.min.css'))
    .pipe(gulpIf(isDev, sourcemaps.write('.')))
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.buildPath + '/css'))
    .pipe(browserSync.stream({match: '**/*.css'}));
});

// Копирование добавочных css
gulp.task('copy:css', (cb) => {
  if (pjson.configProject.copiedCss.length) {
    return gulp.src(pjson.configProject.copiedCss)
      .pipe(postcss([
        autoprefixer(),
        mqpacker(),
        cssnano({
          discardUnused: false  //не удалять неиспользуемые классы
        })
      ]))
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
  if (pjson.configProject.copiedJs.length) {
    return gulp.src(pjson.configProject.copiedJs)
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

// Сборка SVG-спрайта для блока sprite-svg
let spriteSvgPath = dirs.srcPath + dirs.blocksDirName + '/sprite-svg/svg/';
gulp.task('sprite:svg', (callback) => {
  if ((pjson.configProject.blocks['sprite-svg']) !== undefined) {
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
        // .pipe(cheerio(($) => {
        //   $('svg').attr('style', 'display:none');
        // }))
        .pipe(rename('sprite-svg.svg'))
        .pipe(size({
          title: 'Размер',
          showFiles: true,
          showTotal: false,
        }))
        .pipe(gulp.dest(dirs.srcPath + dirs.blocksDirName + '/sprite-svg/img/'));
    } else {
      console.log('---------- Сборка SVG спрайта: нет папки с картинками');
      callback();
    }
  } else {
    console.log('---------- Сборка SVG спрайта: ОТМЕНА, блок не используется на проекте');
    callback();
  }
});

// Сборка png-спрайта
let spritePngPath = dirs.srcPath + dirs.blocksDirName + '/sprite-png/png/';
gulp.task('sprite:png', (callback) => {
  if ((pjson.configProject.blocks['sprite-png']) !== undefined) {
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
      callback();
    }
  } else {
    console.log('---------- Сборка PNG спрайта: ОТМЕНА, блок не используется на проекте');
    callback();
  }
});

// Сборка HTML
gulp.task('html', () => {
  console.log('---------- сборка HTML');
  return gulp.src(dirs.srcPath + '/*.html')
    .pipe(plumber())
    .pipe(gulp.dest(dirs.buildPath));
});

// Конкатенация и углификация Javascript
gulp.task('js', (callback) => {
  if (lists.js.length > 0) {
    console.log('---------- Обработка JS');
    return gulp.src(lists.js)
      .pipe(plumber())
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
    callback();
  }
});

// Оптимизация изображений // folder=src/img npm start img:opt
const folder = process.env.folder;
gulp.task('img:opt', (callback) => {
  if (folder) {
    console.log('---------- Оптимизация картинок');
    return gulp.src(folder + '/*.{jpg,jpeg,gif,png,svg}')
      .pipe(imagemin([
        imagemin.svgo({
          plugins: [{
            removeViewBox: false
          }]
        }),
        mozjpeg({quality: 80}),
        pngquant({
          quality: [0.5, 0.8],
          floyd: 1,
          speed: 1
        })
      ]))
      .pipe(gulp.dest(folder));
  } else {
    console.log('---------- Оптимизация картинок: ошибка (не указана папка)');
    console.log('---------- Пример вызова команды: folder=src/blocks/block-name/img npm start img:opt');
    callback();
  }
});

// Сборка всего
gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('sprite:svg', 'sprite:png'),
  gulp.parallel('scss', 'js', 'copy:css', 'copy:img', 'copy:js', 'copy:fonts'),
  'html'
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
    ui: false
  });
  // Слежение за стилями
  gulp.watch([
    dirs.srcPath + 'sass/style.scss',
    dirs.srcPath + dirs.blocksDirName + '/**/*.scss',
    dirs.srcPath + 'sass/*.scss'
  ], gulp.series('scss'));
  // Слежение за добавочными стилями
  if (pjson.configProject.copiedCss.length) {
    gulp.watch(pjson.configProject.copiedCss, gulp.series('copy:css'));
  }
  // Слежение за JS
  if (lists.js.length) {
    gulp.watch(lists.js, gulp.series('watch:js'));
  }
  // Слежение за добавочными js
  if (pjson.configProject.copiedJs.length) {
    gulp.watch(pjson.configProject.copiedJs, gulp.series('watch:copied:js'));
  }
  // Слежение за изображениями
  if (lists.img.length) {
    gulp.watch(lists.img, gulp.series('watch:img'));
  }
  // Слежение за шрифтами
  gulp.watch(dirs.srcPath + '/fonts/*.{ttf,woff,woff2,eot,svg}', gulp.series('watch:fonts'));
  // Слежение за svg (спрайты)
  if ((pjson.configProject.blocks['sprite-svg']) !== undefined) {
    gulp.watch('*.svg', {cwd: spriteSvgPath}, gulp.series('watch:sprite:svg')); // следит за новыми и удаляемыми файлами
  }
  // Слежение за png (спрайты)
  if ((pjson.configProject.blocks['sprite-png']) !== undefined) {
    gulp.watch('*.png', {cwd: spritePngPath}, gulp.series('watch:sprite:png')); // следит за новыми и удаляемыми файлами
  }
  // Слежение за html
  gulp.watch([
    '*.html',
    dirs.blocksDirName + '/**/*.html'
    ], {cwd: dirs.srcPath},
    gulp.series('watch:html'));
}));


gulp.task('watch:img', gulp.series('copy:img', reload));
gulp.task('watch:copied:js', gulp.series('copy:js', reload));
gulp.task('watch:fonts', gulp.series('copy:fonts', reload));
gulp.task('watch:sprite:svg', gulp.series('sprite:svg', reload));
gulp.task('watch:sprite:png', gulp.series('sprite:png', reload));
gulp.task('watch:html', gulp.series('html', reload));
gulp.task('watch:js', gulp.series('js', reload));

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
  };

  // CSS
  for (let blockName in config.blocks) {
    res.css.push(config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/' + blockName + '.scss');
    if (config.blocks[blockName].length) {
      config.blocks[blockName].forEach(elementName => {
        res.css.push(config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/' + blockName + elementName + '.scss');
      });
    }
  }
  res.css = res.css.concat(config.addCssAfter);
  res.css = config.addCssBefore.concat(res.css);

  // JS
  for (let blockName in config.blocks) {
    let file = config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/' + blockName + '.js';
    if (fileExist(file)) {
      res.js.push(config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/' + blockName + '.js');
    }
    if (config.blocks[blockName].length) {
      config.blocks[blockName].forEach(elementName => {
        res.js.push(config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/' + blockName + elementName + '.js');
      });
    }
  }
  res.js = res.js.concat(config.addJsAfter);
  res.js = config.addJsBefore.concat(res.js);

  // Images
  for (let blockName in config.blocks) {
    res.img.push(config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/img/*.{jpg,jpeg,gif,png,svg}');
  }
  res.img = config.addImages.concat(res.img);

  return res;
}

/**
 * Проверка существования файла или папки
 * @param  {string} path      Путь до файла или папки]
 * @return {boolean}
 */
function fileExist(path) {
  try {
    fs.statSync(path);
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
}

// Перезагрузка браузера
function reload(done) {
  browserSync.reload();
  done();
}
