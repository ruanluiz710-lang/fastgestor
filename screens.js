/* Telas do FastGestor recriadas com DADOS FICTÍCIOS (lojas, valores e gráficos inventados). */
(function () {
  var BLUE = '#1D4ED8', GREEN = '#0F9D6B', RED = '#DC2626', ORANGE = '#F97316', PURPLE = '#7C3AED';

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // Série diária fictícia com picos de fim de semana
  function daily(seed, base, amp, days) {
    var r = rng(seed), out = [];
    for (var i = 0; i < days; i++) {
      var wk = (i % 7 === 5 || i % 7 === 6) ? 1.35 : 1;
      out.push(Math.max(base * .35, base * wk + (r() - .5) * amp));
    }
    return out;
  }
  function fmtK(v) { return 'R$' + (v >= 1000000 ? (v / 1000000) + 'M' : Math.round(v / 1000) + 'k'); }
  function fmtN(v) { return Math.round(v).toLocaleString('pt-BR'); }
  function fmtR(v) { return 'R$' + Math.round(v).toLocaleString('pt-BR'); }

  /* ---------- gráficos SVG ---------- */
  function smooth(pts) {
    var d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return d;
  }
  function chart(o) {
    var L = 52, R = 10, T = 6, B = o.xrot ? 50 : 22, iw = o.w - L - R, ih = o.h - T - B, n = o.cats.length;
    var y = function (v) { return T + ih - Math.max(0, Math.min(1, v / o.max)) * ih; };
    var step = iw / n, s = '<svg viewBox="0 0 ' + o.w + ' ' + o.h + '" width="' + o.w + '" height="' + o.h + '">';
    for (var i = 0; i <= o.ticks; i++) {
      var v = o.max * i / o.ticks, yy = y(v).toFixed(1);
      s += '<line x1="' + L + '" x2="' + (o.w - R) + '" y1="' + yy + '" y2="' + yy + '" stroke="#ECEEF4"/>' +
           '<text x="' + (L - 6) + '" y="' + (+yy + 3) + '" text-anchor="end" class="ax">' + o.fmt(v) + '</text>';
    }
    var every = o.every || 1;
    o.cats.forEach(function (c, i) {
      if (i % every) return;
      var cx = L + step * (i + .5), ty = o.h - B + 14;
      s += o.xrot
        ? '<text x="' + cx + '" y="' + ty + '" text-anchor="end" class="ax" transform="rotate(-22 ' + cx + ' ' + ty + ')">' + c + '</text>'
        : '<text x="' + cx + '" y="' + ty + '" text-anchor="middle" class="ax">' + c + '</text>';
    });
    var bars = o.series.filter(function (x) { return x.type === 'bar'; });
    var bw = Math.min(o.barW || 36, step * .8 / Math.max(1, bars.length));
    bars.forEach(function (sr, bi) {
      sr.data.forEach(function (val, i) {
        var cx = L + step * (i + .5), x = cx - bars.length * bw / 2 + bi * bw, top = y(val);
        var col = sr.colors ? sr.colors[i] : sr.color;
        s += '<rect x="' + x.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + (bw - (bars.length > 1 ? 2 : 0)).toFixed(1) + '" height="' + (T + ih - top).toFixed(1) + '" rx="3" fill="' + (sr.light ? sr.light : col) + '"' + (sr.light ? ' stroke="' + col + '" stroke-width="1.4"' : '') + '/>';
      });
    });
    o.series.filter(function (x) { return x.type === 'line'; }).forEach(function (sr) {
      var pts = sr.data.map(function (val, i) { return [L + step * (i + .5), y(val)]; });
      var d = smooth(pts);
      if (sr.fill) s += '<path d="' + d + 'L' + pts[pts.length - 1][0] + ',' + (T + ih) + 'L' + pts[0][0] + ',' + (T + ih) + 'Z" fill="' + sr.fill + '"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + sr.color + '" stroke-width="2"/>';
      if (sr.dots) pts.forEach(function (p) { s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="' + sr.color + '"/>'; });
    });
    return s + '</svg>';
  }
  function legend(items) {
    return '<div class="legend">' + items.map(function (i) { return '<span><i style="background:' + i[1] + '"></i>' + i[0] + '</span>'; }).join('') + '</div>';
  }
  function ring(parts, size, thick) {
    var r = (size - thick) / 2, C = 2 * Math.PI * r, off = 0, s = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><g transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')">';
    parts.forEach(function (p) {
      var len = C * p[0] / 100;
      s += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + p[1] + '" stroke-width="' + thick + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>';
      off += len;
    });
    return s + '</g></svg>';
  }

  /* ---------- blocos de interface ---------- */
  var ICONS = {
    moon: '<path d="M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10z"/>',
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    bag: '<path d="M6 7h12l1 13H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    truck: '<path d="M2 6h11v9H2zM13 9h5l3 3v3h-8z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    box: '<path d="M12 3l9 4.5v9L12 21l-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
    chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M9 13h6M9 17h6"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'
  };
  function ico(name, on) { return '<div class="scr-ico' + (on ? ' on' : '') + '"><svg viewBox="0 0 24 24">' + ICONS[name] + '</svg></div>'; }
  function side(active) {
    return '<div class="scr-side"><div class="scr-logo">3C</div>' + ico('moon') + '<div class="scr-sep"></div>' +
      ico('home', active === 'home') + '<div class="scr-sep"></div>' + ico('bag', active === 'vendas') + ico('truck', active === 'compras') +
      ico('box', active === 'estoque') + ico('chart', active === 'fin') + '<div class="scr-sep"></div>' +
      ico('doc', active === 'r1') + ico('doc', active === 'r2') + ico('doc', active === 'r3') +
      '<div class="scr-grow"></div>' + ico('chat') + ico('gear') + '</div>';
  }
  function top(title, meta) { return '<div class="scr-top"><h4>' + title + '</h4><div class="meta">' + meta + '</div></div>'; }
  var PERIOD = '<span>01/09/2026 a 30/09/2026</span><span class="btn-out">🔍 Filtros</span>';
  function kpi(icon, tile, label, value, sub, cls) {
    return '<div class="kpi"><div class="ic ' + tile + '">' + icon + '</div><div><div class="lb">' + label + '</div><div class="vl ' + (cls || 'dark') + '">' + value + '</div><div class="sb">' + sub + '</div></div></div>';
  }
  function kpis(n, items) { return '<div class="kpis c' + n + '">' + items.join('') + '</div>'; }
  function box(label, text, cls) { return '<div class="fld">' + label + '<div class="box ' + (cls || '') + '">' + text + '</div></div>'; }
  function dates() {
    return box('Data Inicial', '01/09/2026', 'date') + box('Data Final', '30/09/2026', 'date') +
      '<div class="preset"><span>Hoje</span><span>Semana</span><span class="on">Mês</span><span>Mês ant</span><span>Ano</span></div><div class="fsep"></div>';
  }
  function btns() { return '<div class="fbtns"><span class="a">Aplicar</span><span class="l">Limpar</span></div>'; }
  function card(title, sub, inner, extra) { return '<div class="cardc"><h6>' + title + '</h6>' + (sub ? '<small>' + sub + '</small>' : '') + inner + (extra || '') + '</div>'; }
  function page(active, title, meta, body) {
    return '<div class="scr">' + side(active) + '<div class="scr-main">' + top(title, meta) + '<div class="scr-body">' + body + '</div></div></div>';
  }

  /* ---------- dados fictícios ---------- */
  var LOJAS = ['Loja Centro', 'Shopping Norte', 'Loja Sul', 'Outlet', 'Loja Online'];
  var LOJA_COLORS = [BLUE, GREEN, PURPLE, ORANGE, RED];
  var D30 = [], i;
  for (i = 1; i <= 30; i++) D30.push(i < 10 ? '0' + i + '/09' : i + '/09');
  var VENDA_DIA = daily(7, 14500, 8000, 30);
  var COMPRA_DIA = VENDA_DIA.map(function (_, i) { return [4, 9, 15, 22].indexOf(i) >= 0 ? 18000 + i * 400 : 0; });

  var SCREENS = {
    dashboard: function () {
      var meses = ['Abr/26', 'Mai/26', 'Jun/26', 'Jul/26', 'Ago/26', 'Set/26'];
      return page('home', 'Dashboard', '<span>21/09/2026</span><span class="pill-live">● Ao vivo</span>',
        '<div class="hello"><div><h5>Olá, Lojista 👋</h5><p>Resumo de 21/09/2026</p></div><span class="btn-blue">▥ Ver Vendas Completo</span></div>' +
        kpis(5, [
          kpi('💰', 't-blue', 'Faturamento do Mês', 'R$ 482,6 Mil', '<span class="green">↑ 6,5% vs mês ant.</span>', 'blue'),
          kpi('🛍️', 't-green', 'Total de Vendas', '1.842', '<span class="green">↑ 4,7% vs mês ant.</span>', 'green'),
          kpi('📊', 't-purple', 'Ticket Médio', 'R$ 262,00', 'por venda'),
          kpi('📈', 't-orange', 'Margem Bruta', '46,8%', 'lucro / faturamento'),
          kpi('👥', 't-yellow', 'Clientes Ativos', '1.312', 'no mês')
        ]) +
        '<div class="grid2">' +
        card('Faturamento — Últimos 6 Meses', 'Receita vs Lucro',
          chart({ w: 560, h: 250, cats: meses, max: 600000, ticks: 6, fmt: fmtK, barW: 66, series: [
            { type: 'bar', data: [398000, 421000, 405000, 437000, 453000, 482600], color: BLUE, light: '#E4EAFA' },
            { type: 'line', data: [183000, 194000, 187000, 201000, 208000, 225900], color: GREEN, fill: 'rgba(15,157,107,.12)', dots: true }] }),
          legend([['Faturamento', BLUE], ['Lucro', GREEN]])) +
        card('Qtd. Vendas x Itens Vendidos', 'Últimos 6 Meses',
          chart({ w: 400, h: 250, cats: meses, max: 3200, ticks: 4, fmt: fmtN, barW: 26, series: [
            { type: 'bar', data: [1520, 1610, 1560, 1690, 1760, 1842], color: BLUE },
            { type: 'bar', data: [2410, 2580, 2490, 2700, 2830, 2940], color: GREEN }] }),
          legend([['Qtd. Vendas', BLUE], ['Itens Vendidos', GREEN]])) +
        '</div>');
    },

    vendas: function () {
      return page('vendas', 'Dashboard de Vendas', PERIOD,
        '<div class="filters"><div class="frow">' + dates() + box('Loja', 'Todas', 'wide') + box('Marca', 'Todas', 'wide') + box('Departamento', 'Todos') + box('Grupo', 'Todos') + btns() + '</div></div>' +
        kpis(6, [
          kpi('💰', 't-blue', 'Faturamento', 'R$ 482,6 Mil', 'R$ 482.604,00', 'blue'),
          kpi('🛍️', 't-green', 'Total Vendas', '1.842', '2.940 itens', 'green'),
          kpi('🎟️', 't-purple', 'Ticket Médio', 'R$ 262,00', '1,60 itens/venda'),
          kpi('📈', 't-orange', 'Margem Bruta', '46,8%', 'R$ 225,9 Mil lucro'),
          kpi('👥', 't-yellow', 'Clientes', '1.312', 'no período'),
          kpi('🏷️', 't-red', 'Total Desconto', 'R$ 11,4 Mil', '2,4% do fat.', 'red')
        ]) +
        '<div class="grid2">' +
        card('Faturamento Diário', '01/09/2026 a 30/09/2026', chart({ w: 640, h: 190, cats: D30, every: 3, max: 30000, ticks: 6, fmt: fmtK, series: [{ type: 'line', data: VENDA_DIA, color: BLUE, fill: 'rgba(29,78,216,.1)', dots: true }] })) +
        card('Faturamento por Loja', '', chart({ w: 400, h: 190, cats: LOJAS.map(function (l) { return l.replace('Loja ', ''); }), max: 200000, ticks: 4, fmt: fmtK, barW: 44, series: [{ type: 'bar', data: [168000, 132000, 96000, 54000, 33000], color: BLUE, colors: LOJA_COLORS }] })) +
        '</div>');
    },

    compras: function () {
      return page('compras', 'Compras — Pedidos', PERIOD,
        '<div class="filters"><div class="frow">' + dates() + box('Loja', 'Todas', 'wide') + box('Marca', 'Todas', 'wide') + box('Departamento', 'Todos') + box('Grupo', 'Todos') + btns() + '</div></div>' +
        kpis(3, [
          kpi('💰', 't-blue', 'TOTAL COMPRADO', 'R$ 96,4 Mil', 'R$ 96.412,50', 'blue'),
          kpi('📥', 't-green', 'PEDIDOS NO PERÍODO', '14', 'no período', 'green'),
          kpi('📦', 't-yellow', 'ITENS COMPRADOS', '1.120', '80,00 itens/pedido')
        ]) +
        '<div class="grid2">' +
        card('Compra Diária', '01/09/2026 a 30/09/2026', chart({ w: 640, h: 200, cats: D30, every: 3, max: 40000, ticks: 4, fmt: fmtK, series: [{ type: 'bar', data: COMPRA_DIA, color: BLUE }] })) +
        card('Compra por Loja', '', chart({ w: 400, h: 200, cats: LOJAS.map(function (l) { return l.replace('Loja ', ''); }), max: 40000, ticks: 4, fmt: fmtK, barW: 44, series: [{ type: 'bar', data: [32000, 26000, 21000, 12000, 5400], color: '#3B78F0' }] })) +
        '</div>');
    },

    estoque: function () {
      var tam = ['38', '39', '37', '40', '36', '41', 'M', 'P', '42', 'G', '35', 'GG', '43', '34', 'U'];
      var qtd = [1180, 1120, 1040, 980, 910, 850, 790, 740, 690, 640, 560, 520, 470, 380, 300];
      return page('estoque', 'Estoque — Posição', '<span class="btn-out">🔍 Filtros</span>',
        '<div class="filters"><div class="frow">' + box('Loja', 'Todas') + box('Marca', 'Todas') + box('Departamento', 'Todos') + box('Grupo', 'Todos', 'wide') + box('Subgrupo', 'Todos', 'xl') + '</div>' +
        '<div class="frow">' + box('Cor', 'Todas', 'xl') + box('Tamanho', 'Todos') + box('Referência', 'Buscar referência...', 'wide') + btns() + '</div></div>' +
        kpis(5, [
          kpi('📦', 't-blue', 'Estoque Total', '12.840', 'unidades', 'blue'),
          kpi('💰', 't-green', 'Valor em Estoque (custo)', 'R$ 1,9 Mi', 'R$ 1.912.400,00', 'green'),
          kpi('🏷️', 't-purple', 'Valor Potencial (venda)', 'R$ 4,3 Mi', 'R$ 4.286.900,00'),
          kpi('📜', 't-yellow', 'Produtos Distintos', '2.416', '15.380 SKUs'),
          kpi('🔥', 't-blue', 'Em Promoção', '1.208', 'itens ativos')
        ]) +
        '<div class="grid2 even">' +
        card('Valor em Estoque por Loja', '', chart({ w: 520, h: 200, cats: LOJAS.map(function (l) { return l.replace('Loja ', ''); }), max: 600000, ticks: 6, fmt: fmtK, barW: 46, series: [{ type: 'bar', data: [520000, 470000, 410000, 300000, 212000], color: BLUE, colors: LOJA_COLORS }] })) +
        card('Top 15 Tamanhos por Quantidade em Estoque', '', chart({ w: 520, h: 200, cats: tam, max: 1400, ticks: 7, fmt: fmtN, barW: 20, series: [{ type: 'bar', data: qtd, color: GREEN }] })) +
        '</div>');
    },

    'contas-pagar': function () {
      var v = daily(21, 9000, 9000, 30).map(function (x, i) { return [4, 13, 22].indexOf(i) >= 0 ? 42000 + i * 700 : x * .6; });
      return page('fin', 'Contas a Pagar', PERIOD,
        '<div class="filters"><div class="frow">' + dates() + box('Loja', 'Todas', 'xl') + box('Situação', 'Todos') + '</div><div class="frow">' + box('Fornecedor', 'Todos', 'xl') + btns() + '</div></div>' +
        kpis(5, [
          kpi('📜', 't-red', 'Total a Pagar', 'R$ 318,5 Mil', '412 lançamentos', 'red'),
          kpi('✅', 't-green', 'Pago', 'R$ 241,2 Mil', 'no período', 'green'),
          kpi('🕒', 't-yellow', 'Em Aberto', 'R$ 62,7 Mil', 'a vencer'),
          kpi('⏰', 't-orange', 'Atrasado', 'R$ 14,6 Mil', 'vencidos', 'orange'),
          kpi('📈', 't-purple', 'Juros', 'R$ 128,40', 'no período')
        ]) +
        '<div class="grid2">' +
        card('Contas a Pagar por Vencimento', '01/09/2026 a 30/09/2026', chart({ w: 640, h: 190, cats: D30, every: 3, max: 60000, ticks: 4, fmt: fmtK, series: [{ type: 'line', data: v, color: RED, fill: 'rgba(220,38,38,.1)', dots: true }] })) +
        card('Situação', '', '<div class="donut-wrap">' + ring([[4.6, RED], [75.7, GREEN], [19.7, ORANGE]], 150, 34) + '<div class="dl"><div><i style="background:' + RED + '"></i>Atrasado</div><div><i style="background:' + GREEN + '"></i>Pago</div><div><i style="background:' + ORANGE + '"></i>Aberto</div></div></div>') +
        '</div>');
    },

    'contas-receber': function () {
      var v = daily(33, 2600, 3400, 30);
      return page('fin', 'Contas a Receber', PERIOD,
        '<div class="filters"><div class="frow">' + dates() + box('Loja', 'Todas', 'xl') + box('Situação', 'Todos') + '</div><div class="frow">' + box('Cliente', 'Todos', 'xl') + btns() + '</div></div>' +
        kpis(5, [
          kpi('💵', 't-green', 'Total a Receber', 'R$ 87,4 Mil', '236 lançamentos', 'green'),
          kpi('📥', 't-blue', 'Recebido', 'R$ 52,9 Mil', 'no período', 'blue'),
          kpi('🕒', 't-yellow', 'Em Aberto', 'R$ 24,1 Mil', 'a vencer'),
          kpi('⏰', 't-orange', 'Atrasado', 'R$ 10,4 Mil', 'vencidos', 'orange'),
          kpi('📈', 't-purple', 'Juros', 'R$ 86,90', 'no período')
        ]) +
        '<div class="grid2">' +
        card('Contas a Receber por Vencimento', '01/09/2026 a 30/09/2026', chart({ w: 640, h: 190, cats: D30, every: 3, max: 6000, ticks: 6, fmt: fmtK, series: [{ type: 'line', data: v, color: GREEN, fill: 'rgba(15,157,107,.1)', dots: true }] })) +
        card('Situação', '', '<div class="donut-wrap">' + ring([[11.9, RED], [60.5, GREEN], [27.6, ORANGE]], 150, 34) + '<div class="dl"><div><i style="background:' + RED + '"></i>Atrasado</div><div><i style="background:' + GREEN + '"></i>Pago</div><div><i style="background:' + ORANGE + '"></i>Aberto</div></div></div>') +
        '</div>');
    },

    'compra-venda-estoque': function () {
      var lojas = LOJAS.map(function (l) { return l.replace('Loja ', ''); });
      return page('r3', 'Compra x Venda x Estoque', PERIOD,
        kpis(5, [
          kpi('🛒', 't-blue', 'Total Vendido', 'R$ 482,6 Mil', 'no período', 'blue'),
          kpi('📥', 't-purple', 'Total Comprado', 'R$ 96,4 Mil', 'no período'),
          kpi('📦', 't-green', 'Estoque Atual', 'R$ 1,9 Mi', 'valor de custo, agora', 'green'),
          kpi('🔄', 't-blue', 'Giro de Estoque', '0,25x', 'vendido ÷ estoque'),
          kpi('⚖️', 't-green', 'Saldo Venda – Compra', 'R$ 386,2 Mil', 'vendendo mais que compra', 'green')
        ]) +
        '<div class="grid2">' +
        card('Compra Diária x Venda Diária', '01/09/2026 a 30/09/2026',
          chart({ w: 640, h: 190, cats: D30, every: 3, max: 100000, ticks: 5, fmt: fmtK, series: [
            { type: 'line', data: VENDA_DIA, color: GREEN, fill: 'rgba(15,157,107,.1)' },
            { type: 'line', data: COMPRA_DIA.map(function (x) { return x * .8; }), color: BLUE, fill: 'rgba(29,78,216,.1)' }] }),
          legend([['Venda', GREEN], ['Compra', BLUE]])) +
        card('Comprado x Vendido x Estoque por Loja', '',
          chart({ w: 400, h: 190, cats: lojas, xrot: true, max: 600000, ticks: 6, fmt: fmtK, barW: 16, series: [
            { type: 'bar', data: [168000, 132000, 96000, 54000, 33000], color: GREEN },
            { type: 'bar', data: [32000, 26000, 21000, 12000, 5400], color: BLUE },
            { type: 'bar', data: [520000, 470000, 410000, 300000, 212000], color: ORANGE }] }),
          legend([['Vendido', GREEN], ['Comprado', BLUE], ['Estoque', ORANGE]])) +
        '</div>');
    },

    'ia-chat': function () {
      var chips = [
        ['📊', 'Quanto vendi hoje?'],
        ['📦', 'Estoque de um produto'],
        ['🛒', 'Carrinho de compras para um cliente'],
        ['💰', 'Contas a pagar em aberto'],
        ['🏆', 'Meus melhores clientes do mês']
      ];
      return '<div class="scr ia-scr"><div class="ia-wrap">' +
        '<div class="ia-body">' +
          '<h5>Como posso ajudar hoje?</h5>' +
          '<p>Pergunte sobre vendas, estoque, clientes, financeiro e mais</p>' +
          '<div class="ia-chips">' + chips.map(function (c, i) {
            return '<span class="ia-chip' + (i === 0 ? ' ia-chip--demo' : '') + '">' + c[0] + ' ' + c[1] + '</span>';
          }).join('') +
          '</div>' +
        '</div>' +
        '<div class="ia-bar">' +
          '<div class="ia-input"><span class="ia-input-text">' +
            '<span class="ia-placeholder">Pergunte alguma coisa...</span>' +
            '<span class="ia-typed">' + chips[0][1] + '</span>' +
          '</span><i class="ia-resize">⋮</i></div>' +
          '<button class="ia-new">↺ Nova conversa</button>' +
          '<button class="ia-send">Enviar</button>' +
        '</div>' +
        '<div class="ia-cursor" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg></div>' +
      '</div></div>';
    },

    contabil: function () {
      var uf = [['SP - São Paulo', 520, '34,2', BLUE], ['MG - Minas Gerais', 210, '13,8', GREEN], ['RJ - Rio de Janeiro', 175, '11,5', PURPLE], ['PR - Paraná', 118, '7,8', ORANGE],
        ['RS - Rio Grande do Sul', 96, '6,3', RED], ['SC - Santa Catarina', 88, '5,8', '#B45309'], ['BA - Bahia', 72, '4,7', '#0E9AA7'], ['GO - Goiás', 64, '4,2', '#DB2777'],
        ['PE - Pernambuco', 55, '3,6', '#65A30D'], ['DF - Distrito Federal', 48, '3,2', '#0EA5E9']];
      var list = uf.map(function (u) { return '<div><i style="background:' + u[3] + '"></i>' + u[0] + '<b>' + u[1] + ' notas &nbsp; ' + u[2] + '%</b></div>'; }).join('');
      var parts = uf.map(function (u) { return [+u[2].replace(',', '.'), u[3]]; }); parts.push([5, '#D1D5DB']);
      return page('r2', 'Contábil', PERIOD,
        '<div class="tabs2"><span class="on">📄 Nota (NF-e)</span><span>⌨️ Cupom (NFC-e / SAT)</span></div>' +
        '<div class="filters"><div class="frow">' + dates() + box('Loja', '1 - Loja Centro', 'wide') + box('CFOP', 'Todos') + box('Estado', 'Todos') + box('Entrada/Saída', 'Todas') + '</div>' +
        '<div class="frow">' + box('Emissões/Cancelamentos', 'Todas', 'wide') + box('Nota / Venda / Chave', 'Número ou chave', 'wide') + btns() + '</div></div>' +
        kpis(4, [
          kpi('📤', 't-blue', 'NF-e Saída', 'R$ 401,8 Mil', '1.522 notas'),
          kpi('📥', 't-blue', 'NF-e Entrada', 'R$ 58,3 Mil', '96 notas'),
          kpi('📊', 't-yellow', 'Total', 'R$ 460,1 Mil', '1.618 documentos'),
          kpi('🚫', 't-red', 'Canceladas', 'R$ 1.240,00', '3 (já incluídas no Total)', 'red')
        ]) +
        card('NF-e de Saída Emitidas por Estado', 'quantidade de documentos — não é afetada pelos filtros Entrada/Saída, Emissões e Estado',
          '<div class="donut-wrap" style="justify-content:flex-start;gap:34px">' + ring(parts, 190, 95) + '<div class="pie-list">' + list + '</div></div>'));
    }
  };

  /* ---------- montagem e escala ---------- */
  function mount(el) {
    var build = SCREENS[el.getAttribute('data-screen')];
    if (!build) return;
    el.innerHTML = build();
    var scr = el.firstChild;
    function fit() { scr.style.transform = 'scale(' + (el.clientWidth / 1200) + ')'; }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(el);
    else window.addEventListener('resize', fit);
  }
  Array.prototype.forEach.call(document.querySelectorAll('.screen[data-screen]'), mount);
})();
