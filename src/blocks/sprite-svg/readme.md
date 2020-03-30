# svg спрайт

Из файлов папки `sprite-svg/svg/` в папку `sprite-svg/img/` будет сгенерирован файл спрайта `sprite.svg`, который далее будет скопирован в папку сборки. Стилевой файл блока не используется. SVG-файлы будут оптимизированы перед сборкой в спрайт. Сам спрайт имеет вид:

```html
<svg xmlns="http://www.w3.org/2000/svg">
    <symbol id="icon-boo" viewBox="0 0 30 30"><path d="..."/></symbol>
    <symbol id="icon-bs" viewBox="0 0 28 28"><path d="..."/></symbol>
   ...
</svg>
```

Для вставки на страницу используйте конструкции `svg > use` со ссылками на `id` символа:

```pug
svg(width="32", height="32")
    use(xlink:href="img/sprite.svg#icon-boo")
```

При использовании блока в проекте в сборку берётся <a href="https://www.npmjs.com/package/svg4everybody">svg4everybody</a>
