'use strict';

const gulp = require('gulp');
const del = require('del'); //удаление файлов
const sass = require('gulp-sass');  //компиляция scss
const sourcemaps = require('gulp-sourcemaps');  //карты кода
const postcss = require('gulp-postcss');  //преобразование и оптимизация css
const cssnano = require('cssnano'); //минификация css
const rename = require('gulp-rename');  //переименовывание файлов
const gulpIf = require('gulp-if');  //создание условий
const imagemin = require('gulp-imagemin');  //оптимизация изображений
const mozjpeg = require('imagemin-mozjpeg');  //сжатие jpeg
const pngquant = require('imagemin-pngquant');  //сжатие png
const svgstore = require('gulp-svgstore');  //создание спрайта
const cheerio = require('gulp-cheerio'); //удаление ненужных параметров в svg
const newer = require('gulp-newer'); //запускает задачи только для обновившихся файлов
const autoprefixer = require('autoprefixer'); //автопрефиксы
const browserSync = require('browser-sync').create();
const uglify = require('gulp-uglify'); //минификация js
const concat = require('gulp-concat'); //объединение файлов в один
const mqpacker = require('css-mqpacker'); //конкатенация mediaquery's
const fs = require('fs');


// const browserslist = require('browserslist'); //единый конфиг autoprefixer, babel и stylelint
// const path = require('path');

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'dev';

//Расположение папки с компонентами
const componentsFolder = './src/blocks/';

let components = getComponentsFiles();
console.log('---------- Список добавочных js/css-файлов и адресов картинок для копирования');
console.log(components);


gulp.task('copy:css', () => {
  return gulp.src(components.css, {since: gulp.lastRun('copy:css')})
    .pipe(postcss([
      autoprefixer(),
      mqpacker(),
      cssnano({
        discardUnused: false  //не удалять неиспользуемые классы
      })
    ]))
    .pipe(rename((path) => {
      path.extname = '.min.css'
    }))
    .pipe(gulp.dest('./build/css'));
});

gulp.task('scss', () => {
  return gulp.src('./src/sass/style.scss')
    .pipe(gulpIf(isDev, sourcemaps.init()))
    .pipe(sass())
    .pipe(postcss([
      autoprefixer(),
      mqpacker(),
      cssnano(),
    ]))
    .pipe(rename('style.min.css'))
    .pipe(gulpIf(isDev, sourcemaps.write('.')))
    .pipe(gulp.dest('./build/css'));
});

gulp.task('js', () => {
  return gulp.src(components.js)
    .pipe(gulpIf(isDev, sourcemaps.init()))
    .pipe(concat('script.min.js'))
    .pipe(uglify())
    .pipe(gulpIf(isDev, sourcemaps.write('.')))
    .pipe(gulp.dest('./build/js'));
});

gulp.task('img', () => {
  return gulp.src(components.img, {since: gulp.lastRun('img')}) //только для изменившихся с последнего запуска
    .pipe(newer('./build/img')) //оставить в потоке только изменившиеся файлы
    .pipe(imagemin([
      imagemin.svgo({
        plugins: [{
          removeViewBox: false
        }]
      }),
      mozjpeg({ quality: 80 }),
      pngquant({
        quality: [0.5, 0.8],
        floyd: 1,
        speed: 1
      })
    ]))
    .pipe(gulp.dest('./build/img'));
});

gulp.task('sprite:svg', () => {
  return gulp.src('./src/img/{icon,logo}-*.svg')
    .pipe(imagemin([
      imagemin.svgo({
        plugins: [{
          cleanupIDs: {
            minify: true
          }
        }]
      })
    ]))
    .pipe(svgstore({ inlineSvg: true }))
    .pipe(cheerio(($) => {
      $('svg').attr('style', 'display: none');
    }))
    .pipe(rename('sprite.svg'))
    .pipe(gulp.dest('./build/img'))
});

gulp.task('watch', () => {
  gulp.watch('./src/**/*.scss', gulp.series('scss'));
  gulp.watch('./src/css/*.css', gulp.series('copy:css'));
  gulp.watch('./src/**/img/*.{jpg,jpeg,png,svg}', gulp.series('img'));
  gulp.watch('./src/**/*.js', gulp.series('js'));
});

gulp.task('clean', () => del('./build/**/*'));
gulp.task('build', gulp.series('clean', gulp.parallel('scss', 'copy:css', 'img', 'sprite:svg', 'js')));
gulp.task('serve', () => {
  gulp.series('build');
  browserSync.init({
    server: './build',
    notify: false,
    open: true,
    cors: true,
    ui: false,
  });

  browserSync.watch(['./build/**/*.*', '!./build/**/*.map.*']).on('change', browserSync.reload);
});

gulp.task('default',
  gulp.series('build', gulp.parallel('watch', 'serve'))
);


// Определение собираемых компонентов
function getComponentsFiles() {
  // Создаем объект для списка файлов компонентов
  let componentsFilesList = {
    js: [],  // тут будут JS-файлы компонент в том же порядке, в котором подключены scss-файлы
    img: [], // тут будет массив из «путь_до_компонента/img/*.{jpg,jpeg,gif,png,svg}» для всех импортируемых компонент
    css: [], // тут будут CSS-файлы компонент в том же порядке, в котором подключены scss-файлы
  };
  // Читаем файл диспетчера подключений
  let connectManager = fs.readFileSync('./src/sass/style.scss', 'utf8');
  // Фильтруем массив, оставляя только строки с незакомментированными импортами
  let fileSystem = connectManager.split('\n').filter((item) => {
    return /^(\s*)@import/.test(item);
  });
  console.log(fileSystem);
  // Обойдём массив и запишем его части в объект результирующей переменной
  fileSystem.forEach((item) => {
    // Попробуем вычленить компонент из строки импорта
    let componentData = /\/blocks\/(.+?)(\/)(.+?)(?=.(scss|css))/g.exec(item);
    // Если это компонент и получилось извлечь имя файла
    if (componentData !== null && componentData[3]) {
      // Название компонента (название папки)
      let componentName = componentData[1];
      // Имя подключаемого файла без расширения
      let componentFileName = componentData[3];
      // Имя JS-файла, который нужно взять в сборку в этой итерации, если он существует
      let jsFile = componentsFolder + componentName + '/' + componentFileName + '.js';
      // Имя CSS-файла, который нужно взять в сборку в этой итерации, если он существует
      let cssFile = componentsFolder + componentName + '/' + componentFileName + '.css';
      // Если существует js-файл - берем его в массив
      if (fileExist(jsFile)) {
        componentsFilesList.js.push(jsFile);
      }
      // Если существует css-файл - берем его в массив
      if (fileExist(cssFile)) {
        componentsFilesList.css.push(cssFile);
      }
      // Берем в массив изображения
      componentsFilesList.img.push(componentsFolder + componentName + '/img/*.{jpg,jpeg,png,svg}');
    }
  });

  // Добавим глобальный JS-файл в начало массива с обрабатываемыми JS-файлами
  if(fileExist('./src/js/global_script.js')) {
    componentsFilesList.js.unshift('./src/js/global_script.js');
  }
  // Добавим глобальный CSS-файл в начало массива с обрабатываемыми CSS-файлами
  if(fileExist('./src/css/global_additional-css.css')) {
    componentsFilesList.css.unshift('./src/css/global_additional-css.css');
  }
  // Добавим глобальные изображения
  componentsFilesList.img.unshift('./src/img/*.{jpg,jpeg,png,svg}');
  componentsFilesList.img = uniqueArray(componentsFilesList.img);
  return componentsFilesList;
}

// Проверка существования файла и его размера (размер менее 2байт == файла нет)
function fileExist(path) {
  const fs = require('fs');
  try {
    fs.statSync(path);
    return fs.statSync(path).size > 1;
  } catch(err) {
    return !(err && err.code === 'ENOENT');
  }
}

// Оставить в массиве только уникальные значения (убрать повторы)
function uniqueArray(arr) {
  let objectTemp = {};
  for (let i = 0; i < arr.length; i++) {
    let str = arr[i];
    objectTemp[str] = true; // запомнить строку в виде свойства объекта
  }
  return Object.keys(objectTemp);
}
