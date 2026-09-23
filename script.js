(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Menu mobile: painel + fundo escurecido, com trava de rolagem da página atrás
  var toggle = $('.menu-toggle'), nav = $('.nav'), overlay = $('.nav-overlay');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    overlay.classList.toggle('show', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  overlay.addEventListener('click', function () { setMenu(false); });
  $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  // Revelação ao rolar: dispara ~120px antes do elemento entrar na tela, para que
  // ele já esteja com opacidade final quando o usuário efetivamente o vê (mesmo
  // rolando rápido ou pulando direto para a seção via âncora).
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -120px 0px' });
  $$('.reveal, .chat').forEach(function (el) { io.observe(el); });

  // Contagem animada
  var counted = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target, end = +el.dataset.count, dur = 1600, t0 = performance.now();
      var prefix = el.dataset.prefix || '', suffix = el.dataset.suffix || '';
      (function tick(t) {
        var p = Math.min((t - t0) / dur, 1), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.textContent = prefix + v.toLocaleString('pt-BR') + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
      counted.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(function (el) { counted.observe(el); });

  // Módulos: ícones trocam a tela do aparelho (passa sozinho até o usuário interagir)
  var mBtns = $$('.mod-btn'), mScreens = $$('.dscreen'), mInfos = $$('.mod-info'), mCur = 0, mTimer;
  function mSet(i) {
    mCur = i;
    mBtns.forEach(function (b, k) { b.classList.toggle('active', k === i); });
    mScreens.forEach(function (s, k) { s.classList.toggle('active', k === i); });
    mInfos.forEach(function (s, k) { s.classList.toggle('active', k === i); });
  }
  function mStop() { clearInterval(mTimer); mTimer = null; }
  mBtns.forEach(function (b, i) {
    b.addEventListener('mouseenter', function () { mStop(); mSet(i); });
    b.addEventListener('click', function () { mStop(); mSet(i); });
  });
  new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting && !mTimer && !mBtns.some(function (b) { return b.dataset.touched; })) {
        mTimer = setInterval(function () { mSet((mCur + 1) % mBtns.length); }, 6000);
      } else if (!e.isIntersecting) { mStop(); }
    });
  }, { threshold: 0.4 }).observe($('.mod-nav'));
  mBtns.forEach(function (b) { b.addEventListener('click', function () { mBtns.forEach(function (x) { x.dataset.touched = 1; }); }); });

  // Vitrine de telas: abas com barra de progresso que avança sozinha.
  // A barra é controlada direto pelo JS (style inline + transition), em vez de
  // depender do evento "animationend" de uma @keyframes reiniciada por reflow —
  // esse truque podia falhar silenciosamente e travar o avanço automático.
  (function () {
    var box = $('.showcase'); if (!box) return;
    var tabs = $$('.sc-tab', box), slides = $$('.sc-slide', box), cur = 0, timer = null;
    var DURATION = 6000;

    function resetBars() {
      tabs.forEach(function (t, k) {
        var bar = $('.bar i', t);
        bar.style.transition = 'none';
        bar.style.width = (k === cur) ? '' : '0'; // '' = volta a depender do CSS (cheia se ativa)
      });
    }
    function fill(i) {
      var bar = $('.bar i', tabs[i]);
      bar.style.transition = 'none';
      bar.style.width = '0';
      void bar.offsetWidth; // força o navegador a aplicar o width:0 antes de animar
      bar.style.transition = 'width ' + DURATION + 'ms linear';
      bar.style.width = '100%';
    }
    function set(i) {
      cur = i;
      tabs.forEach(function (t, k) { t.classList.toggle('active', k === i); });
      slides.forEach(function (s, k) { s.classList.toggle('active', k === i); });
      resetBars();
    }
    function stop() { if (timer) { clearTimeout(timer); timer = null; } }
    function tick() { timer = setTimeout(function () { set((cur + 1) % tabs.length); fill(cur); tick(); }, DURATION); }
    function start() { if (timer) return; fill(cur); tick(); }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { stop(); set(i); start(); });
    });

    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
    }, { threshold: 0.3 }).observe(box);
  })();

  // FAQ
  $$('.faq-item').forEach(function (item) {
    var q = $('.faq-q', item), a = $('.faq-a', item);
    q.addEventListener('click', function () {
      var open = item.classList.toggle('open');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : 0;
      q.setAttribute('aria-expanded', open);
    });
  });

  // Chat com a IA: conversa animada de um cliente (dados fictícios)
  (function () {
    var chat = $('.chat'); if (!chat) return;
    var msgs = $('.chat-msgs', chat), typed = $('.chat-typed', chat), send = $('.chat-send', chat), caret = $('.chat-caret', chat);
    var convo = [
      ['Quanto faturei em setembro?', 'Em setembro, o faturamento foi de <b>R$ 482,6 mil</b>, em 1.842 vendas. É <b>6,5% acima</b> de agosto.'],
      ['Qual loja vendeu mais?', 'A <b>Loja Centro</b> lidera, com <b>R$ 168 mil</b>, seguida do Shopping Norte, com R$ 132 mil.'],
      ['Quanto tenho em contas atrasadas?', 'Você tem <b>R$ 14,6 mil</b> em contas a pagar atrasadas, de um total de R$ 318,5 mil no mês.'],
      ['Qual tamanho tem mais estoque?', 'O tamanho <b>38</b> lidera, com <b>1.180</b> unidades em estoque.']
    ];
    function bubble(cls, html) { var b = document.createElement('div'); b.className = 'bubble ' + cls; b.innerHTML = html; msgs.appendChild(b); return b; }
    function trim() { while (msgs.scrollHeight > msgs.clientHeight + 2 && msgs.children.length > 1) msgs.removeChild(msgs.firstChild); }

    var alive = false, token = 0, CANCEL = {};
    async function run(my) {
      // toda espera confere se esta execução ainda é a vigente; se não for, aborta (evita mensagens duplicadas)
      var w = function (ms) { return new Promise(function (res, rej) { setTimeout(function () { my === token ? res() : rej(CANCEL); }, ms); }); };
      try {
        while (true) {
          for (var i = 0; i < convo.length; i++) {
            var q = convo[i][0], a = convo[i][1];
            await w(600);
            for (var c = 1; c <= q.length; c++) { typed.textContent = q.slice(0, c); await w(38 + Math.random() * 30); }
            await w(350); send.classList.add('go'); await w(220);
            typed.textContent = ''; send.classList.remove('go');
            bubble('bubble--user', q); trim();
            await w(350);
            var dots = bubble('bubble--ai bubble--typing', '<i></i><i></i><i></i>'); trim();
            await w(1100);
            dots.className = 'bubble bubble--ai'; dots.innerHTML = '';
            var words = a.split(' ');
            for (var k = 1; k <= words.length; k++) { dots.innerHTML = words.slice(0, k).join(' '); trim(); await w(70); }
            await w(2200);
          }
          msgs.classList.add('fade'); await w(450);
          msgs.innerHTML = ''; msgs.classList.remove('fade');
        }
      } catch (e) { if (e !== CANCEL) throw e; }
    }
    function reset() { msgs.classList.remove('fade'); msgs.innerHTML = ''; typed.textContent = ''; send.classList.remove('go'); }
    // Só anima enquanto o chat está visível
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !alive) { alive = true; reset(); run(++token); }
        else if (!e.isIntersecting && alive) { alive = false; token++; reset(); }
      });
    }, { threshold: 0.35 }).observe(chat);
  })();

  // Voltar ao topo
  var top = $('.to-top');
  window.addEventListener('scroll', function () { top.classList.toggle('show', window.scrollY > 600); }, { passive: true });
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
})();



