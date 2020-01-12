'use strict';

const gulp = require('gulp');
const del = require('del'); //удаление файлов
const sass = require('gulp-sass');  //компиляция scss
const sourcemaps = require('gulp-sourcemaps');  //карты кода
const postcss = require('gulp-postcss');  //преобразование и оптимизация css
const cssnano = require('cssnano'); //минификация css
const rename = require('gulp-rename'); //переименовывание файлов


gulp.task('css', () => {
  return gulp.src('src/sass/style.scss')
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(postcss([
      cssnano(),
    ]))
    .pipe(rename('style.min.css'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('build/css'));
});

gulp.task('clean:build', () => del('build'));
