// на Тильде файлы лежат на Netlify, а страница — на домене Тильды
const BASE = window.SITE_BASE || '';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  // телефон и планшет: блоки переставлены (см. style.css), часть сцен работает по-другому
  const MOB = '(max-width: 1023px)';
  const mob = matchMedia(MOB).matches;
  // пальцем листают с инерцией, поэтому прыгать и останавливать прокрутку там нельзя
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  // подсказка «листай вниз» нужна только там, где листают пальцем, а не в узком окне на компьютере
  if (touch) document.documentElement.classList.add('is-touch');
  // только телефон (без планшета): «Что могу?» здесь — заголовок и слайдер карточек вместо сцены с рендером
  const PHONE = '(max-width: 639px)';
  const phone = matchMedia(PHONE).matches;
  matchMedia(PHONE).addEventListener('change', () => location.reload());
  // сцены собираются под одну раскладку, поэтому при переходе через границу страница пересобирается
  matchMedia(MOB).addEventListener('change', () => location.reload());
  // на телефоне и планшете «Для кого?» — обычный блок после первого экрана: он не стоит на месте, а проезжает, как остальные
  if (mob) {
    const who = $('.who'), sec = document.createElement('section');
    sec.className = 'who-sec';
    sec.dataset.theme = 'dark';
    const lab = document.createElement('p');
    lab.className = 'label who__label';
    lab.append($('[data-label="2"]').parentElement);
    who.insertBefore(lab, $('.who__title', who));
    $('.hero').after(sec);
    sec.append(who);
  }
  // rem берём из CSS: на десктопе это ширина/192, на телефоне свой размер
  let remPx = 0;
  const readRem = () => { remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || innerWidth / 192; };
  readRem();
  addEventListener('resize', readRem);
  const rem = () => remPx;
  const vh = () => innerHeight;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = t => t * t * (3 - 2 * t);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Та же кривая, что у thefirstthelast: медленный старт и мягкая посадка
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t;
    const sy = t => ((ay * t + by) * t + cy) * t;
    const dx = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => {
      let t = x;
      for (let i = 0; i < 6; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (sx(t) - x) / d; }
      return sy(clamp(t, 0, 1));
    };
  }
  const soft = bezier(.32, 0, .12, 1);
  const out = bezier(.23, 1, .32, 1);

  gsap.registerPlugin(ScrollTrigger);
  // на телефоне панель браузера прячется при прокрутке и меняет высоту окна: без этого сцены пересчитывались на ходу и пиксели запускались повторно
  ScrollTrigger.config({ ignoreMobileResize: true });
  const lenis = window.lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  history.scrollRestoration = 'manual';
  window.siteLenis = lenis;
  // сайт всегда открывается с первого кадра, даже если браузер помнит старое место прокрутки
  const startTop = () => { if (!location.hash) { scrollTo(0, 0); lenis.scrollTo(0, { immediate: true, force: true }); } };
  startTop();
  addEventListener('beforeunload', () => scrollTo(0, 0));
  addEventListener('pageshow', e => { if (e.persisted) startTop(); });

  // Разбивка текста на строки, чтобы строки выезжали из-под маски, без полупрозрачности
  function splitLines(el) {
    const words = el.textContent.trim().split(/ +/);
    el.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');
    const lines = [];
    let top = null;
    $$('.w', el).forEach(w => {
      if (top === null || Math.abs(w.offsetTop - top) > 2) { lines.push([]); top = w.offsetTop; }
      lines[lines.length - 1].push(w.textContent);
    });
    el.innerHTML = lines.map(l => `<span class="ln"><span>${l.join(' ')}</span></span>`).join('');
    return $$('.ln > span', el);
  }

  // Подписи в квадратных скобках: текст белый, скобки оранжевые
  const brackets = t => t.replace(/^\s*\[(.*)\]\s*$/, '<span class="br">[</span>$1<span class="br">]</span>');
  $$('.label:not(.label--hero):not(.who__label), [data-label]').forEach(el => { el.innerHTML = brackets(el.textContent); });

  // Подпись, которая при наведении прокручивается вверх и подменяется такой же снизу
  function addRoll(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim() ? 1 : 3 });
    const node = walker.nextNode();
    if (!node) return;
    const text = node.textContent.trim();
    const box = document.createElement('span');
    box.className = 'rollbox';
    box.innerHTML = `<span class="roll" data-t="${text}">${text}</span>`;
    node.replaceWith(box);
  }
  $$('[data-roll]').forEach(addRoll);

  /* ---------- Иконки карточек услуг (телефон) ---------- */
  // силуэт из набора Phosphor, обведён «от руки», внутри штриховка, вокруг белые чертёжные направляющие — как иконки «Для кого?»
  if (phone) {
    const ICONS = {"paint-roller":"M248 104v50a16.07 16.07 0 0 1-11.6 15.38L136 198v34a8 8 0 0 1-16 0v-34a16.07 16.07 0 0 1 11.6-15.38L232 154v-50h-16v24a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16v-24H16a8 8 0 0 1 0-16h16V64a16 16 0 0 1 16-16h152a16 16 0 0 1 16 16v24h16a16 16 0 0 1 16 16","grid-four":"M216 56v60a4 4 0 0 1-4 4h-76V44a4 4 0 0 1 4-4h60a16 16 0 0 1 16 16M116 40H56a16 16 0 0 0-16 16v60a4 4 0 0 0 4 4h76V44a4 4 0 0 0-4-4m96 96h-76v76a4 4 0 0 0 4 4h60a16 16 0 0 0 16-16v-60a4 4 0 0 0-4-4m-172 4v60a16 16 0 0 0 16 16h60a4 4 0 0 0 4-4v-76H44a4 4 0 0 0-4 4","rows":"M224 152v40a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16v-40a16 16 0 0 1 16-16h160a16 16 0 0 1 16 16M208 48H48a16 16 0 0 0-16 16v40a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V64a16 16 0 0 0-16-16","lightning":"m213.85 125.46l-112 120a8 8 0 0 1-13.69-7l14.66-73.33l-57.63-21.64a8 8 0 0 1-3-13l112-120a8 8 0 0 1 13.69 7l-14.7 73.41l57.63 21.61a8 8 0 0 1 3 12.95Z","drop":"M174 47.75a254.2 254.2 0 0 0-41.45-38.3a8 8 0 0 0-9.18 0A254.2 254.2 0 0 0 82 47.75C54.51 79.32 40 112.6 40 144a88 88 0 0 0 176 0c0-31.4-14.51-64.68-42-96.25m9.85 105.59a57.6 57.6 0 0 1-46.56 46.55a9 9 0 0 1-1.29.11a8 8 0 0 1-1.32-15.89c16.57-2.79 30.63-16.85 33.44-33.45a8 8 0 0 1 15.78 2.68Z","washing-machine":"M208 32H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m-80 152a56 56 0 1 1 56-56a56 56 0 0 1-56 56m60-104a12 12 0 1 1 12-12a12 12 0 0 1-12 12m-54.34 29.66l-32 32a8 8 0 0 1-11.32-11.32l32-32a8 8 0 0 1 11.32 11.32m32-3.32a8 8 0 0 1 0 11.32l-48 48a8 8 0 0 1-11.32-11.32l48-48a8 8 0 0 1 11.32 0","armchair":"M240 132a28 28 0 0 1-24 27.71V200a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16v-40.29A28 28 0 1 1 72 132v36a8 8 0 0 0 16 0v-24h80v24a8 8 0 0 0 16 0v-36a28 28 0 0 1 56 0M44 88a44.06 44.06 0 0 1 43.81 40h80.38A44.06 44.06 0 0 1 212 88a4 4 0 0 0 4-4V72a40 40 0 0 0-40-40H80a40 40 0 0 0-40 40v12a4 4 0 0 0 4 4","ruler":"M235.32 96L96 235.31a16 16 0 0 1-22.63 0l-52.69-52.68a16 16 0 0 1 0-22.63l29.17-29.17a4 4 0 0 1 5.66 0l34.83 34.83a8 8 0 0 0 11.71-.43a8.18 8.18 0 0 0-.6-11.09l-34.63-34.63a4 4 0 0 1 0-5.65l15-15a4 4 0 0 1 5.66 0l34.83 34.83a8 8 0 0 0 11.71-.43a8.18 8.18 0 0 0-.6-11.09L98.83 87.51a4 4 0 0 1 0-5.65l15-15a4 4 0 0 1 5.65 0l34.83 34.83a8 8 0 0 0 11.72-.43a8.18 8.18 0 0 0-.61-11.09l-34.59-34.66a4 4 0 0 1 0-5.65L160 20.69a16 16 0 0 1 22.63 0l52.69 52.68a16 16 0 0 1 0 22.63"};
    let seed = 0;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    $$('[data-ic]').forEach((el, n) => {
      seed = 101 + n * 37;
      const d = ICONS[el.dataset.ic], id = 'svc' + n, tr = 'translate(44 44) scale(.4375)';
      let hatch = '';
      for (let x = -260; x < 260; x += 7) {
        const j = () => (rnd() - .5) * 3;
        hatch += `<line x1="${x + j()}" y1="${256 + j()}" x2="${x + 256 + j()}" y2="${j()}" stroke-width="${(1.6 + rnd() * 1.4).toFixed(2)}" stroke-opacity="${(.55 + rnd() * .45).toFixed(2)}"/>`;
      }
      const marks = [[100, 16], [100, 184], [16, 100], [184, 100]].map(([x, y]) => `<rect x="${x - 3}" y="${y - .5}" width="6" height="1"/><rect x="${x - .5}" y="${y - 3}" width="1" height="6"/>`).join('');
      el.innerHTML = `<svg viewBox="0 0 200 200" aria-hidden="true"><g fill="none" stroke="#fcfbfb" stroke-opacity=".4" stroke-width="1" stroke-dasharray="4 4"><circle cx="100" cy="100" r="84"/><line x1="100" y1="0" x2="100" y2="200"/><line x1="0" y1="100" x2="200" y2="100"/></g><g fill="#fcfbfb" fill-opacity=".7">${marks}</g><defs><clipPath id="${id}"><path transform="${tr}" d="${d}"/></clipPath><filter id="w${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="${n + 3}"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter></defs><g filter="url(#w${id})"><path transform="${tr}" d="${d}" fill="#ff4e1d" fill-opacity=".16"/><g clip-path="url(#${id})"><g transform="${tr}" stroke="#ff4e1d">${hatch}</g></g><path transform="${tr}" d="${d}" fill="none" stroke="#ff4e1d" stroke-width="7" stroke-linejoin="round"/><path transform="translate(45.5 42.8) scale(.4375)" d="${d}" fill="none" stroke="#ff4e1d" stroke-opacity=".45" stroke-width="3"/></g></svg>`;
    });
  }
  /* ---------- Подсказки на рендере (координаты из макета) ---------- */
  const TIPS = [
    [5212, 7324, 'Производство корпусной мебели на заказ по индивидуальным размерам'],
    [5428, 7143, 'Монтаж электропроводки и сборка щита'],
    [5970, 7539, 'Сборка и монтаж измельчителей и систем очистки воды'],
    [6132, 7669, 'Монтаж и подключение встроенной техники'],
    [6415, 7483, 'Установка розеток и выключателей'],
    [6572, 7305, 'Отделка стен: штукатурка, шпаклёвка, оклеивание обоев, покраска'],
    [7028, 7014, 'Установка и замена освещения'],
    [6941, 7613, 'Монтаж радиаторов'],
    [6994, 7794, 'Укладка напольного покрытия'],
    [7371, 7404, 'Установка ТВ'],
    [7734, 7296, 'Монтаж зеркал на основание из керамогранита и плитки'],
    [8018, 7186, 'Укладка плитки и керамогранита с запилами под 45 градусов'],
    [8027, 7404, 'Проектирование и сборка сантехшкафа, разводка системы водоснабжения'],
    [8725, 7651, 'Планировочные решения и хоумстейджинг'],
    [7743, 7751, 'Подключение стиральных и сушильных машин'],
    [7825, 7882, 'Монтаж тёплых полов'],
    [8048, 7697, 'Сборка, установка и подключение сантехники'],
  ];
  // рендер в макете: x 5074, ширина 4170; сверху срезано 350 px белого поля, видимая высота 1074
  const tipsBox = $('.render__tips');
  const tips = TIPS.map(([x, y, text], i) => {
    const tip = document.createElement('div');
    tip.className = 'tip';
    const fx = (x - 5074) / 4170;
    tip.style.left = (fx * 100) + '%';
    tip.style.top = ((y - 6579 - 350.3) / 1074.4 * 100) + '%';
    tip.style.setProperty('--d', (i % 5) * 0.35 + 's');
    const w = text.length > 44 ? 35.5 : text.length > 30 ? 26 : text.length > 20 ? 21.4 : 0;
    tip.innerHTML = `<span class="tip__dot"></span><span class="tip__box${w ? '' : ' tip__box--line'}"${w ? ` style="--w:${w}"` : ''}>${text}</span>`;
    tipsBox.appendChild(tip);
    return { el: tip, fx, open: false };
  });

  /* ---------- Эскиз рендера: линии рисуются слева направо, цвет идёт следом ---------- */
  const SK = window.SKETCH;
  const NS = 'http://www.w3.org/2000/svg';
  const sketchSvg = $('.render__sketch');
  const renderEl = $('.render');
  const paint = $('.render__paint');
  sketchSvg.setAttribute('viewBox', `0 ${SK.top} ${SK.w} ${SK.h}`);
  const sg = document.createElementNS(NS, 'g');
  const strokes = SK.paths.map(([d, minx, maxx]) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    sg.appendChild(p);
    return { p, minx, len: 1, dur: 1, t: 0 };
  });
  sketchSvg.appendChild(sg);
  // Каждая линия рисуется сама по времени, когда до неё доходит прокрутка: короткие быстро, длинные чуть дольше
  strokes.forEach(s => {
    s.len = s.p.getTotalLength() || 1;
    s.dur = clamp(0.3 + s.len / 900, 0.4, 1.1);
    s.p.style.strokeDasharray = s.len;
    s.p.style.strokeDashoffset = s.len;
  });
  const fin = { f: 0 };
  let strip, lastSketch = '', lastDraw = 0;
  const geo = { rw: 0, left0: 0 };
  const measureRender = () => { geo.rw = renderEl.offsetWidth; geo.left0 = renderEl.offsetLeft; lastSketch = ''; };
  addEventListener('resize', measureRender);
  function paintSketch() {
    if (!strip) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - (lastDraw || now)) / 1000);
    lastDraw = now;
    if (servicesST && !servicesST.isActive && fin.f === 0) return;
    if (!geo.rw) measureRender();
    const W = innerWidth, rw = geo.rw;
    const x = gsap.getProperty(strip, 'x');
    const left = geo.left0 + x;
    const F = W * 0.22;
    // рисовка стартует от «МО», как только лента поехала, и за треть экрана догоняет правый край
    const ramp = smooth(clamp(-x / (W * 0.35), 0, 1));
    const head = (W * (0.98 + 0.12 * fin.f) - left) * ramp;
    // цвет идёт близко за линиями, поэтому подсказки открываются ещё в правой половине экрана
    const fill = head - W * 0.16 * (1 - fin.f) + fin.f * F * 1.2;
    const hx = head / rw * SK.w;
    for (const s of strokes) {
      const want = hx > s.minx ? 1 : 0;
      if (s.t === want) continue;
      s.t = want ? Math.min(1, s.t + dt / s.dur) : Math.max(0, s.t - dt * 3 / s.dur);
      s.p.style.strokeDashoffset = s.len * (1 - smooth(s.t));
      s.p.style.opacity = s.t > 0 ? 1 : 0;
    }
    const key = x.toFixed(1) + '|' + fin.f.toFixed(4) + '|' + W;
    if (key === lastSketch) return;
    lastSketch = key;
    const a = fill - F, b = fill - F * 0.5;
    // левый край картинки тоже растворяется в фоне, чтобы не было видно стыка рендера и блока
    const e = W * 0.12;
    const pm = `linear-gradient(90deg, transparent 0px, #000 ${e}px), linear-gradient(90deg, #000 ${a}px, rgba(0,0,0,.55) ${b}px, transparent ${fill}px)`;
    const sm = `linear-gradient(90deg, transparent ${a}px, rgba(0,0,0,.45) ${b}px, #000 ${fill}px)`;
    paint.style.webkitMaskImage = paint.style.maskImage = pm;
    sketchSvg.style.webkitMaskImage = sketchSvg.style.maskImage = sm;
    for (const t of tips) {
      const tx = t.fx * rw;
      // на телефоне подсказка открывается, только когда её плашка целиком влезает справа от точки, поэтому её не надо двигать
      if (mob && t.w == null) t.w = t.el.offsetWidth;
      // уходящая подсказка закрывается, пока ещё видна у левого края, чтобы было видно, как она прячется
      const open = tx < b && left + tx > (mob ? -W * 0.2 : W * 0.03) && left + tx < (mob ? W - W / 16 - t.w : W * 0.92);
      if (open !== t.open) { t.open = open; t.el.classList.toggle('is-open', open); }
      // на узком экране подсказка не помещается у края: сдвигаем её плашку внутрь экрана
    }
  }

  /* ---------- Кейсы ---------- */
  const photos = (n) => Array.from({ length: 6 }, (_, i) => `${BASE}assets/фото/кейс${n}-${i + 1}.jpg`);
  const CASES = [
    { num: '01', name: 'Студия на вырост', area: '32 м²', term: '2 месяца', task: 'Уютно для сына-студента сегодня, выгодно и беспроблемно для долгосрочной аренды завтра.', photos: photos(1) },
    { num: '02', name: 'Квартира под сдачу', area: '34 м²', term: '1,5 месяца', task: 'Минимум затрат, максимум практичности. Недорогие, но износостойкие материалы и мебель — чтобы квартира стабильно сдавалась и не требовала переделок.', photos: photos(2) },
    { num: '03', name: 'Светло для всех', area: '32 м²', term: '2 месяца', task: 'Светло и уютно, без ярких акцентов — для разных жильцов. Качественно и в разумных рамках: без излишеств, но и без экономии на долговечности.', photos: photos(4) },
  ];
  const casePos = [[4, 12], [65.85, 17], [127.7, 22]];
  const list = $('.cases__list');
  CASES.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'case';
    b.style.setProperty('--l', casePos[i][0] + 'rem');
    b.style.setProperty('--t', casePos[i][1] + 'vh');
    b.setAttribute('aria-label', `Кейс «${c.name}»: подробнее`);
    b.innerHTML = `<span class="case__media"><img src="${c.photos[0]}" alt="" decoding="async"></span><span class="case__num">${brackets('[' + c.num + ']')}</span><span class="case__more"><svg class="ico"><use href="#i-arrow"/></svg></span><span class="case__name">${c.name}</span>`;
    b.addEventListener('click', () => openPopup(i));
    list.appendChild(b);
  });

  /* ---------- Чат дома: переписку листают внутри окна, сообщения появляются, когда попадают в окно ---------- */
  const PIN = 'Если вдруг у кого-то ещё есть отзывы…';
  const CHAT = [
    { name: 'Соседка', ava: 'С', tone: 1, time: '20:24', react: '👍 4  🙏 1', photo: BASE + 'assets/фото/чат-шкаф.jpg', text: 'Я спрашивала на днях сборщика мебели. Порекомендовали. Очень хочется поделиться обратной связью.\n\nЗамечательный сборщик мебели Никита, кстати, наш сосед по дому! Очень ответственный и аккуратный молодой человек! Культурный, воспитанный, думающий, корректный. Помог быстро и качественно собрать шкафы, всё сделал с первого раза, инструмент с собой, за собой убрал. Рекомендую Никиту всем соседям!' },
    { name: 'Марина', ava: 'М', tone: 2, time: '09:40', react: '♥ 3', text: 'Самое время рекомендаций. В очередной раз обратились к Никите по врезке магистральных фильтров и водонагревателя.\n\nИ Никита сделал всё супер. Поэтому советую обращаться, цены действительно демократичные! Выезжал в соседний район. За что отдельная благодарность!' },
    { name: 'Юлия', ava: 'Ю', tone: 3, time: '12:02', reply: true, text: 'Неоднократно обращались к Никите: стол собрать, гардины прикрепить, зеркало повесить. Всё всегда отлично и вовремя.' },
    { name: 'Елена', ava: 'Е', tone: 4, time: '12:15', reply: true, text: 'У меня много чего Никита сделал и по дому, и по сборке мебели. Всегда всё отлично, качественно и аккуратно! За что ему большая благодарность.' },
    { name: 'Маргарита', ava: 'М', tone: 5, time: '13:36', react: '♥ 2', text: 'Ранее обращалась к Никите почистить грязевик, всё быстро сделал. Ещё в будущем планируем обращаться по вопросам ремонта в квартире.' },
    { name: 'Соседка', ava: 'С', tone: 1, time: '13:41', react: '♥ 8', text: 'Вчера Никита установил проточный обогреватель, большое спасибо, всем довольны. Пришёл заранее, за несколько дней, всё посмотрел, обговорили детали, заказал сам по моей просьбе материалы, пришёл в назначенное время, всё подключил.' },
  ];
  const inner = $('.chat__inner');
  const msgHTML = m => `<span class="msg__ava msg__ava--${m.tone}">${m.ava}</span><div class="msg__bubble${m.photo ? ' msg__bubble--photo' : ''}">${m.photo ? `<img class="msg__photo" src="${m.photo}" alt="Никита собирает шкаф в квартире соседки">` : ''}<div class="msg__body"><p class="msg__name">${m.name}</p>${m.reply ? `<p class="msg__reply"><b>Анастасия</b>${PIN}</p>` : ''}<p class="msg__text">${m.text}</p><p class="msg__meta"><span>${m.react ? `<span class="msg__react">${m.react}</span>` : ''}</span><span>${m.time} ✓✓</span></p></div></div>`;
  const msgs = CHAT.map(m => {
    const el = document.createElement('div');
    el.className = 'msg';
    el.innerHTML = msgHTML(m);
    inner.appendChild(el);
    return el;
  });
  const feed = $('.chat__feed');
  const chatNow = $('.chat__now');
  $('.chat__all').textContent = CHAT.length;
  // прячем содержимое, а не сам .msg: обрезанный clip-path элемент наблюдатель считает невидимым
  const msgParts = el => Array.from(el.children);
  if (!reduced) msgs.forEach(el => gsap.set(msgParts(el), { y: () => 2 * rem(), clipPath: 'inset(0 0 100% 0)' }));
  let msgQueue = 0;
  // наблюдение включается, только когда блок отзывов на экране, иначе сообщения «появились» бы заранее
  const msgIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      msgIO.unobserve(e.target);
      gsap.to(msgParts(e.target), { y: 0, clipPath: 'inset(0 0 0% 0)', duration: .7, stagger: .05, ease: out, delay: .12 * msgQueue++, onStart: () => msgQueue-- });
    });
  }, { root: feed, threshold: .12 });
  let chatWatching = false;
  function watchChat() {
    if (chatWatching || reduced) return;
    chatWatching = true;
    msgs.forEach(el => msgIO.observe(el));
  }
  function countChat() {
    const bottom = feed.scrollTop + feed.clientHeight;
    const n = msgs.filter(el => el.offsetTop + Math.min(el.offsetHeight, 120) <= bottom).length;
    chatNow.textContent = clamp(n, 1, CHAT.length);
  }
  feed.addEventListener('scroll', countChat, { passive: true });
  countChat();
  // Колесо листает переписку, пока в ней есть куда листать; в конце (или в начале) колесо снова листает страницу
  let feedTo = 0, feedRun = false;
  feed.addEventListener('wheel', e => {
    if (e.ctrlKey || true) return;
    const max = feed.scrollHeight - feed.clientHeight;
    const from = feedRun ? feedTo : feed.scrollTop;
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if ((d > 0 && from >= max - 1) || (d < 0 && from <= 1)) return;
    e.preventDefault();
    e.stopPropagation();
    feedTo = clamp(from + d, 0, max);
    feedRun = true;
  }, { passive: false });
  gsap.ticker.add(() => {
    if (!feedRun) return;
    const diff = feedTo - feed.scrollTop;
    if (Math.abs(diff) <= 1) { feed.scrollTop = feedTo; feedRun = false; return; }
    feed.scrollTop += Math.sign(diff) * Math.max(1, Math.abs(diff) * 0.2);
  });

  // Висячие предлоги и союзы: короткое слово приклеиваем неразрывным пробелом к следующему, тире к предыдущему
  function glueWords(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('script, style, svg') ? 2 : 1 });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const t = n.textContent.replace(/(^|[\s\u00a0(«])(для|без|под|над|при|про|или|меж|изо|обо|ото)[ ]+/gi, '$1$2\u00a0').replace(/(^|[\s\u00a0(«])([а-яёa-z]{1,2})[ ]+/gi, '$1$2\u00a0').replace(/(^|[\s\u00a0(«])([а-яёa-z]{1,2})[ ]+/gi, '$1$2\u00a0').replace(/ +—/g, '\u00a0—');
      if (t !== n.textContent) n.textContent = t;
    }
  }
  glueWords(document.body);

  /* ---------- Покадровое видео первого экрана ---------- */
  const FRAMES = window.HERO_FRAMES || 361;
  // на телефоне в портрете берём облегчённый набор кадров: он заранее обрезан по вертикали под узкий экран,
  // поэтому распаковывается втрое быстрее и при этом не мылит, как уменьшенный широкий кадр
  const FRAME_DIR = phone && innerHeight > innerWidth ? 'кадры-м' : 'кадры';
  const canvas = $('.hero__video');
  const ctx = canvas.getContext('2d');
  const frames = new Array(FRAMES);
  let want = 0, drawn = -1;
  function sizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    // размер берём у самого холста: на телефоне 100vh выше, чем innerHeight, и кадр растягивался по вертикали
    canvas.width = Math.round((canvas.clientWidth || innerWidth) * dpr);
    canvas.height = Math.round((canvas.clientHeight || innerHeight) * dpr);
    drawn = -1;
    drawFrame();
  }
  function nearest(i) {
    for (let d = 0; d < FRAMES; d++) {
      if (frames[i - d]) return i - d;
      if (frames[i + d]) return i + d;
    }
    return -1;
  }
  function drawFrame() {
    const i = nearest(want);
    if (i < 0 || i === drawn) return;
    const img = frames[i];
    const s = Math.max(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * s, h = img.height * s;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    drawn = i;
  }
  // сначала грузим редкие кадры по всей длине, потом заполняем промежутки
  const order = [];
  const seen = new Set();
  [48, 24, 12, 6, 3, 1].forEach(step => { for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); } });
  let cursorLoad = 0;
  // готовность для прелоудера: первая волна кадров (каждый 48-й, их хватает, чтобы первый экран не был пустым) и шрифты;
  // остальное догружается уже на открытом сайте
  const KEY = Math.ceil(FRAMES / 48);
  let keyLoaded = 0, fontsOk = 0;
  const report = () => { window.siteLoad = Math.min(1, .8 * keyLoaded / KEY + .2 * fontsOk); };
  document.fonts.ready.then(() => { fontsOk = 1; report(); });
  report();
  function loadNext() {
    if (cursorLoad >= order.length) return;
    const i = order[cursorLoad++];
    const img = new Image();
    img.decoding = 'async';
    // кадры первой волны нужны прелоудеру прямо сейчас, остальные идут в обычную очередь
    if (i % 48 === 0) img.fetchPriority = 'high';
    img.onload = () => { frames[i] = img; if (i % 48 === 0) { keyLoaded++; report(); } if (Math.abs(i - want) < 30) { drawn = -1; drawFrame(); } loadNext(); };
    img.onerror = loadNext;
    img.src = `${BASE}assets/${FRAME_DIR}/${String(i + 1).padStart(4, '0')}.webp`;
  }
  for (let k = 0; k < 10; k++) loadNext();
  sizeCanvas();
  addEventListener('resize', sizeCanvas);

  /* ---------- Сетка: пиксельные переходы между блоками ---------- */
  const pix = $('.pixels');
  const pctx = pix.getContext('2d');
  const pixelSections = $$('[data-pixel]');
  const noise = (c, r) => { const s = Math.sin(c * 127.1 + r * 311.7) * 43758.5453; return s - Math.floor(s); };
  function sizePixels() {
    // на таче клетки заливки крупные, поэтому хватает одного пикселя на точку: заливка в 4 раза легче
    const dpr = touch ? 1 : Math.min(devicePixelRatio || 1, 2);
    pix.width = Math.round(innerWidth * dpr);
    pix.height = Math.round(innerHeight * dpr);
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizePixels();
  addEventListener('resize', sizePixels);
  // Переход идёт по времени, а не по прокрутке: когда край следующего блока показывается снизу,
  // клетки цвета этого блока за полсекунды заливают экран снизу вверх, страница под заливкой встаёт к началу блока,
  // и клетки так же быстро исчезают сверху вниз.
  // Назад всё зеркально: край предыдущего блока показался сверху — клетки его цвета идут сверху вниз,
  // страница встаёт к концу предыдущего блока (там, где кончается его закреплённая сцена)
  // на телефоне переход дольше и с мягким разгоном: короткий выглядел резким
  const PIX_IN = mob ? .95 : .85, PIX_HOLD = mob ? .06 : .1, PIX_OUT = mob ? .5 : .45;
  // плавный разгон и торможение на всех устройствах; SOFT — ширина мягкой кромки заливки в долях прогресса
  const pixEase = x => x * x * (3 - 2 * x), PIX_SOFT = .22;
  let pixRun = null, pixHold = false, lastWheel = 0, navigating = false, pixEnd = 0, lastDelta = 0;
  const releasePix = () => { pixHold = false; lenis.start(); };
  // Пока идёт переход и пока не кончилась инерция тачпада, колесо гасим: иначе после перехода страница сама уезжает дальше.
  // Инерция только затухает, поэтому если толчок снова стал сильнее — это человек листает заново, и колесо сразу отпускаем
  addEventListener('wheel', e => {
    const now = performance.now(), d = Math.abs(e.deltaY);
    lastWheel = now;
    const grew = d > 4 && d > lastDelta * 1.4;
    lastDelta = d;
    if (!pixHold) return;
    if (!pixRun && (grew || now - pixEnd > 500)) { releasePix(); return; }
    e.preventDefault();
    e.stopImmediatePropagation();
  }, { capture: true, passive: false });
  addEventListener('touchmove', e => { if (pixRun && pixRun.lock) e.preventDefault(); }, { passive: false });
  // Во время перехода новые запросы игнорируем: их вызывает остаток броска и сам прыжок страницы, а не человек.
  // В короткую паузу после перехода запрос откладывается (храним только последний) и перепроверяется через valid
  let pending = null, pendingT = 0, lastTouch = 0, lastTo;
  addEventListener('touchstart', () => { lastTouch = performance.now(); }, { passive: true });
  // появление текстов ждёт конца перехода, чтобы буквы не проступали сквозь клетки
  const afterPix = [];
  window.whenPixDone = f => pixRun ? afterPix.push(f) : f();
  // если блок открылся под заливкой, его тексты ставим сразу на место: из-под клеток блок выходит уже готовым, без пустой паузы
  window.underPix = () => !!pixRun;
  const pxlog = m => window.__pxlog && window.__pxlog.push(Math.round(performance.now()) + ' ' + m);
  function startPixels(sec, dir = 1, valid) {
    if (navigating || reduced || !popup.hidden) return;
    if (pixRun || pixHold) { pxlog('skip ' + sec.className + dir + ' y=' + Math.round(scrollY)); return; }
    const wait = touch ? 500 - (performance.now() - pixEnd) : 0;
    // сразу после перехода без нового касания запрос даёт только хвост инерции: возвращаем страницу на место вместо второго перехода
    if (touch && performance.now() - pixEnd < 900 && lastTouch < pixEnd) {
      pxlog('drop ' + sec.className + dir);
      if (lastTo !== undefined) lenis.scrollTo(lastTo, { immediate: true, force: true });
      return;
    }
    if (wait > 0) {
      pending = { sec, dir, valid };
      clearTimeout(pendingT);
      pendingT = setTimeout(() => { const p = pending; pending = null; if (p && (!p.valid || p.valid())) startPixels(p.sec, p.dir, p.valid); }, wait);
      pxlog('queue ' + sec.className + dir);
      return;
    }
    pending = null; clearTimeout(pendingT);
    pxlog('start ' + sec.className + dir + ' y=' + Math.round(scrollY));
    // кнопка и голова уходят чуть раньше клеток
    cta.classList.add('is-gone'); head.classList.add('is-gone');
    pixRun = { sec, dir, color: dir > 0 ? sec.dataset.pixel : sec.dataset.pixelBack, t0: performance.now() + (touch ? 0 : 180), jumped: false, y0: scrollY };
    // на телефоне прокрутку держим с первого кадра: так гасится инерция броска, и страница не пролетает через блоки
    if (touch) { pixRun.lock = true; lenis.stop(); return; }
    pixHold = true;
    lenis.stop();
  }
  function drawPixels() {
    if (!pixRun) {
      if (pixHold && performance.now() - lastWheel > 180) releasePix();
      return;
    }
    // клетка заливки равна клетке сетки: на телефоне 16 клеток в ширину
    const W = innerWidth, H = vh(), cs = mob ? W / (W >= 640 ? 24 : 16) : rem() * 4;
    const cols = Math.ceil(W / cs), rows = Math.ceil(H / cs);
    const t = (performance.now() - pixRun.t0) / 1000;
    const a = pixEase(clamp(t / PIX_IN, 0, 1)) * 1.02;
    const b = pixEase(clamp((t - PIX_IN - PIX_HOLD) / PIX_OUT, 0, 1)) * 1.02;
    if (a >= 1 && !pixRun.jumped) {
      pixRun.jumped = true;
      const top = scrollY + pixRun.sec.getBoundingClientRect().top;
      // назад встаём чуть выше точки, где на телефоне стартует переход вперёд: иначе следующий свайп вниз его уже не запустит
      pixRun.to = pixRun.dir > 0 ? top : top - H - (touch ? Math.round(H * .35) + 4 : 0);
      lenis.scrollTo(pixRun.to, { immediate: true, force: true });
      ScrollTrigger.update();
    }
    // на телефоне инерция броска продолжает двигать страницу под заливкой: каждый кадр держим её на месте
    else if (pixRun.lock) { const y = pixRun.jumped ? pixRun.to : pixRun.y0; if (Math.abs(scrollY - y) > 1) window.scrollTo(0, y); }
    pctx.clearRect(0, 0, W, H);
    if (b >= 1.02) {
      // за время перехода остаток броска мог сдвинуть страницу: ставим её точно в начало блока ещё раз
      if (pixRun.lock) { if (pixRun.to !== undefined) lenis.scrollTo(pixRun.to, { immediate: true, force: true }); lenis.start(); }
      pxlog('end y=' + Math.round(scrollY));
      lastTo = pixRun.to;
      pixRun = null; pixEnd = performance.now();
      afterPix.splice(0).forEach(f => f());
      if (!footerVisible) { cta.classList.remove('is-gone'); head.classList.remove('is-gone'); }
      return;
    }
    pctx.fillStyle = pixRun.color;
    // клетками экран только закрывается; открывается он плавным растворением всей заливки:
    // цвет заливки совпадает с фоном нового блока, и при уходе клетками его тексты проступали кусками
    if (b > 0) {
      pctx.globalAlpha = 1 - Math.min(1, b);
      pctx.fillRect(0, 0, W, H);
      pctx.globalAlpha = 1;
      return;
    }
    // у кромки клетки не вспыхивают сразу, а проявляются за PIX_SOFT прогресса: переход читается плавнее
    for (let r = 0; r < rows; r++) {
      const up = pixRun.dir < 0 ? r / rows : (rows - 1 - r) / rows;
      for (let c = 0; c < cols; c++) {
        const k = (a - (up * .6 + noise(c, r) * .4)) / PIX_SOFT;
        if (k <= 0) continue;
        pctx.globalAlpha = k < 1 ? k : 1;
        pctx.fillRect(c * cs, r * cs, cs + .5, cs + .5);
      }
    }
    pctx.globalAlpha = 1;
  }

  /* ---------- Тема (цвет сетки, курсора, меню и кнопок) ---------- */
  const themed = $$('[data-theme]').filter(el => el !== document.body);
  // после карточек «Для кого?» ещё ~3 шага стоят на экране, прежде чем начнётся переход
  // на телефоне после «Для кого?» хвост короче: карточки едут по таймеру, длинная пауза за ними не нужна
  const HERO_LEN = 14.4, WHO_AT = 11.6;
  // на телефоне и планшете «Для кого?» вынесен из первого экрана, поэтому сцена кончается вместе с роликом
  const SCENE_LEN = mob ? 11.7 : HERO_LEN;
  let heroST, servicesST, footerVisible = false;
  function updateTheme() {
    const mid = vh() / 2;
    for (const el of themed) {
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) {
        let th = el.dataset.theme;
        if (!mob && el.classList.contains('hero') && heroST && heroST.progress > WHO_AT / HERO_LEN) th = 'dark';
        if (document.body.dataset.theme !== th) document.body.dataset.theme = th;
        const glass = el.matches('.cases, .reviews') ? '1' : '0';
        if (document.body.dataset.glass !== glass) document.body.dataset.glass = glass;
        break;
      }
    }
  }

  /* ---------- Курсор ---------- */
  const cur = $('.cursor');
  const curH = $('.cursor__h'), curV = $('.cursor__v');
  const curParts = $$('.cursor__plus, .cursor__hand, .cursor__xy, .cursor__tag', cur);
  const curX = $('.cursor__x'), curY = $('.cursor__y');
  let mx = innerWidth / 2, my = innerHeight / 2, mouseMoved = false, scrolledOnce = false;
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    if (!mouseMoved) { mouseMoved = true; cur.classList.add('is-on'); }
  }, { passive: true });
  document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
  document.addEventListener('mouseenter', () => mouseMoved && cur.classList.add('is-on'));
  addEventListener('pointerdown', () => cur.classList.add('is-down'));
  addEventListener('pointerup', () => cur.classList.remove('is-down'));
  function updateCursor() {
    if (!mouseMoved) return;
    curH.style.transform = `translateY(${my}px)`;
    curV.style.transform = `translateX(${mx}px)`;
    curParts.forEach(p => { p.style.translate = `${mx}px ${my}px`; });
    curX.textContent = 'X:' + Math.round(mx);
    curY.textContent = 'Y:' + Math.round(my + lenis.scroll);
    const under = document.elementFromPoint(mx, my);
    // Проверка в каждом кадре, а не только на движение мыши: при прокрутке под неподвижным курсором оказывается другой блок
    // пальчик — только там, где клик куда-то ведёт или что-то делает; у подсказок и карточек остаётся повёрнутый плюс
    const isAct = !!(under && under.closest('a, button, [role="button"]'));
    const isLink = !isAct && !!(under && under.closest('.tip, .card'));
    const isCase = !!(under && under.closest('.case'));
    if (cur.classList.contains('is-act') !== isAct) cur.classList.toggle('is-act', isAct);
    if (cur.classList.contains('is-link') !== isLink) cur.classList.toggle('is-link', isLink);
    if (cur.classList.contains('is-case') !== isCase) cur.classList.toggle('is-case', isCase);
    const sec = under && under.closest('[data-theme]');
    const th = sec && sec !== document.body ? sec.dataset.theme : document.body.dataset.theme;
    if (cur.dataset.theme !== th) cur.dataset.theme = th;
  }
  cur.classList.add('is-scroll-hint');

  gsap.ticker.add(() => { drawPixels(); updateTheme(); updateCursor(); paintSketch(); });

  /* ---------- Шапка ---------- */
  const header = $('.header');
  const nav = $('.nav');
  const navBar = $('.nav__bar');
  const navSquare = $('.nav__square');
  const labelIn = $('.nav__label .m > span');
  const linkIns = $$('.nav__links .m > span');
  let navOpen = false, navPinnedOpen = false;
  function setNav(open, instant) {
    if (open === navOpen && !instant) return;
    navOpen = open;
    nav.classList.toggle('is-open', open);
    if (mob) document.body.classList.toggle('is-dim', open);
    navSquare.setAttribute('aria-expanded', open);
    navSquare.setAttribute('aria-label', open ? 'Свернуть меню' : 'Открыть меню');
    const d = instant ? 0 : 1;
    // на телефоне меню — шторка сверху (раскрывается в CSS), ширину полоски не трогаем
    if (!mob) gsap.to(navBar, { width: open ? $('.nav__links').scrollWidth : 12.4 * rem(), duration: .7 * d, ease: soft });
    if (open) {
      if (!mob) gsap.to(labelIn, { yPercent: -140, duration: .3 * d, ease: 'power2.in' });
      gsap.fromTo(linkIns, { yPercent: 140 }, { yPercent: 0, duration: .5 * d, stagger: .035 * d, delay: (mob ? .18 : .12) * d, ease: out });
    } else {
      gsap.to(linkIns, { yPercent: -140, duration: .3 * d, stagger: .02 * d, ease: 'power2.in' });
      if (!mob) gsap.fromTo(labelIn, { yPercent: 140 }, { yPercent: 0, duration: .5 * d, delay: .25 * d, ease: out });
    }
  }
  // на компьютере меню всегда начинается свёрнутым: видно только слово «Меню»
  setNav(false, true);
  document.fonts.ready.then(() => navOpen && setNav(true, true));
  navSquare.addEventListener('click', () => { navPinnedOpen = !navOpen; setNav(!navOpen); });
  $('.nav__label').addEventListener('click', () => { navPinnedOpen = true; setNav(true); });
  $('.nav__x').addEventListener('click', () => { navPinnedOpen = false; setNav(false); });
  let lastScroll = 0, navAt = 0;
  navSquare.addEventListener('click', () => { navAt = lenis.scroll; });
  // на телефоне шторка меню закрывается от касания мимо неё
  document.addEventListener('click', e => { if (mob && navOpen && !e.target.closest('.nav')) setNav(false); });
  lenis.on('scroll', ({ scroll }) => {
    const dir = scroll > lastScroll ? 1 : -1;
    if (Math.abs(scroll - lastScroll) > 2) {
      // на телефоне и планшете бургер виден всегда
      header.classList.toggle('is-hidden', !mob && dir === 1 && scroll > 120);
      header.classList.toggle('is-plate', scroll > 40);
      lastScroll = scroll;
    }
    if (!scrolledOnce && scroll > vh() * 0.12) { scrolledOnce = true; cur.classList.remove('is-scroll-hint'); }
    if (mob) { if (navOpen && Math.abs(scroll - navAt) > 40) setNav(false); return; }
    if (scroll > 60 && dir === 1 && navPinnedOpen) { navPinnedOpen = false; setNav(false); }
  });

  /* ---------- Закреплённая кнопка ---------- */
  const cta = $('.cta');
  $('.cta__btn').addEventListener('click', e => {
    const open = !cta.classList.contains('is-open');
    cta.classList.toggle('is-open', open);
    e.currentTarget.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.cta')) { cta.classList.remove('is-open'); $('.cta__btn').setAttribute('aria-expanded', false); } });

  /* ---------- Говорящая голова ---------- */
  const head = $('.head');
  const video = $('.head__video');
  const progress = $('.head__progress');
  const knob = $('.head__knob');
  function paintRing() {
    const p = video.duration ? video.currentTime / video.duration : 0;
    progress.style.strokeDashoffset = 1 - p;
    knob.setAttribute('transform', `rotate(${p * 360} 50 50)`);
  }
  function openHead() {
    head.classList.add('is-big');
    video.muted = false;
    video.play().catch(() => { video.muted = true; video.play(); });
  }
  function closeHead() {
    head.classList.remove('is-big', 'is-playing');
    video.pause();
  }
  video.addEventListener('play', () => head.classList.add('is-playing'));
  video.addEventListener('pause', () => head.classList.remove('is-playing'));
  video.addEventListener('ended', () => { video.currentTime = 0; paintRing(); });
  video.addEventListener('timeupdate', paintRing);
  gsap.ticker.add(() => { if (!video.paused) paintRing(); });
  head.addEventListener('click', e => {
    if (e.target.closest('.head__grab')) return;
    if (!head.classList.contains('is-big')) openHead();
    else video.paused ? video.play() : video.pause();
  });
  document.addEventListener('click', e => { if (head.classList.contains('is-big') && !e.target.closest('.head')) closeHead(); });
  head.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); head.click(); } });
  // перемотка: тянешь оранжевое кольцо
  const grab = $('.head__grab');
  function seekFromPointer(e) {
    const r = head.getBoundingClientRect();
    const a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2)));
    const p = ((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
    if (video.duration) { video.currentTime = p * video.duration; paintRing(); }
  }
  let wasPlaying = false;
  grab.addEventListener('pointerdown', e => {
    e.preventDefault();
    grab.setPointerCapture(e.pointerId);
    wasPlaying = !video.paused;
    video.pause();
    seekFromPointer(e);
  });
  grab.addEventListener('pointermove', e => { if (grab.hasPointerCapture(e.pointerId)) seekFromPointer(e); });
  grab.addEventListener('pointerup', e => { grab.releasePointerCapture(e.pointerId); if (wasPlaying) video.play(); });

  /* ---------- Попап кейса ---------- */
  const popup = $('.popup');
  const panel = $('.popup__panel');
  const rail = $('.popup__rail');
  const track = $('.popup__track');
  let carousel = { target: 0, current: 0, max: 0, raf: 0, drag: null, last: 0 };
  function openPopup(i) {
    const c = CASES[i];
    $('.popup__num').innerHTML = brackets(`[${c.num}]`);
    $('.popup__title').textContent = c.name;
    $('.popup__facts').innerHTML = `<div><dt>Площадь</dt><dd>${c.area}</dd></div><div><dt>Срок</dt><dd>${c.term}</dd></div>`;
    $('.popup__task').textContent = c.task;
    glueWords(panel);
    rail.innerHTML = c.photos.map(p => `<figure><img src="${p}" alt="Фото проекта «${c.name}»" draggable="false"></figure>`).join('');
    popup.hidden = false;
    lenis.stop();
    header.classList.add('is-hidden');
    cta.classList.add('is-gone');
    head.classList.add('is-gone');
    carousel.target = carousel.current = 0;
    requestAnimationFrame(measureRail);
    gsap.fromTo('.popup__bg', { opacity: 0 }, { opacity: 1, duration: .5, ease: soft });
    gsap.fromTo(panel, { yPercent: 101 }, { yPercent: 0, duration: .8, ease: soft });
    gsap.fromTo($$('figure', rail), { xPercent: 100, clipPath: 'inset(0 0 0 100%)' }, { xPercent: 0, clipPath: 'inset(0 0 0 0%)', duration: .9, stagger: .04, delay: .3, ease: soft });
    gsap.fromTo(['.popup__title', '.popup__facts', '.popup__task', '.popup__cta'], { y: 60, clipPath: 'inset(0 0 100% 0)' }, { y: 0, clipPath: 'inset(0 0 0% 0)', duration: .8, stagger: .05, delay: .35, ease: soft });
    cancelAnimationFrame(carousel.raf);
    tickCarousel();
    $('.popup__close').focus({ preventScroll: true });
  }
  function closePopup() {
    if (popup.hidden) return;
    lb.hidden = true;
    gsap.to('.popup__bg', { opacity: 0, duration: .4, ease: out });
    gsap.to(panel, { yPercent: 101, duration: .45, ease: soft, onComplete: () => {
      popup.hidden = true;
      cancelAnimationFrame(carousel.raf);
      lenis.start();
      if (mob) header.classList.remove('is-hidden');
      if (!footerVisible) { cta.classList.remove('is-gone'); head.classList.remove('is-gone'); }
    } });
  }
  // край ленты считаем по последнему фото, чтобы в конце справа не оставалось пустоты
  function measureRail() {
    const last = rail.lastElementChild;
    carousel.max = last ? Math.max(0, last.offsetLeft + last.offsetWidth + parseFloat(getComputedStyle(rail).paddingRight) - track.clientWidth) : 0;
  }
  function tickCarousel() {
    const k = carousel;
    k.target = clamp(k.target, 0, k.max);
    const prev = k.current;
    k.current += (k.target - k.current) * 0.1;
    const vel = clamp(k.current - prev, -100, 100);
    rail.style.transform = `translate3d(${-k.current}px,0,0)`;
    $$('figure', rail).forEach(f => { f.style.scale = 1 + Math.abs(vel) * 0.001; });
    k.raf = requestAnimationFrame(tickCarousel);
  }
  $$('.popup__arr').forEach(b => b.addEventListener('click', () => {
    const f = rail.firstElementChild;
    if (f) carousel.target += +b.dataset.dir * (f.offsetWidth + parseFloat(getComputedStyle(rail).columnGap || 0));
  }));
  popup.addEventListener('wheel', e => { e.preventDefault(); carousel.target += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.8; }, { passive: false });
  // пальцем лента идёт ровно за пальцем и после броска докатывается по инерции; мышкой тянется чуть быстрее
  track.addEventListener('pointerdown', e => { carousel.drag = { x0: e.clientX, x: e.clientX, t: carousel.target, k: e.pointerType === 'touch' ? 1 : 1.4, lx: e.clientX, lt: performance.now(), v: 0 }; track.setPointerCapture(e.pointerId); track.classList.add('is-drag'); });
  track.addEventListener('pointermove', e => {
    const g = carousel.drag;
    if (!g) return;
    const now = performance.now();
    g.v = (e.clientX - g.lx) / Math.max(1, now - g.lt) * g.k;
    g.lx = e.clientX; g.lt = now;
    carousel.target = g.t - (e.clientX - g.x) * g.k;
  });
  const dropRail = e => {
    const g = carousel.drag;
    // короткое нажатие без протягивания — это клик по фото: открываем его крупно
    if (g && e && e.type === 'pointerup' && Math.abs(e.clientX - g.x0) < 6) {
      const fig = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.tagName === 'FIGURE' && el.parentElement === rail);
      if (fig) { carousel.drag = null; track.classList.remove('is-drag'); return openLb([...rail.children].indexOf(fig)); }
    }
    if (g && performance.now() - g.lt < 90) carousel.target -= g.v * 280;
    carousel.drag = null;
    track.classList.remove('is-drag');
  };
  track.addEventListener('pointerup', dropRail);
  track.addEventListener('pointercancel', dropRail);
  if (touch) $('.popup__hint').textContent = 'Листай фото пальцем';
  // крупный просмотр фото: фон затемняется, стрелки по бокам листают, клик мимо или крестик закрывают
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.hidden = true;
  lb.innerHTML = '<div class="lb__bg"></div><img class="lb__img" alt=""><button class="lb__arr lb__arr--prev" type="button" aria-label="Предыдущее фото"><svg class="ico"><use href="#i-left"/></svg></button><button class="lb__arr lb__arr--next" type="button" aria-label="Следующее фото"><svg class="ico"><use href="#i-right"/></svg></button><button class="lb__close" type="button" aria-label="Закрыть фото"><svg class="ico"><use href="#i-close"/></svg></button><p class="lb__num"></p><div class="lb__dots"></div>';
  popup.appendChild(lb);
  const lbImg = $('.lb__img', lb);
  let lbAt = 0;
  function showLb(i, dir = 0) {
    const imgs = $$('img', rail);
    lbAt = (i + imgs.length) % imgs.length;
    lbImg.src = imgs[lbAt].src;
    $('.lb__num', lb).textContent = (lbAt + 1) + ' / ' + imgs.length;
    $('.lb__dots', lb).innerHTML = imgs.map((_, k) => `<i${k === lbAt ? ' class="is-on"' : ''}></i>`).join('');
    gsap.fromTo(lbImg, { x: dir * 60, opacity: dir ? 0 : 1 }, { x: 0, opacity: 1, duration: .5, ease: out });
  }
  function openLb(i) {
    lb.hidden = false;
    showLb(i);
    gsap.fromTo('.lb__bg', { opacity: 0 }, { opacity: 1, duration: .4, ease: out });
    gsap.fromTo(lbImg, { scale: .9, opacity: 0 }, { scale: 1, opacity: 1, duration: .6, ease: soft });
    gsap.fromTo($$('.lb__arr, .lb__close, .lb__num, .lb__dots', lb), { opacity: 0 }, { opacity: 1, duration: .4, delay: .2 });
  }
  function closeLb() {
    if (lb.hidden) return;
    gsap.to('.lb__bg', { opacity: 0, duration: .3 });
    gsap.to([lbImg, ...$$('.lb__arr, .lb__close, .lb__num, .lb__dots', lb)], { opacity: 0, duration: .3, onComplete: () => { lb.hidden = true; } });
  }
  $('.lb__prev, .lb__arr--prev', lb).addEventListener('click', () => showLb(lbAt - 1, -1));
  $('.lb__arr--next', lb).addEventListener('click', () => showLb(lbAt + 1, 1));
  $('.lb__close', lb).addEventListener('click', closeLb);
  $('.lb__bg', lb).addEventListener('click', closeLb);
  lb.addEventListener('wheel', e => { e.stopPropagation(); e.preventDefault(); }, { passive: false });
  let lbTouch = null;
  lb.addEventListener('touchstart', e => { lbTouch = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (lbTouch === null) return; const d = e.changedTouches[0].clientX - lbTouch; lbTouch = null; if (Math.abs(d) > 40) showLb(lbAt + (d < 0 ? 1 : -1), d < 0 ? 1 : -1); });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'ArrowRight') showLb(lbAt + 1, 1);
    if (e.key === 'ArrowLeft') showLb(lbAt - 1, -1);
    if (e.key === 'Escape') { e.stopImmediatePropagation(); closeLb(); }
  }, true);
  $('.popup__close').addEventListener('click', closePopup);
  $('.popup__bg').addEventListener('click', closePopup);
  addEventListener('keydown', e => { if (e.key === 'Escape') { closePopup(); if (head.classList.contains('is-big')) closeHead(); } });

  /* ---------- Сцены прокрутки ---------- */
  // Тексты разбиваются на буквы. Прокрутка только запускает анимацию, дальше она доигрывает сама,
  // поэтому в паузе каждая буква либо видна целиком, либо спрятана
  const splitChars = lines => lines.flatMap(l => {
    // слово держится целиком, иначе строка рвётся между буквами (например, перед «Й»)
    l.innerHTML = l.textContent.split(' ').map(w => `<span class="w">${[...w].map(c => `<span class="ch">${c}</span>`).join('')}</span>`).join(' ');
    return $$('.ch', l);
  });
  const charsIn = (els, d = 1) => gsap.to(els, { yPercent: 0, duration: .65 * d, stagger: Math.min(.02, .5 / els.length), ease: out, overwrite: true });
  const charsOut = els => gsap.to(els, { yPercent: -140, duration: .4, stagger: Math.min(.008, .25 / els.length), ease: 'power2.in', overwrite: true });
  // заголовок появляется по буквам только при прокрутке вниз; при возврате вверх он сразу виден целиком
  function reveal(els, trigger, start, extra = {}) {
    gsap.set(els, { yPercent: 140 });
    let tw;
    ScrollTrigger.create({
      trigger, start, end: 'max',
      onEnter: () => { if (underPix()) gsap.set(els, { yPercent: 0 }); else tw = charsIn(els); extra.onEnter && extra.onEnter(); },
      onLeaveBack: () => { tw && tw.kill(); gsap.set(els, { yPercent: 140 }); },
    });
  }
  const entryDone = window.entryDone || Promise.resolve();
  document.fonts.ready.then(() => {
    const intro = splitChars([...splitLines($('.hero__name')), ...splitLines($('.hero__area')), ...splitLines($('.hero__title'))]);
    const facts = [1, 2, 3].map(n => splitChars(splitLines($(`[data-fact="${n}"]`))));
    const whoTitle = splitChars(splitLines($('.who__title')));
    const desc = [...splitLines($('.services__kicker')), ...splitLines($('.services__lead'))];
    const footTitle = splitChars(splitLines($('.footer__title')));
    const revTitle = [...splitChars(splitLines($('.reviews__title'))), ...splitChars(splitLines($('.reviews__note')))];
    const label1 = $('[data-label="1"]'), label2 = $('[data-label="2"]');

    gsap.set([...desc], { yPercent: 125 });
    gsap.set([...intro, ...facts.flat(), ...whoTitle, label1, label2], { yPercent: 140 });

    // Первый экран: у каждого текста своё окно на шкале сцены. Вошли в окно при прокрутке вниз — буквы въезжают,
    // вышли вниз — уезжают вверх. Назад всё ставится сразу, без анимации; окна, проскочённые быстрым свайпом, не проигрываются
    const VIDEO_END = 11.7;
    const groups = [];
    const phase = (els, from, to) => groups.push({ els, from, to, on: false });
    phase(intro, -1, 1.1);
    phase([label1], 2.1, mob ? WHO_AT - .1 : 99);
    facts.forEach((lines, k) => phase(lines, 2.4 + k * 3.1, 2.4 + k * 3.1 + 2.4));
    if (!mob) phase(whoTitle, WHO_AT + .3, 99);
    let ready = false, lastP = 0;
    // на телефоне карточки едут по своему времени, а не за пальцем: после сильного броска они не пролетают молнией
    let cardsOn = false;
    function cardsPhase(p) {
      const want = p >= WHO_AT + .4;
      if (want === cardsOn) return;
      cardsOn = want;
      gsap.killTweensOf('.card');
      if (want) gsap.to('.card', { y: 0, duration: 1.1, stagger: .22, ease: 'power3.out' });
      else gsap.set('.card', { y: () => vh() });
    }
    function runPhases(p) {
      if (!ready) return;
      const down = p >= lastP;
      lastP = p;
      for (const g of groups) {
        const want = p >= g.from && p < g.to;
        if (want === g.on) continue;
        g.on = want;
        gsap.killTweensOf(g.els);
        if (want) down ? charsIn(g.els) : gsap.set(g.els, { yPercent: 0 });
        else if (down && p < g.to + .8) charsOut(g.els);
        else gsap.set(g.els, { yPercent: 140 });
      }
    }
    // первый текст проявляется поверх уже показанной фотографии, когда закрылся глазок
    entryDone.then(() => setTimeout(() => { ready = true; runPhases(heroST ? heroST.progress * SCENE_LEN : 0); }, 250));

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: () => { want = Math.round(clamp(tl.progress() * SCENE_LEN / VIDEO_END, 0, 1) * (FRAMES - 1)); drawFrame(); },
      scrollTrigger: {
        trigger: '.hero', start: 'top top', end: () => '+=' + vh() * (mob ? 6.35 * SCENE_LEN / HERO_LEN : 6.6), pin: true, scrub: .4,
        onUpdate: s => runPhases(s.progress * SCENE_LEN),
      },
    });
    if (!mob) tl.to('.hero__dark', { opacity: .55, duration: .8 }, WHO_AT)
      .fromTo('.who__guides i', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .8, stagger: .05, ease: 'power2.out' }, WHO_AT + .1);
    if (!mob) tl.fromTo('.card', { y: () => vh() }, { y: 0, duration: 1.1, stagger: .2, ease: 'power3.out' }, WHO_AT + .4);
    tl
      .to({}, { duration: .01 }, SCENE_LEN - .01);
    heroST = tl.scrollTrigger;
    if (mob) {
      reveal([label2], '.who-sec', 'top 75%');
      reveal(whoTitle, '.who-sec', 'top 70%');
      const hideCards = () => { gsap.set('.card', { y: 60, opacity: 0 }); gsap.set('.who__guides i', { clipPath: 'inset(0 0 100% 0)' }); };
      hideCards();
      ScrollTrigger.create({
        trigger: '.who-sec', start: 'top 65%', end: 'max',
        onEnter: () => {
          gsap.to('.who__guides i', { clipPath: 'inset(0 0 0% 0)', duration: .8, stagger: .05, ease: 'power2.out' });
          gsap.to('.card', { y: 0, opacity: 1, duration: .9, stagger: .15, ease: 'power3.out' });
        },
        onLeaveBack: () => { gsap.killTweensOf('.card, .who__guides i'); hideCards(); },
      });
    }
    document.documentElement.classList.add('is-ready');

    if (!phone) {
    // «Что могу?»: слова въезжают, при первом движении колеса расходятся, внутри строками встаёт описание
    gsap.set('.big__in', { yPercent: 150, rotate: 2 });
    ScrollTrigger.create({
      trigger: '.services', start: 'top 70%', end: 'max',
      onEnter: () => underPix() ? gsap.set('.big__in', { yPercent: 0, rotate: 0, overwrite: true }) : gsap.to('.big__in', { yPercent: 0, rotate: 0, ease: 'power4.inOut', duration: 1, stagger: .1, overwrite: true }),
      onLeaveBack: () => gsap.set('.big__in', { yPercent: 150, rotate: 2, overwrite: true }),
    });
    // слова стоят по левому краю; в конце они встают туда же, где стояли раньше, когда были по центру
    const bigShift = () => { const w = $$('.big__w'); return (innerWidth - (w[1].getBoundingClientRect().right - w[0].getBoundingClientRect().left)) / 2 - 4 * rem(); };
    const openTl = gsap.timeline({ paused: true, defaults: { ease: soft } })
      // на телефоне слова стоят друг под другом: «Что» уходит к верху экрана, «Могу» к низу, описание встаёт между ними
      .to('.big__w--1', mob ? { y: () => Math.max(vh() * .1, 11 * rem()) - (vh() * .5 - innerWidth * .24), duration: 1.1 } : { x: () => bigShift() - 14.9 * rem(), duration: 1.1 }, 0)
      // «Могу» поднимаем над кнопкой, но на низких экранах не выше описания
      .to('.big__w--2', mob ? { y: () => vh() * .5 - clamp(vh() - 44 * rem() - innerWidth * .24, 12 * rem(), 18 * rem()) - innerWidth * .2384, duration: 1.1 } : { x: () => bigShift() + 60.7 * rem(), duration: 1.1 }, 0)
      .to('.big__in', { color: '#d2d2d2', duration: .8 }, .1)
      .to(desc, { yPercent: 0, duration: .9, stagger: .06, ease: out }, .4);
    let opened = false;
    strip = $('.strip');
    const dist = () => strip.scrollWidth - innerWidth;
    // после того как слова разъехались, рендер начинает выезжать со следующим движением, и в конце нет пустого шага
    // REST — пауза после готового рендера на компьютере, чтобы его успели рассмотреть до перехода к кейсам;
    // на планшете такой пустой прокрутки быть не должно
    const HOLD = mob ? 1.2 : 1.35, FIN = .6, REST = touch ? 0 : 1, PAN = mob ? 1.2 : 1.25;
    const st = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.services', start: 'top top', end: () => '+=' + (vh() * (HOLD + FIN + REST) + dist() * PAN), pin: true, scrub: .6, invalidateOnRefresh: true, onRefresh: measureRender,
        onUpdate: s => {
          // открываем после 3% экрана, а собираем только у самого верха: иначе дрожание пальца у порога заставляло заголовок мигать
          const d = s.progress * (s.end - s.start);
          const on = opened ? d > 2 : d > vh() * 0.03;
          if (on !== opened) { opened = on; on ? whenPixDone(() => opened && openTl.timeScale(1).play()) : openTl.timeScale(2).reverse(); }
          // вернулись к самому началу блока движением вверх — сразу уходим назад, к «Для кого?»: иначе нужен ещё один лишний свайп
          if (s.direction < 0 && d < vh() * 0.04) startPixels(s.trigger, -1, () => scrollY < s.start + vh() * 0.04);
        },
      },
    });
    st.to({}, { duration: HOLD }, 0)
      .to(strip, { x: () => -dist(), duration: () => dist() / vh() * PAN }, HOLD)
      .to(fin, { f: 1, duration: FIN })
      .to({}, { duration: REST });
    servicesST = st.scrollTrigger;
    } else {
      // телефон: вместо сцены с рендером обычный блок — заголовок, подзаголовок и слайдер карточек услуг
      reveal(splitChars(splitLines($('.svc__title'))), '.services', 'top 60%');
      const svcText = $$('.svc__kicker, .svc__lead');
      const svcCards = $$('.svc-card');
      // карточки поднимаются снизу, а не въезжают сбоку: сдвиг вбок расширял ленту,
      // и прилипание карточек пересчитывалось прямо во время прокрутки — лента дёргалась
      const hideSvc = () => { gsap.set(svcText, { y: 24, opacity: 0, overwrite: true }); gsap.set(svcCards, { y: 40, opacity: 0, overwrite: true }); };
      hideSvc();
      ScrollTrigger.create({
        trigger: '.services', start: 'top 60%', end: 'max',
        onEnter: () => {
          const now = underPix();
          gsap.to(svcText, { y: 0, opacity: 1, duration: now ? 0 : .7, stagger: now ? 0 : .08, ease: out, overwrite: true });
          // видны только первые две карточки, остальные ставим сразу, чтобы не гонять анимацию за экраном
          gsap.to(svcCards.slice(0, 2), { y: 0, opacity: 1, duration: now ? 0 : .8, stagger: now ? 0 : .1, delay: now ? 0 : .25, ease: out, overwrite: true });
          gsap.set(svcCards.slice(2), { y: 0, opacity: 1, overwrite: true });
        },
        onLeaveBack: hideSvc,
      });
    }

    // кейсы лесенкой уходят вверх по диагонали; на телефоне они друг под другом, и сдвиг их бы склеил
    if (!mob) $$('.case').forEach((c, i) => {
      // в момент, когда блок встал к началу, сдвига нет: все три кейса целиком в экране
      gsap.fromTo(c, { y: 0 }, {
        y: () => -(i + 1) * 3 * rem(), ease: 'none',
        scrollTrigger: { trigger: '.cases', start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      });
    });
    // кейсы открываются снизу вверх по очереди, фото внутри чуть приближено и встаёт на место
    const casesIn = { trigger: '.cases', start: 'top 55%', toggleActions: 'play none none reverse' };
    if (mob) {
      // на телефоне каждый кейс открывается сам, когда до него долистали
      $$('.case').forEach(c => {
        const one = { trigger: c, start: 'top 88%', toggleActions: 'play none none reverse' };
        gsap.fromTo(c, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.1, ease: soft, scrollTrigger: { ...one } });
        gsap.fromTo($('.case__media', c), { scale: 1.25 }, { scale: 1, duration: 1.5, ease: out, scrollTrigger: { ...one } });
        gsap.fromTo($$('.case__name, .case__num, .case__more', c), { y: () => 3 * rem(), opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .07, delay: .45, ease: out, scrollTrigger: { ...one } });
      });
    } else {
      gsap.fromTo('.case', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.1, stagger: .14, ease: soft, scrollTrigger: { ...casesIn } });
      gsap.fromTo('.case__media', { scale: 1.25 }, { scale: 1, duration: 1.5, stagger: .14, ease: out, scrollTrigger: { ...casesIn } });
      gsap.fromTo('.case__name, .case__num', { y: () => 3 * rem(), opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .07, delay: .45, ease: out, scrollTrigger: { ...casesIn } });
    }
    // свечение загорается под карточками, когда они уже появились
    gsap.fromTo('.cases__glow', { opacity: 0, scale: .7 }, { opacity: 1, scale: 1, duration: 1.6, delay: 1, ease: soft, scrollTrigger: { ...casesIn } });

    // отзывы
    reveal(revTitle, '.reviews', 'top 70%');
    ScrollTrigger.create({ trigger: '.reviews', start: 'top 70%', once: true, onEnter: watchChat });
    // блок отзывов ровно в экран, поэтому без короткой остановки футер начинал бы въезжать сразу, как только отзывы встали на место
    {
      // блок встаёт на экран, и переписку листает прокрутка страницы, где бы ни был курсор; после последнего сообщения едем к футеру
      const feedMax = () => Math.max(0, feed.scrollHeight - feed.clientHeight);
      ScrollTrigger.create({
        trigger: '.reviews', start: 'top top', end: () => '+=' + (feedMax() + vh() * 0.9), pin: true, invalidateOnRefresh: true,
        onUpdate: s => { feed.scrollTop = clamp(s.scroll() - s.start - vh() * 0.05, 0, feedMax()); },
      });
      $$('.msg__photo').forEach(img => img.complete || img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true }));
    }

    // футер
    reveal(footTitle, '.footer', 'top 55%');
    gsap.fromTo('.footer__nikita', { yPercent: 14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    ScrollTrigger.create({
      trigger: '.footer', start: 'top 85%',
      onEnter: () => { footerVisible = true; cta.classList.add('is-gone'); head.classList.add('is-gone'); if (head.classList.contains('is-big')) closeHead(); },
      onLeaveBack: () => { footerVisible = false; cta.classList.remove('is-gone'); head.classList.remove('is-gone'); },
    });

    // заливка клетками осталась только там, где листают мышью или трекпадом:
    // на телефоне и планшете она отбирала прокрутку и прыгала страницей, поэтому блоки просто проезжают друг за другом
    if (!touch) pixelSections.forEach(sec => {
      // на таче переход начинается заранее: край следующего блока ещё на 25% экрана ниже, чтобы его кусок не мелькал
      ScrollTrigger.create({ trigger: sec, start: () => touch ? 'top bottom+=' + Math.round(vh() * .25) : 'top bottom-=2', onEnter: self => startPixels(sec, 1, () => scrollY >= self.start) });
      // точку считаем числом от верха блока: у закреплённого блока запись 'top top' ScrollTrigger переносит за конец его сцены
      ScrollTrigger.create({ start: () => {
        const box = sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec;
        const top = box.getBoundingClientRect().top + scrollY;
        return top - 2;
      }, onLeaveBack: self => startPixels(sec, -1, () => scrollY < self.start) });
    });

    // подсказка «листай вниз» уходит с первым же движением страницы и больше не возвращается
    const hint = $('.hint');
    if (hint) {
      const dropHint = () => { hint.classList.add('is-gone'); removeEventListener('scroll', dropHint); removeEventListener('touchmove', dropHint); };
      addEventListener('scroll', dropHint, { passive: true, once: false });
      addEventListener('touchmove', dropHint, { passive: true });
    }

    ScrollTrigger.refresh();
    if (!lastWheel) startTop();
    // тяжёлые картинки декодируем заранее, пока человек смотрит первый экран, чтобы на стыке блоков не было рывка
    setTimeout(() => $$('.render__img, .case img').forEach(img => img.decode && img.decode().catch(() => {})), 1500);
  });

  // карточки «для кого»: градиент обводки поворачивается за курсором
  $$('.card').forEach(card => {
    const setA = gsap.quickTo(card, '--a', { duration: .6, ease: 'power3.out' });
    card.addEventListener('pointerenter', () => card.classList.add('is-hover'));
    card.addEventListener('pointerleave', () => { card.classList.remove('is-hover'); setA(135); });
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      setA(Math.atan2(y - r.height / 2, x - r.width / 2) * 180 / Math.PI + 90);
    });
  });
  gsap.set('.card', { '--a': 135 });

  /* ---------- Якоря ---------- */
  function goTo(hash) {
    const at = (st, k) => st.start + (st.end - st.start) * k;
    // переход по меню сразу открывает раздел: долгая прокрутка проигрывала по пути анимации всех блоков
    if (hash === '#top') return lenis.scrollTo(0, { immediate: true });
    if (heroST && hash === '#pochemu') return lenis.scrollTo(at(heroST, 2.9 / SCENE_LEN), { immediate: true });
    if (mob && hash === '#dlya-kogo') return lenis.scrollTo($('.who-sec'), { immediate: true });
    if (heroST && hash === '#dlya-kogo') return lenis.scrollTo(at(heroST, (HERO_LEN - .05) / HERO_LEN), { immediate: true });
    if (servicesST && hash === '#uslugi') return lenis.scrollTo(servicesST.start + vh() * 0.1, { immediate: true });
    const el = $(hash);
    if (el) lenis.scrollTo(el, { immediate: true });
  }
  // при переходе по меню пиксельные заливки по пути не запускаются
  $$('[data-scroll]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    if (mob && navOpen) setNav(false);
    if (pixRun || pixHold) return;
    navigating = true;
    clearTimeout(goTo.t);
    goTo.t = setTimeout(() => { navigating = false; }, 400);
    goTo(a.getAttribute('href'));
  }));
  // номер телефона: сначала спрашиваем, потом звоним (на айфоне браузер сам показывает такое окно)
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  $$('a[href^="tel:"]').forEach(a => a.addEventListener('click', e => {
    if (iOS) return;
    e.preventDefault();
    const num = a.getAttribute('href').slice(4);
    if (confirm('Позвонить Никите?\n' + (a.textContent.trim() || num))) location.href = 'tel:' + num;
  }));
  $$('[data-todo]').forEach(a => a.addEventListener('click', e => e.preventDefault()));
  if (reduced) gsap.globalTimeline.timeScale(1.5);
})();
