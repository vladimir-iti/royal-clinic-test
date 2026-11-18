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
  // только якоря этой страницы (#раздел); ссылки на другие страницы (/royal-clinic-test/raboty/, /#cena) не подсвечиваем
  links.forEach(function (a) { var s = a.dataset.spy || ''; if (s.charAt(0) !== '#') return; var t = document.querySelector(s); if (t) spy.push({ a: a, t: t }); });
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

/* --- липкая панель на телефоне: видна всегда; прячется, пока
   открыта клавиатура (иначе закрывает поле ввода) --- */
(function () {
  var bar = document.querySelector('[data-stickybar]');
  if (!bar) return;
  var typing = false;
  // «Написать» — плашка с выбором мессенджера над меню
  var mbtn = bar.querySelector('[data-sb-msg-btn]'), mbox = bar.querySelector('[data-sb-msg]');
  function msg(open) { if (!mbox) return; mbox.hidden = !open; mbtn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  if (mbtn) {
    mbtn.addEventListener('click', function (e) { e.stopPropagation(); msg(mbox.hidden); });
    document.addEventListener('click', function (e) { if (!mbox.hidden && !mbox.contains(e.target)) msg(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') msg(false); });
  }
  function on() {
    var show = !typing;
    bar.classList.toggle('is-in', show);
    if (!show) msg(false);
  }
  window.addEventListener('scroll', on, { passive: true });
  document.addEventListener('focusin', function (e) {
    if (e.target.matches('input:not([type=checkbox]):not([type=radio]), textarea')) { typing = true; on(); }
  });
  document.addEventListener('focusout', function () { typing = false; setTimeout(on, 150); });
  on();
})();

/* --- «Читать полностью»: свёрнутый текст на телефоне (описание кейса) --- */
(function () {
  document.querySelectorAll('[data-more]').forEach(function (box) {
    var btn = box.querySelector('[data-more-btn]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = box.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.firstChild.nodeValue = open ? 'Свернуть ' : 'Читать полностью ';
      if (!open) box.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  });
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
  var prev = box.querySelector('[data-fade-prev]'), next = box.querySelector('[data-fade-next]'); // стрелки
  if (prev) prev.addEventListener('click', function () { show(cur - 1); play(); });
  if (next) next.addEventListener('click', function () { show(cur + 1); play(); });
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

/* --- кейсы «до и после» (blocks/CaseStories.astro): миниатюры и стрелки переключают кейс --- */
document.querySelectorAll('[data-cases]').forEach(function (box) {
  var panes = box.querySelectorAll('[data-case-pane]'), orig = [].slice.call(box.querySelectorAll('[data-case-tab]'));
  var num = box.querySelector('[data-case-num]'), cur = 0, n = panes.length;
  var dots = box.querySelectorAll('[data-case-dot]');
  // Лента миниатюр бесконечная: за последней снова идёт первая, перед первой — последняя.
  // Лента = копии | оригиналы | копии (копии скрыты от экранных чтецов); живём в средней части,
  // а уехав в копии, после прокрутки незаметно перескакиваем на такое же место в середине.
  // pos — номер активной миниатюры в ленте 0…3n−1.
  var rail = orig[0] && orig[0].parentNode, tabs = orig.slice(), pos = 0, settle;
  // На широком экране все миниатюры помещаются в ряд (как у dantistoff) — лента по кругу только на узком
  var loop = !!rail && n > 1 && window.matchMedia('(max-width: 999px)').matches;
  function copy(t) { var c = t.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; c.removeAttribute('role'); return c; }
  if (loop) {
    var head = orig.map(copy), tail = orig.map(copy);
    head.forEach(function (c) { rail.insertBefore(c, orig[0]); });
    tail.forEach(function (c) { rail.appendChild(c); });
    tabs = head.concat(orig, tail); pos = n;
  }
  function x(el) { return el.offsetLeft - tabs[0].offsetLeft; }
  function jump(dx) { // мгновенный сдвиг ленты без анимации и снапа
    rail.style.scrollSnapType = 'none'; rail.style.scrollBehavior = 'auto';
    rail.scrollLeft += dx;
    rail.style.scrollSnapType = ''; rail.style.scrollBehavior = '';
  }
  function home() { if (loop) { rail.style.scrollBehavior = 'auto'; rail.scrollLeft = x(tabs[pos]) - 8; rail.style.scrollBehavior = ''; } }
  // показать активную и соседей: следующая миниатюра «выезжает», за последней — первая
  function reveal() {
    if (!loop) return;
    var a = tabs[pos - 1], z = tabs[pos + 1];
    var l = x(a), r = x(z) + z.offsetWidth, to = rail.scrollLeft;
    if (l < to) to = l; else if (r > to + rail.clientWidth) to = r - rail.clientWidth;
    if (to !== rail.scrollLeft) rail.scrollTo({ left: to, behavior: 'smooth' });
    clearTimeout(settle);
    settle = setTimeout(function () {
      var w = x(tabs[n]); // ширина одного набора миниатюр
      if (pos >= 2 * n) { pos -= n; jump(-w); } else if (pos < n) { pos += n; jump(w); }
    }, 500);
  }
  function show(k, el) {
    cur = (k + n) % n;
    panes.forEach(function (p, i) { p.hidden = i !== cur; });
    var sh = panes[cur].querySelector('[data-shots]'); if (sh && sh._go) sh._go(0); // открытый кейс — с фото результата
    tabs.forEach(function (t) { var on = +t.dataset.caseTab === cur; t.classList.toggle('is-on', on); if (t.getAttribute('role')) t.setAttribute('aria-selected', on ? 'true' : 'false'); });
    if (el) pos = tabs.indexOf(el);
    if (num) num.textContent = cur + 1;
    dots.forEach(function (d, i) { d.classList.toggle('is-on', i === cur); }); // полоска-индикатор (телефон)
    reveal();
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(+t.dataset.caseTab, t); }); });
  dots.forEach(function (d) { d.addEventListener('click', function () { var k = +d.dataset.caseDot; pos = loop ? n + k : k; show(k); }); });
  var prev = box.querySelector('[data-case-prev]'), next = box.querySelector('[data-case-next]');
  if (prev) prev.addEventListener('click', function () { pos = Math.max(1, pos - 1); show(cur - 1); });
  if (next) next.addEventListener('click', function () { pos = Math.min(tabs.length - 2, pos + 1); show(cur + 1); });
  // стартовое положение — начало средней части; блок вне экрана не разложен, поэтому — когда подъедет
  home();

  // Блок не «прыгает» при переключении: высота сцены = высоте самого длинного кейса.
  // Меряем, по очереди показывая каждый кейс (синхронно, до отрисовки), и возвращаем текущий.
  var stage = box.querySelector('.cst__stage');
  function fit() {
    if (!stage || panes.length < 2) return;
    stage.style.minHeight = '';
    var max = 0;
    panes.forEach(function (p, i) {
      panes.forEach(function (q, k) { q.hidden = k !== i; });
      max = Math.max(max, stage.offsetHeight);
    });
    panes.forEach(function (p, i) { p.hidden = i !== cur; });
    stage.style.minHeight = max + 'px';
  }
  // Блок вне экрана браузер не раскладывает (content-visibility) — мерить, когда он подъезжает к экрану
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      fit();
      if (rail && rail.scrollLeft < 1) home();
      // фото всех кейсов — заранее, чтобы при переключении не было пустой вспышки, пока грузится картинка
      box.querySelectorAll('img[loading="lazy"]').forEach(function (im) { im.loading = 'eager'; });
    }, { rootMargin: '300px 0px' }).observe(box);
  } else fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (stage && stage.style.minHeight) fit(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fit, 150); });
});

/* --- счётчик до конца акции (как «Осталось 16д 8ч» у dantistoff): до конца текущего месяца,
   обновляется раз в минуту; [data-countdown] --- */
(function () {
  var els = document.querySelectorAll('[data-countdown]');
  if (!els.length) return;
  function tick() {
    var now = new Date(), end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    var m = Math.max(0, Math.floor((end - now) / 60000)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60;
    var txt = d ? d + 'д ' + h + 'ч' : h + 'ч ' + mm + 'м';
    els.forEach(function (el) { el.textContent = txt; });
  }
  tick(); setInterval(tick, 60000);
})();

/* --- «Запишитесь на завтра, 15 ноября» — дата завтрашнего дня (клиника работает ежедневно); [data-tomorrow] --- */
(function () {
  var t = new Date(); t.setDate(t.getDate() + 1);
  var txt = t.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  document.querySelectorAll('[data-tomorrow]').forEach(function (el) { el.textContent = txt; });
})();


/* --- снимки внутри кейса (blocks/CaseStories.astro, [data-shots]): большой кадр показывает один снимок
   из [data-shot-i]; миниатюры в углу [data-shot], стрелки [data-shot-prev/next] — по кругу.
   Порядок снимков задан в разметке: результат → до → этапы → результат --- */
document.querySelectorAll('[data-shots]').forEach(function (box) {
  var shots = box.querySelectorAll('[data-shot-i]'), minis = box.querySelectorAll('[data-shot]'), cur = 0;
  var rail = minis[0] && minis[0].parentNode;
  function go(n) {
    cur = (n + shots.length) % shots.length;
    shots.forEach(function (s, i) { s.classList.toggle('is-on', i === cur); });
    minis.forEach(function (m, i) { m.classList.toggle('is-on', i === cur); });
    var m = minis[cur]; // активная миниатюра — в видимую часть ленты (без прокрутки страницы)
    if (rail && m) {
      var l = m.offsetLeft - rail.offsetLeft, r = l + m.offsetWidth;
      if (l < rail.scrollLeft) rail.scrollTo({ left: l - 4, behavior: 'smooth' });
      else if (r > rail.scrollLeft + rail.clientWidth) rail.scrollTo({ left: r - rail.clientWidth + 4, behavior: 'smooth' });
    }
  }
  box._go = go;
  box._cur = function () { return cur; };
  // телефон/планшет: нажатие на фото (не на кнопки) — галерея кейса на весь экран
  // свайп по фото влево/вправо — следующий/предыдущий снимок (без открытия галереи)
  var sx = null, sy = 0, swiped = false;
  box.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiped = false; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) { swiped = true; go(cur + (dx < 0 ? 1 : -1)); }
  }, { passive: true });
  box.addEventListener('click', function (e) {
    if (swiped) { swiped = false; return; } // это был свайп, а не нажатие
    if (!window.matchMedia('(max-width: 999px)').matches || e.target.closest('button')) return;
    openLightbox(box, cur, function (n) { go(n); });
  });
  minis.forEach(function (m) { m.addEventListener('click', function () { go(+m.dataset.shot); }); });
  var p = box.querySelector('[data-shot-prev]'), n = box.querySelector('[data-shot-next]');
  if (p) p.addEventListener('click', function (e) { e.stopPropagation(); go(cur - 1); });
  if (n) n.addEventListener('click', function (e) { e.stopPropagation(); go(cur + 1); });
});

/* --- галерея кейса на весь экран (телефон/планшет): открывается нажатием на фото в кадре кейса.
   Снимки — те же, что в кадре ([data-shot-i] → img), берём самый крупный вариант из srcset.
   Листание: стрелки, свайп влево/вправо, клавиши ←/→; закрыть — крестик, нажатие мимо фото, Esc, свайп вниз.
   <dialog> + showModal: фокус внутри, фон не прокручивается --- */
var openLightbox = (function () {
  var dlg, img, lbl, cnt, items = [], cur = 0, onGo;
  function big(im) {
    var best = im.currentSrc || im.src, w = 0;
    (im.getAttribute('srcset') || '').split(',').forEach(function (s) {
      var p = s.trim().split(/\s+/), v = parseInt(p[1], 10) || 0;
      if (p[0] && v > w) { w = v; best = p[0]; }
    });
    return best;
  }
  function show(n) {
    cur = (n + items.length) % items.length;
    var it = items[cur];
    img.src = it.src; img.alt = it.alt;
    lbl.textContent = it.label; cnt.textContent = (cur + 1) + ' / ' + items.length;
    if (onGo) onGo(cur); // кадр на странице синхронно с галереей
  }
  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'lb';
    dlg.setAttribute('aria-label', 'Фото кейса');
    dlg.innerHTML = '<div class="lb__top"><span class="lb__lbl"></span><span class="lb__cnt"></span>' +
      '<button type="button" class="lb__x" aria-label="Закрыть">×</button></div>' +
      '<img class="lb__img" alt="" decoding="async">' +
      '<button type="button" class="lb__nav lb__nav--l" aria-label="Предыдущее фото">‹</button>' +
      '<button type="button" class="lb__nav lb__nav--r" aria-label="Следующее фото">›</button>';
    document.body.appendChild(dlg);
    img = dlg.querySelector('.lb__img'); lbl = dlg.querySelector('.lb__lbl'); cnt = dlg.querySelector('.lb__cnt');
    dlg.querySelector('.lb__x').addEventListener('click', function () { dlg.close(); });
    dlg.querySelector('.lb__nav--l').addEventListener('click', function () { show(cur - 1); });
    dlg.querySelector('.lb__nav--r').addEventListener('click', function () { show(cur + 1); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
    var x0 = null, y0 = 0, moved = false;
    dlg.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; moved = false; }, { passive: true });
    dlg.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { moved = true; show(cur + (dx < 0 ? 1 : -1)); }
      else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) { moved = true; dlg.close(); } // свайп вниз — закрыть
      // Safari на iPhone не всегда присылает click по «пустому» месту — закрываем уже по касанию
      else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && !e.target.closest('.lb__img, button')) { moved = true; e.preventDefault(); dlg.close(); }
    }, { passive: false });
    // нажатие мимо фото (по чёрному полю или пустой верхней полосе) — закрыть; по фото и кнопкам — нет
    dlg.addEventListener('click', function (e) {
      if (moved) { moved = false; return; }
      if (!e.target.closest('.lb__img, button')) dlg.close();
    });
    dlg.addEventListener('close', function () { document.documentElement.classList.remove('lb-open'); });
  }
  return function (box, start, go) {
    if (!dlg) build();
    items = [].map.call(box.querySelectorAll('[data-shot-i]'), function (s) {
      var im = s.querySelector('img'), cap = s.querySelector('figcaption');
      return { src: big(im), alt: im.alt, label: cap ? cap.textContent : '' };
    });
    onGo = go;
    show(start);
    document.documentElement.classList.add('lb-open');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  };
})();

/* --- «Наши работы» (/royal-clinic-test/raboty/): фильтр по виду лечения. Кнопки [data-cat] в [data-works-filter],
   карточки — li[data-cats] в [data-works-list]. ?vid=<вид> в адресе — сразу выбранный вид
   (ссылка из хлебных крошек кейса); выбор пишется в адрес без перезагрузки --- */
(function () {
  var bar = document.querySelector('[data-works-filter]'), list = document.querySelector('[data-works-list]');
  if (!bar || !list) return;
  var btns = bar.querySelectorAll('[data-cat]'), items = list.querySelectorAll('li[data-cats]');
  function pick(cat) {
    btns.forEach(function (b) { var on = b.dataset.cat === cat; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    items.forEach(function (li) { li.hidden = !!cat && li.dataset.cats.split(' ').indexOf(cat) < 0; });
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      pick(b.dataset.cat);
      var u = new URL(location.href);
      if (b.dataset.cat) u.searchParams.set('vid', b.dataset.cat); else u.searchParams.delete('vid');
      history.replaceState(null, '', u);
    });
  });
  var q = new URLSearchParams(location.search).get('vid');
  if (q && bar.querySelector('[data-cat="' + q + '"]')) pick(q);
})();
