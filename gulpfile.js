

const del = require('del');
const gulp = require('gulp');
const ts = require('gulp-typescript');
const merge = require('merge-stream');


gulp.task('build', () => {
    const tsProject = ts.createProject('tsconfig.json');
    const tsResult = gulp.src('./src/**/*.ts').pipe(tsProject());

    return del('dist')
        .then(() => merge(tsResult.dts, tsResult.js).pipe(gulp.dest('dist')));
});
