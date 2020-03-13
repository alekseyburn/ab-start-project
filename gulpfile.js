'use strict';

const gulp = require('gulp');
const fs = require('fs');
const path = require('path');
const del = require('del'); //удаление файлов
const rename = require('gulp-rename');  //переименовывание файлов
const sourcemaps = require('gulp-sourcemaps');  //карты кода
const gulpIf = require('gulp-if');  //создание условий
const newer = require('gulp-newer'); //запускает задачи только для обновившихся файлов
const ghPages = require('gh-pages');  //запускает деплой в ветку gh-pages
const browserSync = require('browser-sync').create();

// Получение настроек папок из package.json
const pjson = require('./package.json');
const dirs = pjson.config.directories;

const postcss = require('gulp-postcss');  //преобразование и оптимизация css, js
const sass = require('gulp-sass');  //компиляция scss
const cssnano = require('cssnano'); //минификация css
const mqpacker = require('css-mqpacker'); //конкатенация mediaquery's
const autoprefixer = require('autoprefixer'); //автопрефиксы

const imagemin = require('gulp-imagemin');  //оптимизация изображений
const mozjpeg = require('imagemin-mozjpeg');  //сжатие jpeg
const pngquant = require('imagemin-pngquant');  //сжатие png
const svgstore = require('gulp-svgstore');  //создание спрайта
const cheerio = require('gulp-cheerio'); //удаление ненужных параметров в svg

const uglify = require('gulp-uglify'); //минификация js
const concat = require('gulp-concat'); //объединение файлов в один

// Запуск `NODE_ENV=production npm start [задача]` приведет к сборке без sourcemaps
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'dev';

// Файлы компилируемых компонентов
let blocks = getComponentsFiles();

// Вывод в консоль информации о взятых в сборку файлах (без LESS)
if (blocks.js.length) {
  console.log('---------- В сборку и обработку взяты JS-файлы:');
  console.log(blocks.js);
}
if (blocks.img.length) {
  console.log('---------- В сборку и обработку взяты изображения:');
  console.log(blocks.img);
}
if (blocks.additionalCss.length) {
  console.log('---------- В сборку скопированы добавочные CSS:');
  console.log(blocks.additionalCss);
}

// Компиляция SCSS
gulp.task('scss', () => {
  return gulp.src(dirs.source + '/sass/style.scss')
    .pipe(gulpIf(isDev, sourcemaps.init()))
    .pipe(sass())
    .pipe(postcss([
      autoprefixer(),
      mqpacker()
    ]))
    .pipe(gulpIf(!isDev, postcss([cssnano()])))
    .pipe(rename('style.min.css'))
    .pipe(gulpIf(isDev, sourcemaps.write('.')))
    .pipe(gulp.dest(dirs.build + '/css'))
    .pipe(browserSync.stream());
});

// Копирование добавочных css
gulp.task('copy:css', (cb) => {
  if (blocks.additionalCss.length > 0) {
    return gulp.src(blocks.additionalCss, {since: gulp.lastRun('copy:css')})
      .pipe(postcss([
        autoprefixer(),
        mqpacker(),
        cssnano({
          discardUnused: false  //не удалять неиспользуемые классы
        })
      ]))
      // .pipe(rename((path) => {
      //   path.basename = 'additional-styles';
      //   path.extname = '.min.css'
      // }))
      .pipe(gulp.dest(dirs.build + '/css'));
  } else {
    console.log('---------- Копирование CSS: нет дополнительного CSS');
    cb();
  }
});

// Копирование и оптимизация изображений
gulp.task('img', () => {
  return gulp.src(blocks.img, {since: gulp.lastRun('img')}) //только для изменившихся с последнего запуска
    .pipe(newer(dirs.build + '/img')) //оставить в потоке только изменившиеся файлы
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
    .pipe(gulp.dest(dirs.build + '/img'));
});

// Создание svg-спрайта
gulp.task('sprite:svg', (cb) => {
  let spritePath = dirs.source + '/img/svg-sprite/';
  if (fileExist(spritePath) !== false) {
    return gulp.src(spritePath + '*.svg')
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
      .pipe(cheerio(($) => {
        $('svg').attr('style', 'display: none');
      }))
      .pipe(rename('sprite.svg'))
      .pipe(gulp.dest(dirs.build + '/img'))
  } else {
    console.log('---------- Сборка SVG спрайта: нет папки с картинками');
    cb();
  }
});

gulp.task('html', () => {
  return gulp.src(dirs.source + '/*.html')
    .pipe(gulp.dest(dirs.build));
});

// Оптимизация JS
gulp.task('js', (cb) => {
  if (blocks.js.length > 0) {
    return gulp.src(blocks.js)
      .pipe(gulpIf(isDev, sourcemaps.init()))
      .pipe(concat('script.min.js'))
      .pipe(gulpIf(!isDev, uglify()))
      .pipe(gulpIf(isDev, sourcemaps.write('.')))
      .pipe(gulp.dest(dirs.build + '/js'));
  } else {
    console.log('---------- Обработка Javascript: в сборке нет js-файлов');
    cb();
  }
});

// Очистка папки build
gulp.task('clean', () => del([
  dirs.build + '/**/*',
  '!' + dirs.build + '/readme.md'
]));

// Сборка и выполнение всех тасков
gulp.task('build', gulp.series(
  'clean',
  'sprite:svg',
  gulp.parallel('scss', 'copy:css', 'img', 'js'),
  'html'
));

// Локальный сервер, слежение
gulp.task('serve', gulp.series('build', () => {
  browserSync.init({
    server: dirs.build,
    notify: false,
    open: true,
    cors: true,
    ui: false,
    startPath: 'index.html'
  });
  gulp.watch(dirs.source + '/*.html', gulp.series('html', reloader));
  gulp.watch(blocks.scss, gulp.series('scss'));
  if (blocks.img) {
    gulp.watch(blocks.img, gulp.series('img', reloader));
  }
  if (blocks.js) {
    gulp.watch(blocks.js, gulp.series('js', reloader));
  }
}));

// Публикация на github pages
gulp.task('deploy', (cb) => {
  ghPages.publish('build', {dotfiles: false}, cb);
});

// Задача по умолчанию
gulp.task('default',
  gulp.series('serve')
);

// Перезагрузка в браузере
function reloader(cb) {
  browserSync.reload();
  cb();
}

// Определение собираемых компонентов
//Собирает из папок src/blocks/... и корневых папок img,js,css,scss
function getComponentsFiles() {
  // Создаем объект для служебных данных
  let componentsFilesList = {
    scss: [], //  тут будут scss-файлы в том же порядке, в котором они подключены
    js: [],  // тут будут JS-файлы компонент в том же порядке, в котором подключены scss-файлы
    img: [], // тут будет массив из «путь_до_блока/img/*.{jpg,jpeg,gif,png,svg}» для всех импортируемых блоков
    additionalCss: [], // тут будут CSS-файлы компонент в том же порядке, в котором подключены scss-файлы
  };
  let jsLibs = []; // тут будут сторонние JS-файлы из используемых блоков (библиотеки), потом вставим в начало сomponentsFilesList.js
  // Читаем файл диспетчера подключений
  let connectManager = fs.readFileSync(dirs.source + '/sass/style.scss', 'utf8');
  // Фильтруем массив, оставляя только строки с незакомментированными импортами
  let fileSystem = connectManager.split('\n').filter((item) => {
    return /^(\s*)@import/.test(item);
  });
  // Обойдём массив и запишем его части в объект результирующей переменной
  fileSystem.forEach((item) => {
    // Попробуем вычленить блок из строки импорта   /blocks/block/name.scss\css
    let componentData = /\/blocks\/(.+?)(\/)(.+?)(?=.(scss|css))/g.exec(item);
    // Если это блок и получилось извлечь имя файла
    if (componentData !== null && componentData[3]) {
      // Название блока (название папки)
      let componentName = componentData[1];
      // Папка блока
      let blockDir = dirs.source + '/blocks/' + componentName;
      // Имя подключаемого файла без расширения
      let componentFileName = componentData[3];
      // Имя JS-файла, который нужно взять в сборку, если он существует
      let jsFile = blockDir + '/' + componentFileName + '.js';
      // Имя CSS-файла, который нужно обработать, если он существует
      let cssFile = blockDir + '/' + componentFileName + '.css';
      // Папка с картинками, которую нужно взять в обработку, если она существует
      let imagesDir = blockDir + '/img';

      // Добавляем в массив с результатом SCSS-файл
      componentsFilesList.scss.push(dirs.source + componentData[0] + '.' + componentData[4]);
      // Если в папке блока есть сторонние js-файлы - добавляем их в массив с реультатом (это библиотеки)
      let blockFiles = fs.readdirSync(blockDir); // Список файлов
      let reg = new RegExp(componentName + '(\.|--)', '');
      blockFiles.forEach((file) => {
        if (/\.js$/.test(file) && !reg.test(file)) {
          if (fileExistAndHasContent(blockDir + '/' + file)) {  // и если он существует и не пуст
            jsLibs.push(blockDir + '/' + file); // добавим в массив библиотек
          }
        }
      });
      jsLibs = uniqueArray(jsLibs);
      // Если существует js-файл - добавляем его в массив с результатом
      if (fileExistAndHasContent(jsFile)) {
        componentsFilesList.js.push(jsFile);
      }
      // Если существует css-файл - берем его в массив
      if (fileExistAndHasContent(cssFile)) {
        componentsFilesList.additionalCss.push(cssFile);
      }
      // Берем в массив изображения
      if (fileExist(imagesDir) !== false) {
        componentsFilesList.img.push(imagesDir + '/*.{jpg,jpeg,png,svg}');
      }
    }
  });

  // Добавим глобальные scss-файлы в массив с обрабатываемыми scss файлами
  componentsFilesList.scss.push(dirs.source + '/sass/**/*.scss');
  // Добавим глобальный JS-файл в начало массива с обрабатываемыми JS-файлами
  if (fileExistAndHasContent(dirs.source + '/js/global-script.js')) {
    componentsFilesList.js.unshift(dirs.source + '/js/global-script.js');
  }
  // Добавим js библиотеки (если есть) в начало списка js-файлов
  if (jsLibs) {
    componentsFilesList.js = jsLibs.concat(componentsFilesList.js);
  }
  // Добавим глобальный CSS-файл в начало массива с обрабатываемыми CSS-файлами
  if (fileExistAndHasContent(dirs.source + '/css/global-additional-css.css')) {
    componentsFilesList.additionalCss.unshift(dirs.source + '/css/global-additional-css.css');
  }
  // Добавим глобальные изображения
  componentsFilesList.img.unshift(dirs.source + '/img/*.{jpg,jpeg,png,svg}');
  componentsFilesList.img = uniqueArray(componentsFilesList.img);
  return componentsFilesList;
}

// Проверка существования файла и его размера (размер менее 2байт == файла нет)
function fileExistAndHasContent(path) {
  try {
    fs.statSync(path);
    return fs.statSync(path).size > 1;
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
}

// Проверка существования файла
function fileExist(path) {
  try {
    fs.statSync(path);
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
}

// Оставить в массиве только уникальные значения (убрать повторы)
function uniqueArray(arr) {
  return Array.from(new Set(arr));
}
