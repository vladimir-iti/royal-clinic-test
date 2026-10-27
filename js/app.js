/* Весь клиентский код посадочных «Роялъ Клиника». Без библиотек.
   Цели Метрики: CALL_CLICK, MESSENGER_CLICK, ROUTE_CLICK, REVIEWS_CLICK,
   LEAD_OPEN (открыто окно записи), QUIZ_START, QUIZ_DONE, LEAD (заявка отправлена).
   Плюс посещение /royal-clinic-test/spasibo/ — цель «посещение страницы» в Метрике. */

/* --- безопасное хранилище: в приватном режиме доступ может бросать исключение --- */
var store = {
  get: function (k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (_) { return null; } },
  set: function (k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (_) {} },
};

/* --- цели --- */
function goal(name, params) {
  var id = window.RC_METRIKA;
  if (id && typeof window.ym === 'function') window.ym(id, 'reachGoal', name, params);
  else if (location.hostname === 'localhost') console.info('[цель]', name, params || '');
}
(function () {
  var MAP = { phone: 'CALL_CLICK', messenger: 'MESSENGER_CLICK', route: 'ROUTE_CLICK', reviews: 'REVIEWS_CLICK' };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-goal]');
    if (t && MAP[t.dataset.goal]) goal(MAP[t.dataset.goal]);
  });
})();

/* --- метки рекламы: запоминаем первое касание на время визита --- */
var utm = (function () {
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid'];
  var saved = {};
  try { saved = JSON.parse(store.get('rc_utm', true) || '{}'); } catch (_) {}
  var q = new URLSearchParams(location.search);
  var fresh = {};
  KEYS.forEach(function (k) { if (q.get(k)) fresh[k] = q.get(k).slice(0, 200); });
  if (Object.keys(fresh).length && !Object.keys(saved).length) {
    fresh.landing = location.pathname;
    if (document.referrer) fresh.referrer = document.referrer.slice(0, 200);
    store.set('rc_utm', JSON.stringify(fresh), true);
    saved = fresh;
  }
  return saved;
})();

/* --- подмена заголовка по ?h=<ключ> (только из списка услуги) --- */
(function () {
  var el = document.querySelector('[data-h1][data-alt]');
  var key = new URLSearchParams(location.search).get('h');
  if (!el || !key) return;
  try {
    var alt = JSON.parse(el.dataset.alt);
    if (Object.prototype.hasOwnProperty.call(alt, key)) el.textContent = alt[key];
  } catch (_) {}
})();

/* --- шапка: плотная после первого экрана; меню «Услуги» --- */
(function () {
  var hd = document.querySelector('[data-header]');
  if (!hd) return;
  // Плотная шапка после первых 60 px; верхняя полоса уходит при прокрутке вниз
  // и возвращается при прокрутке вверх (порог UP — чтобы не мигала от дрожания)
  var lastY = 0, turnY = 0, UP = 40;
  function on() {
    var y = window.scrollY;
    hd.classList.toggle('is-solid', y > 60);
    if (y <= 60) hd.classList.remove('is-strip-off');
    else if (y > lastY) { hd.classList.add('is-strip-off'); turnY = y; }
    else if (turnY - y > UP) hd.classList.remove('is-strip-off');
    lastY = y;
  }
  window.addEventListener('scroll', on, { passive: true });
  // Первое чтение scrollY — после первой отрисовки: при запуске оно заставляло браузер
  // досрочно считать раскладку всей страницы (Lighthouse: forced reflow, ~130 мс)
  requestAnimationFrame(function () { lastY = turnY = window.scrollY; on(); });

  // Подсветка текущего раздела в навигации шапки: активен пункт, чей раздел пересекает
  // середину экрана; если там блок не из меню («Кому подойдёт», «Сравнение»…) — ни один
  var links = hd.querySelectorAll('[data-spy]');
  var spy = [];
  links.forEach(function (a) { var t = document.querySelector(a.dataset.spy); if (t) spy.push({ a: a, t: t }); });
  if (spy.length) {
    var ticking = false;
    var mark = function () {
      ticking = false;
      var mid = window.innerHeight / 2, cur = null;
      spy.forEach(function (s) { var r = s.t.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) cur = s; });
      spy.forEach(function (s) { s.a.classList.toggle('is-active', s === cur); });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(mark); } }, { passive: true });
    requestAnimationFrame(mark);
  }
  var btn = hd.querySelector('[data-menu-toggle]');
  var menu = hd.querySelector('[data-menu]');
  if (!btn || !menu) return;
  function set(open) { btn.setAttribute('aria-expanded', String(open)); menu.hidden = !open; hd.classList.toggle('is-open', open); }
  btn.addEventListener('click', function () { set(menu.hidden); });
  document.addEventListener('click', function (e) { if (!menu.hidden && !hd.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
})();

/* --- листалка кейсов: стрелки прокручивают на одну карточку --- */
(function () {
  document.querySelectorAll('[data-slider]').forEach(function (track) {
    var box = track.parentElement;
    function go(dir) { track.scrollBy({ left: dir * track.clientWidth, behavior: 'smooth' }); }
    var prev = box.querySelector('[data-slide-prev]'), next = box.querySelector('[data-slide-next]');
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
  });
})();

/* --- липкая панель на телефоне: после первого экрана; прячется, пока
   открыта клавиатура (иначе закрывает поле ввода) --- */
(function () {
  var bar = document.querySelector('[data-stickybar]');
  if (!bar) return;
  var typing = false;
  function on() { bar.classList.toggle('is-in', window.scrollY > 480 && !typing); }
  window.addEventListener('scroll', on, { passive: true });
  document.addEventListener('focusin', function (e) {
    if (e.target.matches('input:not([type=checkbox]):not([type=radio]), textarea')) { typing = true; on(); }
  });
  document.addEventListener('focusout', function () { typing = false; setTimeout(on, 150); });
  on();
})();

/* --- срок предложения: последний день текущего месяца. Сайт статический,
   дата из сборки устарела бы — считаем в браузере --- */
(function () {
  var d = new Date(), last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  var txt = last.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  document.querySelectorAll('[data-offer-until]').forEach(function (el) { el.textContent = txt; });
})();

/* --- появление блоков --- */
(function () {
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -6% 0px' });
  items.forEach(function (el) { io.observe(el); });
})();

/* --- маска телефона: «+7 » стоит сразу, человек вводит 10 цифр --- */
(function () {
  var PREFIX = '+7 ';
  function digitsOf(v) {
    var s = String(v);
    var at = s.indexOf('+7');
    if (at >= 0) {
      // цифру могли ввести и перед «+7» — если курсор встал в начало поля
      var rest = (s.slice(0, at) + s.slice(at + 2)).replace(/\D/g, '');
      if (rest.length === 11 && /^[78]/.test(rest)) rest = rest.slice(1); // вставили номер целиком
      return '7' + rest;
    }
    var d = s.replace(/\D/g, '');
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d && d[0] !== '7') d = '7' + d;
    return d;
  }
  function format(d) {
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 5) out += ') ' + d.slice(4, 7);
    if (d.length >= 8) out += '-' + d.slice(7, 9);
    if (d.length >= 10) out += '-' + d.slice(9, 11);
    return out;
  }
  document.querySelectorAll('input[type="tel"]').forEach(function (input) {
    input.addEventListener('focus', function () {
      if (!input.value) input.value = PREFIX;
      setTimeout(function () { input.setSelectionRange(input.value.length, input.value.length); }, 0);
    });
    // клик ставит курсор туда, куда попала мышь, — не даём встать внутрь «+7 »
    input.addEventListener('click', function () {
      if (input.selectionStart < PREFIX.length) input.setSelectionRange(input.value.length, input.value.length);
    });
    input.addEventListener('blur', function () { if (input.value.replace(/\D/g, '').length <= 1) input.value = ''; });
    input.addEventListener('input', function () {
      var caret = input.selectionStart;
      var before = input.value.slice(0, caret).replace(/\D/g, '').length;
      var d = digitsOf(input.value);
      input.value = d.length <= 1 ? PREFIX : format(d);
      var seen = 0, pos = input.value.length;
      for (var i = 0; i < input.value.length; i++) {
        if (/\d/.test(input.value[i]) && ++seen === before) { pos = i + 1; break; }
      }
      if (before <= 1) pos = input.value.length;
      try { input.setSelectionRange(pos, pos); } catch (_) {}
    });
  });
})();

/* --- отправка заявки ---
   Заявку принимает forms.genobiz.ru: ключ сайта — data-site формы,
   приманка для ботов — website, время открытия страницы — form_ts.
   Пока data-live="false", заявка не уходит: сразу переход на /royal-clinic-test/spasibo/. */
(function () {
  var opened = Math.floor(Date.now() / 1000);

  function check(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.name === 'phone') return el.value.replace(/\D/g, '').length === 11;
    return true;
  }
  function mark(el) {
    var ok = check(el);
    var f = el.closest('.field');
    if (f) f.classList.toggle('is-bad', !ok);
    return ok;
  }

  document.querySelectorAll('form[data-lead]').forEach(function (form) {
    var must = form.querySelectorAll('[name="phone"],[name="consent"]');
    must.forEach(function (el) {
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () {
        var f = el.closest('.field');
        if (f && f.classList.contains('is-bad')) mark(el);
      });
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var bad = null;
      must.forEach(function (el) { if (!mark(el) && !bad) bad = el; });
      var err = form.querySelector('[data-error]');
      if (bad) { if (err) err.textContent = ''; bad.focus(); return; }

      var f = new FormData(form);
      var fields = {
        name: (f.get('name') || '').trim(),
        phone: f.get('phone'),
        'Услуга': f.get('service') || '',
        'Где на странице': f.get('source') || '',
        consent: 'да',
      };
      if (f.get('quiz')) fields['Ответы квиза'] = f.get('quiz');
      if (utm.utm_source || utm.yclid) {
        fields['Реклама'] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
          .map(function (k) { return utm[k] ? k.replace('utm_', '') + '=' + utm[k] : ''; }).filter(Boolean).join(', ');
        if (utm.yclid) fields.yclid = utm.yclid;
      }

      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Отправляем…'; }
      if (err) err.textContent = '';

      try {
        var number = '';
        if (form.dataset.live === 'true') {
          var res = await fetch(form.action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ site: form.dataset.site, page_url: location.href, website: f.get('lf_check') || '', form_ts: opened, fields: fields }),
          });
          var out = await res.json().catch(function () { return {}; });
          if (!res.ok || !out.ok) throw new Error(out.error || '');
          number = out.lead || out.number || '';
        } else if (location.hostname === 'localhost') {
          console.info('[заявка — тестовый режим, не отправлена] ' + JSON.stringify(fields));
        }
        goal('LEAD', { source: fields['Где на странице'] });
        store.set('rc_lead', '1', true);
        store.set('rc_lead_service', fields['Услуга'], true);
        location.href = '/royal-clinic-test/spasibo/' + (number ? '?n=' + encodeURIComponent(number) : '');
      } catch (x) {
        var msg = x && x.message && !/fetch|network/i.test(x.message) ? x.message + '. ' : '';
        if (err) err.textContent = msg + 'Не получилось отправить. Позвоните нам — запишем сразу.';
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
      }
    });
  });
})();

/* --- окно записи ---
   Кнопки с data-open-lead открывают окно (без JS — якорь #zapis).
   Само окно не всплывает: на телефоне такие окна — навязчивые интерстишиалы
   (Google), а окно при уходе дало 1,2% против 5,9% у кнопки (docs/research.md). */
(function () {
  var dlg = document.querySelector('[data-lead-modal]');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var srcInput = dlg.querySelector('input[name="source"]');

  function open(source) {
    if (dlg.open) return;
    if (srcInput) srcInput.value = source || 'Всплывающее окно';
    dlg.showModal();
    store.set('rc_popup', '1', true);
    goal('LEAD_OPEN', { source: source });
    setTimeout(function () { var t = dlg.querySelector('input[type="tel"]'); if (t) t.focus(); }, 50);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open-lead]');
    if (!t) return;
    e.preventDefault();
    open(t.dataset.source || t.textContent.trim());
  });
  dlg.querySelector('[data-close]').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); }); // клик по подложке

})();

/* --- квиз --- */
(function () {
  document.querySelectorAll('[data-quiz]').forEach(function (quiz) {
    var steps = quiz.querySelectorAll('[data-quiz-step]');
    var total = Number(quiz.dataset.total);
    var bar = quiz.querySelector('[data-quiz-progress]');
    var count = quiz.querySelector('[data-quiz-count]');
    var answers = quiz.querySelector('[data-quiz-answers]');
    var cur = 0, started = false;

    function show(i) {
      cur = i;
      steps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      bar.style.width = ((i + 1) / (total + 1)) * 100 + '%';
      count.textContent = i < total ? 'Вопрос ' + (i + 1) + ' из ' + total : 'Последний шаг';
    }
    function collect() {
      var parts = [];
      quiz.querySelectorAll('input[type="radio"]:checked').forEach(function (r) { parts.push(r.dataset.q + ' — ' + r.value); });
      answers.value = parts.join('; ');
    }
    quiz.addEventListener('change', function (e) {
      if (e.target.type !== 'radio') return;
      if (!started) { started = true; goal('QUIZ_START'); }
      collect();
      setTimeout(function () {
        show(cur + 1);
        if (cur === total) goal('QUIZ_DONE');
      }, 220);
    });
    quiz.addEventListener('click', function (e) {
      if (!e.target.closest('[data-quiz-back]')) return;
      // Шаг назад: на вопросе, куда вернулись, снимаем прошлый выбор — иначе не видно, что ответ можно сменить
      show(Math.max(0, cur - 1));
      steps[cur].querySelectorAll('input[type="radio"]:checked').forEach(function (r) { r.checked = false; });
      collect();
    });
    show(0);
  });
})();

/* --- уведомление о cookie --- */
(function () {
  var bar = document.querySelector('[data-cookie]');
  if (!bar || store.get('rc_cookie')) return;
  bar.hidden = false;
  bar.querySelector('[data-cookie-ok]').addEventListener('click', function () { store.set('rc_cookie', '1'); bar.hidden = true; });
})();

/* --- якоря и отложенная отрисовка секций ---
   Секции ниже первого экрана рисуются по мере прокрутки (content-visibility в base.css),
   и до этого браузер не знает их высоту — переход по якорю промахивался. Перед переходом
   выключаем отложенную отрисовку: класс ставится до того, как браузер считает цель. */
document.addEventListener('click', function (e) {
  var a = e.target.closest('a[href^="#"]');
  if (a && a.getAttribute('href').length > 1) document.documentElement.classList.add('cv-off');
}, true);

/* --- группы карточек: активная (сливовая) — первая (если задана); при наведении мыши — та, на которую
   мышь попала. Между карточками ничего не меняется (нет мерцания), уход из блока — снова первая */
if (window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('[data-hl]').forEach(function (g) {
    var items = [].slice.call(g.querySelectorAll('[data-hl-item]'));
    var first = g.querySelector('[data-hl-item].is-act'); // может не быть — тогда по умолчанию ни одной
    var set = function (el) { items.forEach(function (i) { i.classList.toggle('is-act', i === el); }); };
    g.addEventListener('mouseover', function (e) { var it = e.target.closest('[data-hl-item]'); if (it) set(it); });
    g.addEventListener('mouseleave', function () { set(first); });
  });
}

/* --- слайдер первого экрана главной: смена каждые 6 с, точки, пауза при наведении --- */
document.querySelectorAll('[data-hero-slides]').forEach(function (box) {
  var slides = box.querySelectorAll('[data-slide]');
  var dots = box.parentNode.querySelectorAll('[data-dot]');
  if (slides.length < 2) return;
  var cur = 0, timer;
  function show(n) {
    cur = (n + slides.length) % slides.length;
    slides.forEach(function (s, i) { s.classList.toggle('is-on', i === cur); if (i === cur) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true'); });
    dots.forEach(function (d, i) { d.classList.toggle('is-on', i === cur); });
  }
  function play() { clearInterval(timer); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(function () { show(cur + 1); }, 6000); }
  dots.forEach(function (d) { d.addEventListener('click', function () { show(+d.dataset.dot); play(); }); });
  box.parentNode.addEventListener('mouseenter', function () { clearInterval(timer); });
  box.parentNode.addEventListener('mouseleave', play);
  play();
});

/* --- скрытые впечатляющие фото (ui/PhotoVeil.astro): размытие + искорки как у спойлера в Telegram.
   Модель частиц — как в Telegram Android (SpoilerEffect.java): каждая летит по прямой в случайную
   сторону со скоростью 8–20 px/с, живёт 1–3 с, яркость постоянная (0.3 / 0.6 / 1), отжившая или
   вылетевшая за край сразу появляется в новом случайном месте; 30 кадров/с. Цвет — золото логотипа.
   Чтобы не грузить процессор: не больше MAX искорок на фото, данные в типизированных массивах,
   рисуем пачками (9 групп цвет × яркость) квадратиками fillRect — в размере ~1 px не отличить от кружка.
   Клик — открыть (искорки гаснут), следующий — скрыть. Рисуем только пока фото скрыто и видно;
   при prefers-reduced-motion — один неподвижный кадр --- */
document.querySelectorAll('[data-veil-btn]').forEach(function (b) {
  var box = b.closest('[data-veil]');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#e9cf9f', '#f6e3bf', '#d9b77f'];
  var ALPHAS = [0.3, 0.6, 1];
  var MAX = 2500, FRAME = 1000 / 30;
  var layers = [].map.call(box.querySelectorAll('figure'), function (fig) {
    var c = document.createElement('canvas');
    c.className = 'veil__dust';
    c.setAttribute('aria-hidden', 'true');
    fig.appendChild(c);
    return { c: c, ctx: c.getContext('2d'), n: 0, w: 0, h: 0 };
  });
  function spawn(l, i) {
    var a = Math.random() * 6.2832, v = 8 + Math.random() * 12;
    l.x[i] = Math.random() * l.w; l.y[i] = Math.random() * l.h;
    l.vx[i] = Math.cos(a) * v / 1000; l.vy[i] = Math.sin(a) * v / 1000; // px/мс
    l.life[i] = 1000 + Math.random() * 2000; l.age[i] = 0;
    l.g[i] = Math.floor(Math.random() * 9); // группа: цвет × яркость
  }
  function setup() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    layers.forEach(function (l) {
      l.w = l.c.clientWidth; l.h = l.c.clientHeight;
      l.c.width = l.w * dpr; l.c.height = l.h * dpr; l.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = l.n = Math.min(MAX, Math.round(l.w * l.h / 9));
      l.x = new Float32Array(n); l.y = new Float32Array(n); l.vx = new Float32Array(n); l.vy = new Float32Array(n);
      l.life = new Float32Array(n); l.age = new Float32Array(n); l.g = new Uint8Array(n);
      for (var i = 0; i < n; i++) { spawn(l, i); l.age[i] = Math.random() * l.life[i]; }
    });
  }
  function step(dt) {
    layers.forEach(function (l) {
      var ctx = l.ctx, n = l.n, i;
      for (i = 0; i < n; i++) {
        l.age[i] += dt; l.x[i] += l.vx[i] * dt; l.y[i] += l.vy[i] * dt;
        if (l.age[i] >= l.life[i] || l.x[i] < 0 || l.x[i] > l.w || l.y[i] < 0 || l.y[i] > l.h) spawn(l, i);
      }
      ctx.clearRect(0, 0, l.w, l.h);
      for (var g = 0; g < 9; g++) {
        var k = g % 3, s = k ? 1.2 : 1.4; // как в Telegram: тусклые чуть крупнее
        ctx.fillStyle = COLORS[(g / 3) | 0]; ctx.globalAlpha = ALPHAS[k];
        for (i = 0; i < n; i++) if (l.g[i] === g) ctx.fillRect(l.x[i], l.y[i], s, s);
      }
    });
  }
  var visible = false, raf = 0, last = 0, acc = 0;
  function loop(t) {
    var dt = last ? t - last : 0; last = t; acc += dt;
    if (!dt || acc >= FRAME) { step(Math.min(acc, 34)); acc = 0; } // 30 кадров/с, шаг не больше 34 мс
    raf = visible && !box.classList.contains('is-open') && !still ? requestAnimationFrame(loop) : (last = 0);
  }
  function kick() {
    // секция могла быть не отрисована (content-visibility) — тогда размеры появятся только сейчас
    if (!layers[0].w || layers[0].w !== layers[0].c.clientWidth) setup();
    if (!raf) raf = requestAnimationFrame(loop);
  }
  setup(); step(0);
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) kick(); }).observe(box);
  window.addEventListener('resize', function () { setup(); step(0); });
  b.addEventListener('click', function () {
    var open = box.classList.toggle('is-open');
    b.setAttribute('aria-pressed', open ? 'true' : 'false');
    b.setAttribute('aria-label', open ? 'Скрыть фото клинического случая' : 'Показать фото клинического случая');
    if (!open) kick();
  });
});

/* --- смена кадров по кругу (главная, «Кабинеты и оборудование»): каждые 4 с, только когда блок
   на экране и вкладка открыта; точки [data-fade-dot] переключают вручную и сбрасывают таймер;
   при prefers-reduced-motion — без автосмены, только по точкам --- */
document.querySelectorAll('[data-fade]').forEach(function (box) {
  var items = box.querySelectorAll('[data-fade-item]'), dots = box.querySelectorAll('[data-fade-dot]');
  var cur = 0, seen = false, timer;
  if (items.length < 2) return;
  function show(n) {
    cur = (n + items.length) % items.length;
    items.forEach(function (it, i) { it.classList.toggle('is-on', i === cur); });
    dots.forEach(function (d, i) { d.classList.toggle('is-on', i === cur); });
  }
  function play() {
    clearInterval(timer);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(function () { if (seen && !document.hidden) show(cur + 1); }, 4000);
  }
  dots.forEach(function (d) { d.addEventListener('click', function () { show(+d.dataset.fadeDot); play(); }); });
  new IntersectionObserver(function (e) { seen = e[0].isIntersecting; }).observe(box);
  play();
});

/* --- карта (blocks/Contacts.astro): под «крышкой», чтобы колесо и свайп листали страницу, а не
   масштабировали карту. Клик по крышке — карта активна; курсор ушёл с карты или клик мимо — снова крышка --- */
document.querySelectorAll('[data-map]').forEach(function (m) {
  var lid = m.querySelector('[data-map-lid]');
  function off() { m.classList.remove('is-live'); }
  lid.addEventListener('click', function () { m.classList.add('is-live'); });
  m.addEventListener('mouseleave', off);
  document.addEventListener('click', function (e) { if (!m.contains(e.target)) off(); });
});
