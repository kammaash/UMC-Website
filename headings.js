// headings.js — per-word proximity color tint for display headings.
// Assigns a random color from PALETTE when the pointer enters an 80px radius;
// clears on leave. Does NOT apply to the hero word-cycler carousel.
(function () {
  var SEL = ".stage-head h2, .sec-head h2, .trust .lead .big, .download h2, .dive-info h3";
  var RADIUS = 80;
  var PALETTE = ["#18453B", "#990000"];

  function wrapEl(el) {
    var kids = Array.from(el.childNodes);
    for (var i = 0; i < kids.length; i++) {
      var node = kids[i];
      if (node.nodeType === 3) {
        var text = node.textContent;
        if (!text) continue;
        var frag = document.createDocumentFragment();
        var parts = text.split(/(\s+)/);
        for (var j = 0; j < parts.length; j++) {
          var part = parts[j];
          if (part === "") continue;
          var span = document.createElement("span");
          if (/^\s+$/.test(part)) { span.className = "ht-space"; span.textContent = part; }
          else { span.className = "ht-word"; span.textContent = part; }
          frag.appendChild(span);
        }
        el.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        if (node.tagName === "BR") continue;
        if (node.classList && (node.classList.contains("ht-word") || node.classList.contains("ht-space"))) continue;
        wrapEl(node);
      }
    }
  }

  function wrapHeading(h) {
    if (!h || h.dataset.ht) return;
    h.dataset.ht = "1";
    try { wrapEl(h); } catch (e) { /* leave untouched on failure */ }
  }

  function scan() {
    document.querySelectorAll(SEL).forEach(wrapHeading);
  }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  var lastX = -9999, lastY = -9999, frame = 0;
  function apply() {
    frame = 0;
    var r2 = RADIUS * RADIUS;
    var words = document.querySelectorAll(".ht-word");
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var rect = w.getBoundingClientRect();
      if (!rect.width) continue;
      var px = Math.max(rect.left, Math.min(lastX, rect.right));
      var py = Math.max(rect.top, Math.min(lastY, rect.bottom));
      var dx = lastX - px, dy = lastY - py;
      if (dx * dx + dy * dy <= r2) {
        if (!w.style.color) w.style.color = PALETTE[(Math.random() * PALETTE.length) | 0];
      } else if (w.style.color) {
        w.style.color = "";
      }
    }
  }

  if (fine && !reduce) {
    window.addEventListener("pointermove", function (e) {
      lastX = e.clientX; lastY = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    }, { passive: true });
  }

  var scanT = 0;
  function schedule() { if (scanT) return; scanT = setTimeout(function () { scanT = 0; scan(); }, 80); }
  schedule();
  requestAnimationFrame(schedule);
  setTimeout(schedule, 500);
  if (document.body) {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }
})();
