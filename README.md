# Стартовый проект с gulp ![Test Status](https://travis-ci.com/alekseyburn/ab-start-project.svg?branch=master) [![devDependencies Status](https://david-dm.org/alekseyburn/ab-start-project/dev-status.svg)](https://david-dm.org/alekseyburn/ab-start-project?type=dev) [![dependencies Status](https://david-dm.org/alekseyburn/ab-start-project/status.svg)](https://david-dm.org/alekseyburn/ab-start-project)

<table>
  <thead>
    <tr>
      <th>Команда</th>
      <th>Результат</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td width="22%"><code>npm i</code></td>
      <td>Установить зависимости</td>
    </tr>
    <tr>
      <td><code>npm start</code></td>
      <td>Запустить сборку, сервер и слежение за файлами</td>
    </tr>
    <tr>
      <td><code>npm start ЗАДАЧА</code></td>
    </tr>
    <tr>
      <td><code>set folder=src/img npm start img:opt</code></td>
      <td>Оптимизация изображений из папки <code>./src/img</code> (или любой другой)</td>
    </tr>
    <tr>
      <td><code>npm run build</code></td>
      <td>Сборка проекта без карт кода (сжатый вид, как результат работы)</td>
    </tr>
    <tr>
      <td><code>npm run deploy</code></td>
      <td>Сборка проекта без карт кода и отправка содержимого папки сборки на github-pages</td>
    </tr>
    <tr>
      <td><code>npm run test:style</code></td>
      <td>Проверка стилевой составляющей проекта <a href="https://stylelint.io/">stylelint</a></td>
    </tr>
    <tr>
      <td><code>npm start test:pug</code></td>
      <td>Проверка pug-файлов проекта <a href="https://github.com/nicothin/gulp-pug-lint">форкнутым gulp-pug-lint</a></td>
    </tr>
  </tbody>
</table>      

Если при вызове `npm start` ничего не происходит, смотрите `./projectConfig.json`, он содержит синтаксическую ошибку. Проверить можно [линтером](http://jsonlint.com/)

- Именование классов по БЭМ, разметка в [pug](https://pugjs.org/) и стилизация [Sass](http://sass-lang.com/).
- Каждый БЭМ-блок в своей папке внутри `./src/blocks/`.
- Список использованных в проекте БЭМ-блоков и доп. файлов указан в `./projectConfig.json`.
- Диспетчер подключения стилей `./src/scss/style.scss` генерируется автоматически при старте любой gulp-задачи (на основе данных из `./projectConfig.json`).
- Список pug-примесей `./src/pug/mixins.pug` генерируется автоматически при старте любой gulp-задачи (на основе данных из `./projectConfig.json`).
- Перед созданием коммита запускается проверка стилевых файлов, входящих в коммит и всех pug-файлов. При наличии ошибок коммит не происходит (ошибки будут выведены в терминал).
- Есть механизм быстрого создания нового блока: `node createBlock.js new-block` (создаёт файлы, папки, прописывает блок в `./projectConfig.json`).

## Разметка

Используется [pug](https://pugjs.org/api/getting-started.html). HTML никак не обрабатывается.

По умолчанию используются [наследование шаблонов](https://pugjs.org/language/inheritance.html) — все страницы (см. `./src/index.pug`) являются расширениями шаблонов, в страницах описывается только содержимое «шапки», «подвала» и контентной области посредством [блоков](https://pugjs.org/language/inheritance.html#block-append-prepend).


## Стили

Файл-диспетчер подключений (`./src/scss/style.scss`) формируется автоматически на основании указанных в `./projectConfig.json` блоков и доп. файлов. Писать в `./src/scss/style.scss` что-либо руками бессмысленно: при старте автоматизации файл будет перезаписан.


## Блоки

Каждый блок лежит в `./src/blocks/` в своей папке. Каждый блок — как минимум, папка и одноимённые scss- и pug-файл.

Возможное содержимое блока:

```bash
block-name/               # Папка блока
  img/                    # Изображения, используемые блоком
  demo-block.scss         # Стилевой файл блока
  demo-block.js           # js-файл блока
  demo-block.pug          # Разметка (pug-примесь, отдающая разметку блока, описание API примеси)
  readme.md               # Какое-то пояснение
```


## Подключение блоков

Список используемых блоков и доп. файлов указан в `./projectConfig.json`. Список файлов и папок, взятых в обработку можно увидеть в терминале, если раскомментировать строку `console.log(lists);` в `gulpfile.js`.

### `blocks`

Объект с блоками, используемыми на проекте. Каждый блок — отдельная папка с файлами, по умолчанию лежат в `./src/blocks/`.
Каждое подключение блока — массив, который можно оставить пустым или указать файлы элементов или модификаторов, если они написаны в виде отдельных файлов. В обоих случаях в обработку будут взяты одноименные стилевые файлы, pug-файл, js-файлы и картинки из папки `img/` блока.
Пример, подключающий 3 блока:

```
"blocks": {
  "page": [],
  "page-header": [],
  "page-footer": []
}
```

### `addCssBefore`

Массив с дополнительными стилевыми файлами, которые будут взяты в компиляцию ПЕРЕД стилевыми файлами блоков.
Пример, берущий в компиляцию переменные, примеси, функции и один дополнительный файл из папки зависимостей (он будет преобразован в css-импорт, который при постпроцессинге ([postcss-import](https://github.com/postcss/postcss-import)) будет заменен на содержимое файла).

```
"addCssBefore": [
  "./src/scss/variables.scss",
  "./src/scss/mixins.scss",
  "./src/scss/functions.scss",
  "../../node_modules/owl.carousel/dist/assets/owl.carousel.css"
],
```

### `addCssAfter`

Массив с дополнительными стилевыми файлами, которые будут взяты в компиляцию ПОСЛЕ стилевых файлов блоков.

```
"addCssAfter": [
  "./src/scss/print.scss"
],
```

### `addJsBefore`

Массив js-файлов, которые будут взяты в обработку (конкатенация/сжатие) ПЕРЕД js-файлами блоков.
Пример, добавляющий в список обрабатываемых js-файлов несколько зависимостей:

```
"addJsBefore": [
  "./node_modules/jquery/dist/jquery.min.js",
  "./node_modules/jquery-migrate/dist/jquery-migrate.min.js",
  "./node_modules/nouislider/distribute/nouislider.js"
],
```

### `addJsAfter`

Массив js-файлов, которые будут взяты в обработку (конкатенация/сжатие) ПОСЛЕ js-файлов блоков.
Пример, добавляющий в конец списка обрабатываемых js-файлов глобальный скрипт.

```
"addJsAfter": [
  "./src/js/global-script.js"
],
```

### `addImages`

Массив дополнительных изображений, добавляемый ПЕРЕД массивом изображений из блоков (внимание: при совпадении имен файлов, файлы из блоков имеют более высокий приоритет и затрут файлы из этого массива).

```
"addImages": [
  "./src/img/*.{jpg,jpeg,gif,png,svg,ico}"
],
```

### `copiedCss`

Массив css-файлов, которые копируются в папку сборки, подпапку `css/`

### `copiedJs`

Массив js-файлов, которые копируются в папку сборки, подпапку `js/`


## Пример секции в `./projectConfig.json`

```json
{
  "blocks": {
    "page-header": [],
    "page-footer": [
      "__extra-element",
      "--extra-modifier"
    ]
  },
  "addCssBefore": [
    "./src/scss/variables.scss"
  ],
  "addCssAfter": [
    "./src/scss/print.scss"
  ],
  "addJsBefore": [
    "./node_modules/jquery/dist/jquery.min.js",
    "./node_modules/jquery-migrate/dist/jquery-migrate.min.js"
  ],
  "addJsAfter": [
    "./src/js/global-script.js"
  ],
  "addImages": [
    "./src/img/*.{jpg,jpeg,gif,png,svg}"
  ],
  "copiedCss": [],
  "copiedJs": [],
  "dirs": {
    "srcPath": "./src/",
    "buildPath": "./build/",
    "blocksDirName": "blocks"
  }
}
```

В результате в обработку будут взяты (в указанной последовательности):

```bash
css:
 [ './src/scss/variables.scss',
   './src/blocks/page-header/page-header.scss',
   './src/blocks/page-footer/page-footer.scss',
   './src/blocks/page-footer/page-footer__extra-element.scss',
   './src/blocks/page-footer/page-footer--extra-modifier.scss',
   './src/scss/print.scss' ],
js:
 [ './node_modules/jquery/dist/jquery.min.js',
      './node_modules/jquery-migrate/dist/jquery-migrate.min.js',
   './src/blocks/page-footer/page-footer.js',
   './src/blocks/page-footer/page-footer__extra-element.js',
   './src/blocks/page-footer/page-footer--extra-modifier.js',
   './src/js/global-script.js' ],
img:
 [ './src/img/*.{jpg,jpeg,gif,png,svg}',
      './src/blocks/page-header/img/*.{jpg,jpeg,gif,png,svg}',
      './src/blocks/page-footer/img/*.{jpg,jpeg,gif,png,svg}' ]
```


### Удобное создание нового блока

Предусмотрена команда для быстрого создания файловой структуры нового блока.

```bash
# формат: node createBlock.js [имя блока] [доп. расширения через пробел]
node createBlock.js block-1 # создаст папку блока, block-1.html, block-1.scss и подпапку img/ для этого блока
node createBlock.js block-2 js pug # создаст папку блока, block-2.html, block-2.scss, block-2.js, block-2.pug и подпапку img/ для этого блока
```

Если блок уже существует, файлы не будут затёрты, но создадутся те файлы, которые ещё не существуют.


## Назначение папок

```bash
build/              # Сюда собирается проект, здесь работает сервер автообновлений.
src/                # Исходные файлы
  blocks/           # - блоки проекта
    css/            # - можно положить добавочные css-файлы (нужно подключить в copiedCss, иначе игнорируются)
    favicon/        # - файлы для фавиконок
    fonts/          # - можно положить шрифты проекта (будут автоматически скопированы в папку сборки)
    img/            # - можно положить добавочные картинки (нужно подключить в addImages, иначе игнорируются)
    js/             # - можно положить добавочные js-файлы (нужно подключить в addJsBefore или addJsAfter, иначе игнорируются)
    pug/            # - примеси, шаблоны pug
    sass/           # - стили (всё, кроме style.scss нужно подключить в addCssBefore или addCssAfter, иначе оно будет проигнорировано)
  index.pug         # - главная страница проекта
```
