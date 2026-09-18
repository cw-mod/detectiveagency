# CatWar: досье агентства в игровой

Досье искомого кота поверх игровой страницы `/cw3` на **catwar.su** и **catwar.net**.

## Скачать

- [detective-agency-overlay.user.js](https://cw-mod.github.io/detectiveagency/detective-agency-overlay.user.js) — юзерскрипт для Tampermonkey.
- Страница мода: https://cw-mod.github.io/detectiveagency/

## Юзерскрипт (Tampermonkey)

1. Установите [Tampermonkey](https://www.tampermonkey.net/).
2. Откройте [detective-agency-overlay.user.js](https://cw-mod.github.io/detectiveagency/detective-agency-overlay.user.js) и подтвердите установку.
3. Зайдите на `https://catwar.su/cw3` или `https://catwar.net/cw3`.

Скрипт обновляется сам: Tampermonkey проверяет `@updateURL` ([detective-agency-overlay.meta.js](https://cw-mod.github.io/detectiveagency/detective-agency-overlay.meta.js)) и качает новую версию с `@downloadURL`.

## Что делает мод

- **Досье** — сворачиваемая панель с досье искомого кота поверх поля cw3.
- **Окрас** — отдельный оверлей окраса искомого кота на поле (можно двигать, масштабировать, скрывать).
- **Начать поиски** — кнопка старта поиска, когда на агентстве ещё нет досье.
