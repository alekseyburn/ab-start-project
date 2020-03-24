# svg спрайт

Из файлов папки `sprite-svg/svg/` в папку `sprite-svg/img/` будет сгенерирован файл спрайта `sprite-svg.svg`, который далее будет скопирован в папку сборки. Стилевой файл блока не используется. SVG-файлы будут оптимизированы перед сборкой в спрайт. Сам спрайт имеет вид:

```html
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
    <symbol id="icon-boo" viewBox="0 0 30 30"><path d="..."/></symbol>
    <symbol id="icon-bs" viewBox="0 0 28 28"><path d="..."/></symbol>
   ...
</svg>
```

Для вставки на страницу используйте конструкции `svg > use` со ссылками на `id` символа:

```pug
svg(width="32", height="32")
    use(xlink:href="img/sprite-svg.svg#icon-boo")
```

Чтобы использовать ссылки на внешние svg-файлы со спрайтами, используйте <a href="https://www.npmjs.com/package/svg4everybody">svg4everybody</a> (включен в сборку по умолчанию).
