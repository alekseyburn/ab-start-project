Из файлов `sprite-svg/svg/` генерируется файл спрайта `sprite-svg/img/sprite.svg`.

**Блок не имеет классов, упоминаемых в разметке. Чтобы взять его в сборку, упомяните `sprite-svg` в `config.js#alwaysAddBlocks`.**


Для вставки на страницу используйте `svg > use` со ссылками на `id` символа:

```pug
svg(width="32", height="32")
    use(xlink:href="img/sprite.svg#icon-boo")
```

При использовании блока в проекте в сборку берётся <a href="https://www.npmjs.com/package/svg4everybody">svg4everybody</a>
