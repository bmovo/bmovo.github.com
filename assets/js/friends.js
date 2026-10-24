(function () {
  "use strict";

  var root = document.querySelector("[data-friends]");
  if (!root) return;

  var stage = root.querySelector("[data-friends-stage]");
  var nodes = Array.from(root.querySelectorAll(".friends__node"));
  var filters = Array.from(root.querySelectorAll("[data-friend-filter]"));
  var motionButton = root.querySelector(".friends__motion");
  var count = root.querySelector(".friends__count");
  var motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  var activeCategory = "";
  var paused = false;
  var hovered = null;
  var focused = null;
  var visible = true;
  var width = 0;
  var height = 0;
  var size = 110;
  var padding = 24;
  var states = [];
  var frame = null;
  var lastTime = null;

  // A stable layout seed keeps resizing predictable without a rigid grid.
  function random(seed) {
    var value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function paint() {
    states.forEach(function (state) {
      state.element.style.transform = "translate3d(" + state.x.toFixed(2) + "px," + state.y.toFixed(2) + "px,0)";
      // Clamp the tooltip's center so it stays inside even a narrow stage.
      var halfDetail = state.detailWidth / 2;
      var detailCenter = clamp(state.x + size / 2, halfDetail + 10, width - halfDetail - 10);
      state.element.style.setProperty("--friend-detail-left", (detailCenter - state.x).toFixed(2) + "px");
      var placement = state.y + size + 39 + state.detailHeight > height ? "above" : "below";
      if (state.element.getAttribute("data-detail-placement") !== placement) {
        state.element.setAttribute("data-detail-placement", placement);
      }
    });
  }

  function constrain(state) {
    var maxX = Math.max(padding, width - padding - size);
    var maxY = Math.max(padding, height - padding - size - 30);
    if (state.x < padding) { state.x = padding; state.vx = Math.abs(state.vx); }
    if (state.x > maxX) { state.x = maxX; state.vx = -Math.abs(state.vx); }
    if (state.y < padding) { state.y = padding; state.vy = Math.abs(state.vy); }
    if (state.y > maxY) { state.y = maxY; state.vy = -Math.abs(state.vy); }
  }

  function separate() {
    var distance = size + 40;
    // Two relaxation passes stop labels and circles from bunching together.
    for (var pass = 0; pass < 2; pass++) {
      states.forEach(function (a, index) {
        for (var j = index + 1; j < states.length; j++) {
          var b = states[j];
          var dx = b.x - a.x;
          var dy = b.y - a.y;
          var length = Math.sqrt(dx * dx + dy * dy);
          if (length >= distance) continue;
          if (length < 0.01) { dx = 1; dy = 0; length = 1; }
          var nx = dx / length;
          var ny = dy / length;
          var overlap = (distance - length) / 2;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          var closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (closing < 0) {
            a.vx += closing * nx;
            a.vy += closing * ny;
            b.vx -= closing * nx;
            b.vy -= closing * ny;
          }
        }
      });
      states.forEach(constrain);
    }
  }

  function shouldMove() {
    return !paused && !motionPreference.matches && !hovered && !focused && !document.hidden && visible && states.length > 0;
  }

  function tick(time) {
    frame = null;
    if (!shouldMove()) { lastTime = null; return; }
    var dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    states.forEach(function (state) {
      state.vx = clamp(state.vx + Math.sin(time / 4100 + state.phase) * dt * 0.8, -12, 12);
      state.vy = clamp(state.vy + Math.cos(time / 4700 + state.phase) * dt * 0.8, -10, 10);
      state.x += state.vx * dt;
      state.y += state.vy * dt;
      constrain(state);
    });
    separate();
    paint();
    frame = window.requestAnimationFrame(tick);
  }

  function syncMotion() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    motionButton.disabled = motionPreference.matches;
    motionButton.textContent = motionPreference.matches ? "已减少动态效果" : paused ? "继续漂浮" : "暂停漂浮";
    motionButton.setAttribute("aria-pressed", String(paused || motionPreference.matches));
    if (shouldMove()) frame = window.requestAnimationFrame(tick);
  }

  function layout() {
    var nextWidth = stage.clientWidth;
    if (!nextWidth) return;
    width = nextWidth;
    size = width < 520 ? 84 : width < 900 ? 96 : 110;
    padding = width < 520 ? 18 : 28;
    root.style.setProperty("--friend-size", size + "px");
    var active = nodes.filter(function (node) { return !node.hidden; });
    var columns = Math.max(1, Math.floor((width - padding * 2 + 40) / (size + 60)));
    var rows = Math.max(1, Math.ceil(active.length / columns));
    height = Math.max(width < 520 ? 480 : 500, rows * (size + 80) + padding * 2);
    stage.style.height = height + "px";
    stage.classList.add("is-floating");
    var cellWidth = (width - padding * 2) / columns;
    var cellHeight = (height - padding * 2) / rows;
    var slots = active.map(function (_node, index) { return index; });
    for (var i = slots.length - 1; i > 0; i--) {
      var pick = Math.floor(random(i + active.length) * (i + 1));
      var saved = slots[i]; slots[i] = slots[pick]; slots[pick] = saved;
    }
    states = active.map(function (node, index) {
      var slot = slots[index];
      var column = slot % columns;
      var row = Math.floor(slot / columns);
      var state = {
        element: node,
        detailWidth: node.querySelector(".friends__detail").offsetWidth,
        detailHeight: node.querySelector(".friends__detail").offsetHeight,
        x: padding + column * cellWidth + (cellWidth - size) / 2 + (random(index + 3) - 0.5) * 20,
        y: padding + row * cellHeight + (cellHeight - size - 30) / 2 + (random(index + 41) - 0.5) * 22,
        vx: (random(index + 81) < 0.5 ? -1 : 1) * (5 + random(index + 91) * 5),
        vy: (random(index + 101) < 0.5 ? -1 : 1) * (4 + random(index + 111) * 4),
        phase: random(index + 121) * Math.PI * 2
      };
      constrain(state);
      return state;
    });
    separate();
    paint();
    syncMotion();
  }

  filters.forEach(function (button) {
    button.addEventListener("click", function () {
      activeCategory = button.getAttribute("data-friend-filter");
      filters.forEach(function (filter) {
        filter.setAttribute("aria-pressed", String(filter === button));
      });
      nodes.forEach(function (node) {
        node.hidden = Boolean(activeCategory && node.getAttribute("data-friend-category") !== activeCategory);
        node.classList.remove("is-detail-dismissed");
      });
      hovered = null;
      focused = null;
      var total = nodes.filter(function (node) { return !node.hidden; }).length;
      count.textContent = (activeCategory || "全部") + " · " + total + " 个站点";
      layout();
    });
  });

  nodes.forEach(function (node) {
    node.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "touch") return;
      node.classList.remove("is-detail-dismissed");
      hovered = node;
      syncMotion();
    });
    node.addEventListener("pointerleave", function () {
      node.classList.remove("is-detail-dismissed");
      if (hovered === node) hovered = null;
      syncMotion();
    });
    node.addEventListener("focusin", function () {
      node.classList.remove("is-detail-dismissed");
      focused = node;
      syncMotion();
    });
    node.addEventListener("focusout", function (event) {
      if (node.contains(event.relatedTarget)) return;
      node.classList.remove("is-detail-dismissed");
      if (focused === node) focused = null;
      syncMotion();
    });
    var image = node.querySelector("img");
    function fallback() {
      image.hidden = true;
      node.querySelector(".friends__initial").hidden = false;
    }
    image.addEventListener("error", fallback);
    if (image.complete && image.naturalWidth === 0) fallback();
  });

  root.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && (focused || hovered)) {
      [focused, hovered].forEach(function (node) {
        if (node) node.classList.add("is-detail-dismissed");
      });
    }
  });
  motionButton.addEventListener("click", function () {
    paused = !paused;
    syncMotion();
  });
  motionPreference.addEventListener("change", function () {
    syncMotion();
  });
  document.addEventListener("visibilitychange", syncMotion);
  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      if (stage.clientWidth !== width) layout();
    }).observe(stage);
  } else {
    window.addEventListener("resize", layout);
  }
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      syncMotion();
    }).observe(stage);
  }
  window.addEventListener("pagehide", function () {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
  });
  window.addEventListener("pageshow", syncMotion);
  root.querySelector(".friends__toolbar").hidden = false;
  layout();
})();
