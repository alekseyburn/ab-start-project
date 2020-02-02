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
// const browserslist = require('browserslist'); //единый конфиг autoprefixer, babel и stylelint
// const path = require('path');

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'dev';

gulp.task('copy:css', () => {
  return gulp.src('src/css/*.css', {since: gulp.lastRun('copy:css')})
    .pipe(postcss([
      cssnano({
        discardUnused: false  //не удалять неиспользуемые классы
      })
    ]))
    .pipe(rename((path) => {
      path.extname = '.min.css'
    }))
    .pipe(gulp.dest('build/css'));
});

gulp.task('css', () => {
  return gulp.src('src/sass/style.scss')
    .pipe(gulpIf(isDev,sourcemaps.init()))
    .pipe(sass())
    .pipe(postcss([
      autoprefixer(),
      cssnano(),
    ]))
    .pipe(rename('style.min.css'))
    .pipe(gulpIf(isDev, sourcemaps.write('.')))
    .pipe(gulp.dest('build/css'));
});

gulp.task('img', () => {
  return gulp.src('src/img/**/*.{jpg,jpeg,png,svg}', {since: gulp.lastRun('img')}) //только для изменившихся с последнего запуска
    .pipe(newer('build/img')) //оставить в потоке только изменившиеся файлы
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
    .pipe(gulp.dest('build/img'));
});

gulp.task('sprite:svg', () => {
  return gulp.src('src/img/{icon,logo}-*.svg')
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
    .pipe(gulp.dest('build/img'))
});

gulp.task('watch', () => {
  gulp.watch('src/sass/**/*.scss', gulp.series('css'));
  gulp.watch('src/css/*.css', gulp.series('copy:css'));
  gulp.watch('src/img/*.{jpg,jpeg,gif,png,svg}', gulp.series('img'));
});

gulp.task('clean', () => del('build'));
gulp.task('build', gulp.series('clean', gulp.parallel('css', 'copy:css', 'img', 'sprite:svg')));
gulp.task('serve', () => {
  gulp.series('build');
  browserSync.init({
    server: 'build',
    notify: false,
    open: true,
    cors: true,
    ui: false,
  });

  browserSync.watch('build/**/*.*').on('change', browserSync.reload);
});

gulp.task('default',
  gulp.series('build', gulp.parallel('watch', 'serve'))
);
