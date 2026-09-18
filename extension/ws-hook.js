(function () {
  "use strict";
  const Orig = window.WebSocket;
  if (!Orig || Orig.__cwaDaWrapped) return;

  function Wrapped(url, protocols) {
    const ws =
      protocols === undefined ? new Orig(url) : new Orig(url, protocols);
    ws.addEventListener("message", function (ev) {
      const data = ev.data;
      if (typeof data !== "string") return;
      if (
        /зацепк|подтверд|личность|детектив|Задание получено|успешно раскрыть/i.test(
          data
        )
      ) {
        window.dispatchEvent(new CustomEvent("cwa-da-refresh"));
      }
    });
    return ws;
  }

  Wrapped.prototype = Orig.prototype;
  Wrapped.CONNECTING = Orig.CONNECTING;
  Wrapped.OPEN = Orig.OPEN;
  Wrapped.CLOSING = Orig.CLOSING;
  Wrapped.CLOSED = Orig.CLOSED;
  Wrapped.__cwaDaWrapped = true;
  window.WebSocket = Wrapped;
})();
