// Прелоудер «глазок»: видео двери, проценты и подписи, которые сменяются по буквам, как заголовки сайта
(() => {
  const entry = document.querySelector('#entry');
  let done;
  window.entryDone = new Promise(r => { done = r; });
  // прелоудер показывается один раз на вкладку: при повторном открытии или перезагрузке сайт открывается сразу
  if (entry.hidden || sessionStorage.getItem('entered')) {
    entry.hidden = true;
    document.documentElement.classList.remove('entering');
    done();
    return;
  }
  sessionStorage.setItem('entered', '1');
  const film = entry.querySelector('video');
  const caption = entry.querySelector('.entry-caption');
  const line = caption.querySelector('.entry-line');
  const counter = caption.querySelector('output');
  const ease = 'cubic-bezier(.32, 0, .12, 1)';
  let frame, exitStarted, current = '', busy = null;
  // запасной выход, если сеть совсем плохая: прелоудер ждёт готовности первого экрана, но не дольше 15 секунд
  const deadline = setTimeout(finish, 15000);
  let watched = false;
  const chars = t => [...t].map(c => `<span class="ch">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  // старая подпись уходит вверх по буквам, новая въезжает снизу — как тексты на первом экране
  function setLine(t) {
    if (t === current) return;
    current = t;
    const old = line.querySelectorAll('.ch');
    const show = () => {
      line.innerHTML = chars(t);
      line.querySelectorAll('.ch').forEach((c, i) => c.animate([{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 520, delay: i * 18, easing: ease, fill: 'backwards' }));
    };
    if (!old.length) return show();
    clearTimeout(busy);
    old.forEach((c, i) => c.animate([{ transform: 'none' }, { transform: 'translateY(-110%)' }], { duration: 300, delay: i * 10, easing: 'cubic-bezier(.55, 0, 1, .45)', fill: 'forwards' }));
    busy = setTimeout(show, 300 + old.length * 10);
  }
  function finish() {
    if (entry.hidden) return;
    clearTimeout(deadline);
    cancelAnimationFrame(frame);
    film.pause();
    entry.hidden = true;
    document.documentElement.classList.remove('entering');
    done();
  }
  film.addEventListener('error', finish);
  function tick(now) {
    if (entry.hidden) return;
    const seen = Math.min(1, film.currentTime / 3.25);
    if (seen === 1) watched = true;
    entry.classList.toggle('is-wait', watched && !exitStarted);
    // сайт готов, когда загружены первые кадры и шрифты и главный скрипт расставил первый экран (html.is-ready)
    const load = Math.min(window.siteLoad || 0, document.documentElement.classList.contains('is-ready') ? 1 : .95);
    // если загрузка отстаёт, видео замедляется, а не замирает на глазке
    const rate = seen > load + .08 ? .35 : 1;
    if (film.playbackRate !== rate) film.playbackRate = rate;
    const progress = Math.min(watched ? 1 : seen, load);
    const percent = Math.floor(progress * 100);
    counter.textContent = percent + '%';
    setLine(percent < 26 ? 'Стучимся…' : percent < 53 ? 'Ждём у двери…' : percent < 82 ? 'Слышишь шаги?' : 'Свои! Заходи.');
    if (progress === 1 && exitStarted === undefined) exitStarted = now;
    if (exitStarted) {
      const t = Math.min(1, (now - exitStarted) / 840);
      const radius = Math.hypot(innerWidth, innerHeight) * .55 * t * t;
      const softness = Math.min(radius, 2 + radius * .08);
      const mask = 'radial-gradient(circle at center, transparent ' + (radius - softness) + 'px, black ' + (radius + softness) + 'px)';
      entry.style.maskImage = entry.style.webkitMaskImage = mask;
      caption.style.opacity = Math.max(0, 1 - t * 3);
      if (t === 1) return finish();
    }
    frame = requestAnimationFrame(tick);
  }
  film.play().then(() => { if (!entry.hidden) frame = requestAnimationFrame(tick); }).catch(finish);
})();
