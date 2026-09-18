# CatWar: досье агентства в игровой

Досье искомого кота поверх игровой страницы `/cw3` на **catwar.su** и **catwar.net**.

На Android обычный Chrome **не умеет ставить расширения**, а Tampermonkey там часто отключён. Для телефона ставьте **браузерное расширение** (Firefox Android, Kiwi, Lemur и т.п.). На компьютере по-прежнему можно юзерскрипт.

## Скачать

- [detective-agency-overlay.zip](https://cw-mod.github.io/detectiveagency/detective-agency-overlay.zip) — расширение (Chrome / Edge / Kiwi / Firefox). Тот же архив для Firefox: [detective-agency-overlay.xpi](https://cw-mod.github.io/detectiveagency/detective-agency-overlay.xpi).
- [detective-agency-overlay.user.js](https://cw-mod.github.io/detectiveagency/detective-agency-overlay.user.js) — юзерскрипт для Tampermonkey.
- Страница мода: https://cw-mod.github.io/detectiveagency/

Исходники расширения: папка [`extension/`](extension/).

## Расширение на Android

**Обычный Chrome на Android расширения не ставит.** Нужен Firefox или Chromium-форк.

### Firefox для Android

Постоянная установка «из файла» принимает только **подписанный** Mozilla XPI. Наш zip/xpi **не подписан**, поэтому на релизе Firefox Android он, скорее всего, не установится. Рабочие варианты:

1. **Временная загрузка через компьютер** (пропадает после перезапуска Firefox на телефоне):
   - на телефоне: меню → Настройки → включите «Удалённая отладка по USB»;
   - подключите телефон к компьютеру (`adb devices` должен видеть устройство);
   - на компьютере в Firefox откройте `about:debugging` → «Этот Firefox» / USB-устройство → **Load Temporary Add-on** и укажите `manifest.json` из распакованного zip (или `.xpi`).
2. **Firefox Nightly / Beta** (Android 10+): меню → Настройки → «О Firefox Nightly» → пять раз нажмите на логотип, пока не включится секретное меню. В Настройках появится **«Установить дополнение из файла»**. Выберите `.xpi`. Для неподписанного файла Firefox покажет ошибку подписи — тогда используйте шаг 1.
3. Когда расширение появится на [addons.mozilla.org](https://addons.mozilla.org/), его можно будет ставить как обычное дополнение.

### Kiwi, Lemur и другие Chromium с расширениями

1. Скачайте [detective-agency-overlay.zip](https://cw-mod.github.io/detectiveagency/detective-agency-overlay.zip) и распакуйте.
2. Откройте `chrome://extensions` (или «Расширения» в меню).
3. Включите **режим разработчика**.
4. **Загрузить распакованное** и укажите папку, где лежит `manifest.json`. Некоторые сборки Kiwi ставят zip напрямую.

После установки откройте `https://catwar.su/cw3` или `https://catwar.net/cw3` и разрешите доступ к сайту, если браузер спросит.

## Расширение на компьютере

- **Chrome / Edge:** `chrome://extensions` → режим разработчика → «Загрузить распакованное расширение» → папка `extension/` (или распакованный zip).
- **Firefox:** `about:debugging#/runtime/this-firefox` → «Загрузить временное дополнение» → `extension/manifest.json`. Для постоянной установки нужен подписанный XPI с AMO.

Не включайте расширение и юзерскрипт одновременно: панель досье появится только один раз (кто успел первым).

## Юзерскрипт (Tampermonkey)

1. Установите [Tampermonkey](https://www.tampermonkey.net/).
2. Откройте [detective-agency-overlay.user.js](https://cw-mod.github.io/detectiveagency/detective-agency-overlay.user.js) и подтвердите установку.
3. Зайдите на `https://catwar.su/cw3` или `https://catwar.net/cw3`.

Скрипт обновляется сам: Tampermonkey проверяет `@updateURL` ([detective-agency-overlay.meta.js](https://cw-mod.github.io/detectiveagency/detective-agency-overlay.meta.js)) и качает новую версию с `@downloadURL`.

## Что делает мод

- **Досье** — сворачиваемая панель с досье искомого кота поверх поля cw3.
- **Окрас** — отдельный оверлей окраса искомого кота на поле (можно двигать, масштабировать, скрывать).
- **Начать поиски** — кнопка старта поиска, когда на агентстве ещё нет досье.
