/* Видео-визитка: плавающий кружок справа внизу → по клику раскрывается в плеер 3:4 со звуком.
   Субтитры — отдельный слой из assets/video/slava-intro.ru.vtt (правится как обычный текст).
   FALLBACK_CUES — копия VTT на случай, когда страница открыта через file:// (fetch заблокирован). При правке VTT обновить и её. */
(() => {
  'use strict';
  const I = window.I18N || null;   // английская версия (/en/): пути с префиксом, субтитры и подписи — из site.en.js
  const ROOT = I ? I.root : '';
  const SRC = ROOT + 'assets/video/slava-intro.mp4?v=1';
  const POSTER = ROOT + 'assets/video/slava-intro-poster.webp?v=1';
  const VTT = ROOT + 'assets/video/slava-intro.' + (I ? 'en' : 'ru') + '.vtt?v=1';
  const S = Object.assign({
    open: 'Видео-визитка: смотреть со звуком', play: 'Воспроизвести', pause: 'Пауза', again: 'Смотреть ещё раз',
    muteOff: 'Выключить звук', muteOn: 'Включить звук', seek: 'Перемотка', cc: 'Субтитры', close: 'Закрыть видео', collapse: 'Свернуть видео'
  }, (I && I.intro) || {});
  const RU_CUES = [[0.259,1.286,"Привет, я Слава."],[1.326,2.441,"Добро пожаловать на мой сайт."],[2.481,3.301,"Я продуктовый дизайнер,"],[3.341,5.286,"а в последнее время ещё и сам собираю прототипы"],[5.326,6.856,"с помощью AI и довожу их до кода."],[6.896,8.219,"Дизайном занимаюсь более шести лет,"],[8.259,9.375,"B2B и B2C:"],[9.415,12.071,"от приложения для агрономов в полях до корпоративных чатов."],[12.111,13.612,"Больше всего люблю сложные продукты"],[13.652,16.012,"и момент, когда видно, что пользователю стало проще."],[16.052,16.901,"Посмотрите проекты,"],[16.941,18.264,"а если захотите что-то обсудить,"],[18.304,19.893,"пишите в Telegram или LinkedIn."],[19.933,20.683,"Пока!"]];
  const FALLBACK_CUES = (I && I.introCues) || RU_CUES;

  try { if (sessionStorage.getItem('introClosed') === '1') return; } catch (e) {}
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  const ico = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2L7 6.5 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8z"/></svg>',
    on: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    cc: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 10.5a2 2 0 1 0 0 3M16 10.5a2 2 0 1 0 0 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };

  const root = document.createElement('div');
  root.className = 'intro';
  root.dataset.state = 'bubble';
  root.hidden = true;
  root.innerHTML =
    '<div class="intro__box" role="button" tabindex="0" aria-label="' + S.open + '">' +
      '<video class="intro__v" poster="' + POSTER + '" playsinline muted loop preload="none" disablepictureinpicture></video>' +
      '<div class="intro__ui">' +
        '<button class="intro__big" type="button" aria-label="' + S.play + '">' + ico.play + '</button>' +
        '<p class="intro__cc" aria-hidden="true"></p>' +
        '<div class="intro__bar">' +
          '<button class="intro__b intro__b--play" type="button" aria-label="' + S.pause + '">' + ico.pause + '</button>' +
          '<button class="intro__b intro__b--mute" type="button" aria-label="' + S.muteOff + '">' + ico.on + '</button>' +
          '<div class="intro__prog" role="slider" tabindex="0" aria-label="' + S.seek + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>' +
          '<button class="intro__b intro__b--cc" type="button" aria-label="' + S.cc + '" aria-pressed="true">' + ico.cc + '</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<button class="intro__x" type="button" aria-label="' + S.close + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
  document.body.appendChild(root);

  const $ = (s) => root.querySelector(s);
  const box = $('.intro__box'), v = $('.intro__v'), ccEl = $('.intro__cc'), prog = $('.intro__prog'), bar = prog.firstElementChild;
  const bPlay = $('.intro__b--play'), bMute = $('.intro__b--mute'), bCC = $('.intro__b--cc'), big = $('.intro__big'), xBtn = $('.intro__x');
  const LOOPS = 2;          // сколько раз кружок проигрывает ролик без звука, потом замирает на кадре постера
  const POSTER_T = 1.6;     // кадр постера (с)
  const mobile = matchMedia('(max-width:760px)');
  let cues = FALLBACK_CUES, ccOn = true, raf = 0, loaded = false, loops = 0, done = false, away = false;

  /* --- субтитры из VTT (если fetch недоступен — копия выше) --- */
  const ts = (t) => { const p = t.trim().split(':').map(parseFloat); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
  fetch(VTT).then((r) => r.ok ? r.text() : Promise.reject()).then((txt) => {
    const out = [];
    txt.replace(/\r/g, '').split(/\n\n+/).forEach((b) => {
      const l = b.split('\n'); const i = l.findIndex((s) => s.includes('-->')); if (i < 0) return;
      const [a, c] = l[i].split('-->'); out.push([ts(a), ts(c), l.slice(i + 1).join(' ').trim()]);
    });
    if (out.length) cues = out;
  }).catch(() => {});

  /* --- состояния --- */
  const state = () => root.dataset.state;
  const setPlayUI = () => {
    const ended = v.ended, paused = v.paused;
    bPlay.innerHTML = ended ? ico.replay : paused ? ico.play : ico.pause;
    bPlay.setAttribute('aria-label', ended ? S.again : paused ? S.play : S.pause);
    big.innerHTML = ended ? ico.replay : ico.play;
    big.setAttribute('aria-label', ended ? S.again : S.play);
    root.classList.toggle('is-paused', paused && state() === 'full');
  };
  const setMuteUI = () => {
    bMute.innerHTML = v.muted ? ico.off : ico.on;
    bMute.setAttribute('aria-label', v.muted ? S.muteOn : S.muteOff);
  };
  const tick = () => {
    const d = v.duration || 0, t = v.currentTime;
    if (d) { bar.style.transform = 'scaleX(' + (t / d).toFixed(4) + ')'; prog.setAttribute('aria-valuenow', Math.round(t / d * 100)); }
    if (state() === 'full' && ccOn) {
      const c = cues.find((q) => t >= q[0] && t < q[1]);
      const txt = c ? c[2] : '';
      if (ccEl.dataset.t !== txt) { ccEl.dataset.t = txt; ccEl.textContent = ''; if (txt) { const s = document.createElement('span'); s.textContent = txt; ccEl.appendChild(s); } }
    } else if (ccEl.dataset.t) { ccEl.dataset.t = ''; ccEl.textContent = ''; }
    raf = v.paused ? 0 : requestAnimationFrame(tick);
  };
  const kick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
  const load = () => { if (!loaded) { loaded = true; v.src = SRC; } };
  /* мобильный: если за 2 с видео не пошло — остаётся постер, загрузка прерывается (экономим трафик); по тапу видео грузится и играет */
  const STALL_MS = 2000;
  let stallT = 0;
  v.addEventListener('playing', () => { clearTimeout(stallT); stallT = 0; });
  const playMutedLoop = () => {
    if (reduce || saveData || done || away) return;
    load(); v.muted = true; v.loop = false; const p = v.play(); if (p && p.catch) p.catch(() => {});
    if (mobile.matches && !stallT) stallT = setTimeout(() => {
      stallT = 0;
      if (state() !== 'bubble' || (!v.paused && v.readyState >= 3)) return;
      done = true; loaded = false; v.pause(); v.removeAttribute('src'); v.load();
    }, STALL_MS);
  };
  const restPoster = () => { done = true; v.pause(); try { v.currentTime = POSTER_T; } catch (e) {} };
  /* мобильный: при прокрутке вниз кружок прячется, при прокрутке вверх возвращается */
  const setAway = (on) => {
    if (away === on) return; away = on; root.classList.toggle('is-away', on);
    if (on) { if (state() === 'bubble') v.pause(); } else if (state() === 'bubble') playMutedLoop();
  };
  let lastY = window.scrollY, ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false; const y = window.scrollY, d = y - lastY;
      if (state() === 'bubble' && mobile.matches) { if (y > 120 && d > 8) setAway(true); else if (d < -8 || y <= 120) setAway(false); }
      if (Math.abs(d) > 8) lastY = y;
    });
  }, { passive: true });
  mobile.addEventListener && mobile.addEventListener('change', () => { if (!mobile.matches) setAway(false); });

  const expand = () => {
    if (state() === 'full') return;
    load(); setAway(false); root.dataset.state = 'full'; box.removeAttribute('role'); box.removeAttribute('tabindex'); box.removeAttribute('aria-label');
    xBtn.setAttribute('aria-label', S.collapse);
    v.loop = false; v.muted = false; try { v.currentTime = 0; } catch (e) {}
    const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; setMuteUI(); const q = v.play(); if (q && q.catch) q.catch(() => {}); });
    setMuteUI(); setPlayUI(); kick(); bPlay.focus({ preventScroll: true });
  };
  const collapse = () => {
    if (state() === 'bubble') return;
    root.dataset.state = 'bubble'; box.setAttribute('role', 'button'); box.tabIndex = 0; box.setAttribute('aria-label', S.open);
    xBtn.setAttribute('aria-label', S.close);
    ccEl.dataset.t = ''; ccEl.textContent = '';
    restPoster();   // посмотрел — кружок остаётся на кадре постера, без движения
    setPlayUI(); box.focus({ preventScroll: true });
  };
  const dismiss = () => {
    v.pause(); root.hidden = true; try { sessionStorage.setItem('introClosed', '1'); } catch (e) {}
  };
  const toggle = () => { if (v.ended) { v.currentTime = 0; } v.paused || v.ended ? v.play().catch(() => {}) : v.pause(); };

  /* --- события --- */
  box.addEventListener('click', (e) => {
    if (state() === 'bubble') { expand(); return; }
    if (e.target.closest('.intro__bar')) return;
    toggle();
  });
  box.addEventListener('keydown', (e) => { if (state() === 'bubble' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); expand(); } });
  xBtn.addEventListener('click', () => (state() === 'full' ? collapse() : dismiss()));
  bPlay.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  big.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  bMute.addEventListener('click', (e) => { e.stopPropagation(); v.muted = !v.muted; setMuteUI(); });
  bCC.addEventListener('click', (e) => { e.stopPropagation(); ccOn = !ccOn; bCC.setAttribute('aria-pressed', ccOn); root.classList.toggle('is-nocc', !ccOn); tick(); });
  const seek = (clientX) => { const r = prog.getBoundingClientRect(); if (v.duration) v.currentTime = Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * v.duration; tick(); };
  prog.addEventListener('click', (e) => { e.stopPropagation(); seek(e.clientX); });
  prog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { v.currentTime = Math.min(v.duration || 0, v.currentTime + 3); tick(); }
    if (e.key === 'ArrowLeft') { v.currentTime = Math.max(0, v.currentTime - 3); tick(); }
  });
  ['play', 'pause', 'ended'].forEach((ev) => v.addEventListener(ev, () => { setPlayUI(); kick(); }));
  v.addEventListener('volumechange', setMuteUI);
  v.addEventListener('ended', () => {
    if (state() !== 'bubble') return;
    if (++loops < LOOPS) { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}); } else restPoster();
  });
  v.addEventListener('timeupdate', () => { if (!raf) kick(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state() === 'full' && !document.querySelector('.sheet.is-open')) collapse(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) v.pause(); else if (state() === 'bubble') playMutedLoop();
  });
  /* открылась шторка кейса — плеер сворачивается и замолкает */
  const sheet = document.getElementById('sheet');
  if (sheet) new MutationObserver(() => { if (sheet.classList.contains('is-open') && state() === 'full') collapse(); }).observe(sheet, { attributes: true, attributeFilter: ['class'] });

  /* --- появление: после загрузки страницы, чтобы не мешать первому экрану --- */
  const show = () => setTimeout(() => {
    root.hidden = false; requestAnimationFrame(() => root.classList.add('is-ready')); playMutedLoop();
  }, 900);
  if (document.readyState === 'complete') show(); else window.addEventListener('load', show, { once: true });
})();
