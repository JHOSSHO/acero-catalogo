(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = window.SteelCalc;
  const profiles = window.STEEL_CATALOG?.profiles || [];
  const state = { demand: null, results: null, family: 'all', catalog: 'all', query: '', mode: 'matches', sort: 'mass', objective:'mass', maxHeightMm:null, selected: null, showDetails: false };
  const families={C:'Canal C',I:'Viga I · M / S',H:'Ala ancha W / HP',square:'Tubo cuadrado',rectangular:'Tubo rectangular',circular:'Tubo circular',Z:'Perfil Z'};
  const fmt = (n, digits = 3) => Number.isFinite(n) ? ((n !== 0 && Math.abs(n) < 0.001) || Math.abs(n) >= 1e8
    ? n.toExponential(3).replace('.', ',')
    : new Intl.NumberFormat('es-CO', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)) : '—';
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const sourceUrl = p => location.protocol === 'file:' ? encodeURI(p.source) + (p.sourcePage ? '#page=' + p.sourcePage : '') : p.catalog === 'ACESCO' ? 'https://acesco.com.ec/wp-content/uploads/2019/01/perfiles-c-y-z-grado-50-manual-tecnico.pdf#page=' + p.sourcePage : 'https://www.aisc.org/aisc/publications/steel-construction-manual/aisc-shapes-database-v160/';
  let toastTimer;
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500); }
  function showError(message) {
    state.demand = null; state.results = null; state.selected = null;
    $('input-error').textContent = message; $('input-error').hidden = false;
    $('conversion').innerHTML = '<div class="metric"><div class="metric-label">CÁLCULO PENDIENTE</div><div class="metric-value">—</div></div>';
    $('recommendation').innerHTML = '<div class="no-recommendation"><div class="empty-symbol">ƒ</div><h3>Revisa los datos de entrada</h3><p>Corrige el valor indicado para calcular S y consultar los perfiles.</p></div>';
    $('profile-rows').innerHTML = ''; $('empty-results').hidden = false;
    $('empty-results').textContent = 'Introduce datos válidos para evaluar el catálogo.';
    $('match-count').textContent = '—'; $('catalog-summary').textContent = 'Evaluación pendiente.';
    $('pagination-info').textContent = '';
    $('efficiency-content').textContent='Introduce datos válidos para comparar.';
    $('export-csv').disabled = true; $('print').disabled = true;
  }
  function recalculate() {
    try {
      if (!profiles.length) throw new Error('No se pudo cargar data/catalog.js. Conserva la carpeta data junto a index.html.');
      state.demand = C.calculate({ moment: $('moment').value, fy: $('fy').value, fu: $('fu').value, tolerance: $('tolerance').value });
      const height=$('max-height').value.trim();
      state.maxHeightMm=height ? C.parseNumber(height)*10 : null;
      if(height && (!Number.isFinite(state.maxHeightMm) || state.maxHeightMm<=0)) throw new Error('La altura máxima debe ser mayor que cero, en cm, o déjala vacía.');
      $('input-error').hidden = true; $('export-csv').disabled = false; $('print').disabled = false;
      state.results = C.select(profiles, state.demand, state);
      state.selected = state.results.best || state.results.alternative;
      document.querySelectorAll('.preset').forEach(b => { const active = +b.dataset.moment === state.demand.moment; b.classList.toggle('selected', active); b.setAttribute('aria-pressed', String(active)); });
      $('tolerance-help').textContent = `Acepta S entre el requerido y un ${fmt(state.demand.tolerance, 0)} % adicional. No admite S inferiores.`;
      $('tolerance-range').value = Math.min(state.demand.tolerance, 100);
      renderConversion(); renderRecommendation(); renderTable(); renderEfficiency();
    } catch (error) { showError(error.message); }
  }
  function renderConversion() {
    const d = state.demand;
    $('conversion').innerHTML = `<div class="metric"><div class="metric-label">MOMENTO ABSOLUTO</div><div class="metric-value">${fmt(Math.abs(d.moment), 2)}<small>kN·m</small></div><div class="metric-sub">Entrada · |M|</div></div><div class="metric-arrow" aria-hidden="true">→</div><div class="metric"><div class="metric-label">MOMENTO CONVERTIDO</div><div class="metric-value">${fmt(d.kipIn, 2)}<small>kip·in</small></div><div class="metric-sub">× 8,8507457913</div></div><div class="metric-arrow" aria-hidden="true">→</div><div class="metric required"><div class="metric-label">S REQUERIDO</div><div class="metric-value" id="required-s">${fmt(d.required)}<small>in³</small></div><div class="metric-sub">÷ Fy ${fmt(d.fy, 0)} ksi · ${fmt(d.mm3 / 1000, 2)} cm³</div></div>`;
  }
  function sectionSvg(p) {
    const outerWidth=p.family==='Z'?2*p.widthMm-p.webMm:p.widthMm;
    const scale=Math.min(200/p.heightMm,210/outerWidth),h=p.heightMm*scale,w=outerWidth*scale;
    const tw=Math.max(2.5,p.webMm*scale),tf=Math.max(2.5,p.flangeMm*scale),lip=Math.max(6,p.lipMm*scale);
    const left=160-w/2,right=160+w/2,top=50+(200-h)/2,bottom=top+h;
    let shape='';
    if(p.family==='circular') shape=`<circle class="shape" cx="160" cy="150" r="${h/2}"/><circle class="hollow" cx="160" cy="150" r="${Math.max(0,h/2-tw)}"/>`;
    else if(['square','rectangular'].includes(p.family)) shape=`<path class="shape" fill-rule="evenodd" d="M${left} ${top}H${right}V${bottom}H${left}Z M${left+tw} ${top+tf}H${right-tw}V${bottom-tf}H${left+tw}Z"/>`;
    else {
      let path;
      if(p.family==='Z') path=`M${left} ${top}H${160+tw/2}V${bottom-tf}H${right-tw}V${bottom-lip}H${right}V${bottom}H${160-tw/2}V${top+tf}H${left+tw}V${top+lip}H${left}Z`;
      else if(p.family==='C') path=p.lipMm>0?`M${left} ${top}H${right}V${top+lip}H${right-tw}V${top+tf}H${left+tw}V${bottom-tf}H${right-tw}V${bottom-lip}H${right}V${bottom}H${left}Z`:`M${left} ${top}H${right}V${top+tf}H${left+tw}V${bottom-tf}H${right}V${bottom}H${left}Z`;
      else path=`M${left} ${top}H${right}V${top+tf}H${160+tw/2}V${bottom-tf}H${right}V${bottom}H${left}V${bottom-tf}H${160-tw/2}V${top+tf}H${left}Z`;
      shape=`<path class="shape" d="${path}"/>`;
    }
    return `<svg class="profile-drawing" viewBox="0 0 320 320" role="img" aria-label="Sección transversal ${esc(p.name)}, dimensiones en mm"><text class="drawing-title" x="160" y="21" text-anchor="middle">SECCIÓN TRANSVERSAL · ${esc(p.family.toUpperCase())}</text>${shape}<path class="axis" d="M25 150H300"/><text x="297" y="142">x</text><path class="dimension" d="M${left-19} ${top}V${bottom}M${left-24} ${top}h10M${left-24} ${bottom}h10M${left} ${bottom+20}H${right}M${left} ${bottom+15}v10M${right} ${bottom+15}v10"/><text transform="translate(${left-26} 150) rotate(-90)" text-anchor="middle">${fmt(p.heightMm,1)} mm</text><text x="160" y="${bottom+39}" text-anchor="middle">${p.family==='Z'?'ancho total ≈ ':''}${fmt(outerWidth,1)} mm</text><text x="160" y="310" text-anchor="middle">t alma / pared = ${fmt(p.webMm,2)} mm · esquema</text></svg>`;
  }
  function renderRecommendation() {
    const p = state.selected, d = state.demand, r = state.results;
    if (!p) {
      const why = !r.all.length ? 'Los filtros no devuelven perfiles. Prueba otra referencia o amplía la familia y el catálogo.' : `Ningún perfil de esta búsqueda alcanza S = ${fmt(d.required)} in³ en ambas fibras. Cambia los filtros o revisa la demanda.`;
      $('recommendation').innerHTML = `<div class="no-recommendation"><div class="empty-symbol">∅</div><h3>No hay una sección suficiente</h3><p>${why}</p><button type="button" class="button secondary" id="clear-filters">Quitar filtros</button></div>`;
      $('clear-filters').addEventListener('click', clearFilters); return;
    }
    const best = p.id === r.best?.id;
    const label = best ? (state.objective==='mass'?'MENOR PESO EN LA BANDA':'MENOR ÁREA EN LA BANDA') : !p.sufficient ? 'PERFIL INSUFICIENTE' : !p.within ? 'FUERA DE TOLERANCIA' : 'PERFIL SELECCIONADO';
    const badge = p.within ? 'good' : p.sufficient ? 'warning' : 'bad';
    const warning = !p.sufficient ? 'Este perfil no alcanza el S requerido. Se muestra solo para comparar; no es una solución.' : !p.within ? `Esta alternativa supera el exceso permitido de ${fmt(d.tolerance, 0)} %. Cumple S geométrico, pero queda fuera de la banda elegida.` : '';
    const caption = p.family==='Z' ? 'Z: revisar flexión oblicua y arriostramiento; Sx geométrico no verifica por sí solo la resistencia.' : p.process === 'Conformado en frío'
      ? 'Sección bruta: verificar sección efectiva y pandeos local, distorsional y lateral.'
      : 'Sección bruta: verificar esbeltez de los elementos y pandeo lateral torsional.';
    $('recommendation').innerHTML = `<div class="recommendation-head"><div class="recommendation-label"><span class="check-circle">${p.within ? '✓' : '!'}</span> ${label}</div><span class="badge ${badge}">${p.within ? 'Dentro de tolerancia' : p.sufficient ? 'Exceso de S' : 'No cumple S'}</span></div>
      ${warning ? `<div class="warning-copy">${warning}</div>` : ''}
      <div class="recommendation-main"><div><h3 class="profile-title">${esc(p.name)}</h3><div class="profile-subtitle">${esc(p.catalog)} · ${esc(families[p.family])} · ${esc(p.process)}${p.catalog === 'ACESCO' ? ' · dimensiones en mm' : ''}</div><dl class="section-properties"><div><dt>ÁREA TRANSVERSAL</dt><dd>${fmt(p.area)}<small>in²</small></dd></div><div><dt>PESO POR METRO</dt><dd>${fmt(p.massKgM, 2)}<small>kg/m</small></dd></div><div><dt>ALTURA TOTAL</dt><dd>${fmt(p.heightMm/10, 2)}<small>cm</small></dd></div></dl></div>${sectionSvg(p)}</div>
      <div class="section-checks"><div class="section-check"><div><span>FIBRA SUPERIOR · S TOP</span><strong>${fmt(p.sTop)} <small>in³</small></strong></div><b>${p.sTop >= d.required ? '✓' : '×'}</b></div><div class="section-check"><div><span>FIBRA INFERIOR · S BOTTOM</span><strong>${fmt(p.sBottom)} <small>in³</small></strong></div><b>${p.sBottom >= d.required ? '✓' : '×'}</b></div></div>
      <div class="recommendation-foot"><div class="utilization-label"><span>Uso elástico · M / (Fy × S mín)</span><strong>${fmt(p.utilization, 1)} % <span aria-hidden="true">/</span> Exceso ${p.surplus >= 0 ? '+' : ''}${fmt(p.surplus, 2)} %</strong></div><div class="utilization-track"><div class="utilization-fill" style="width:${Math.max(0, Math.min(100, p.utilization))}%;${p.sufficient ? '' : 'background:#bc7e65'}"></div></div><p class="result-caption">${caption}</p><div class="result-actions"><a href="${sourceUrl(p)}" target="_blank" rel="noopener">${esc(p.sourceRef)} ↗</a><button id="toggle-details" aria-expanded="${state.showDetails}">${state.showDetails ? 'Ocultar' : 'Ver'} cálculo y propiedades ${state.showDetails ? '−' : '+'}</button></div></div>
      <div id="selected-details" class="profile-details" ${state.showDetails ? '' : 'hidden'}><dl><dt>S requerido / límite superior</dt><dd>${fmt(d.required, 6)} / ${fmt(d.upper, 6)} in³</dd><dt>σ top = |M| / S top</dt><dd>${fmt(p.stressTop, 3)} ksi</dd><dt>σ bottom = |M| / S bottom</dt><dd>${fmt(p.stressBottom, 3)} ksi</dd><dt>Fy / Fu adoptados</dt><dd>${fmt(d.fy, 2)} / ${fmt(d.fu, 2)} ksi</dd><dt>Momento de primera fluencia Fy × S mín</dt><dd>${fmt(p.yieldMoment, 3)} kN·m</dd><dt>Ix geométrico</dt><dd>${fmt(p.ix, 3)} in⁴</dd><dt>Altura / ancho de ala</dt><dd>${fmt(p.heightMm, 2)} / ${fmt(p.widthMm, 2)} mm</dd><dt>Espesor alma / ala</dt><dd>${fmt(p.webMm, 2)} / ${fmt(p.flangeMm, 2)} mm</dd><dt>Sx original del catálogo</dt><dd>${fmt(p.originalS, 3)} ${esc(p.originalSUnit)}</dd><dt>Área original del catálogo</dt><dd>${fmt(p.originalArea, 3)} ${esc(p.originalAreaUnit)}</dd></dl><p>${esc(p.material)} El momento de primera fluencia no es una resistencia de diseño.</p>${p.sourceNote ? `<p>${esc(p.sourceNote)}</p>` : ''}</div>`;
    $('toggle-details').addEventListener('click', () => { state.showDetails = !state.showDetails; renderRecommendation(); $('toggle-details').focus(); });
  }
  function sortedRows() {
    const rows = [...(state.mode === 'matches' ? state.results.matches : state.results.all)];
    const sort = state.sort === 'surplus' ? (a, b) => Math.abs(a.surplus) - Math.abs(b.surplus) || C.byArea(a, b)
      : state.sort === 'mass' ? (a, b) => a.massKgM - b.massKgM || C.byArea(a, b)
        : state.sort === 'height' ? (a, b) => a.heightMm - b.heightMm || C.byArea(a, b) : C.byArea;
    return rows.sort(sort);
  }
  function renderTable() {
    if (!state.results) return;
    const r = state.results, d = state.demand, rows = sortedRows();
    $('match-count').textContent = r.matches.length;
    $('catalog-summary').textContent = `${r.matches.length} perfiles en la banda ${fmt(d.required)}–${fmt(d.upper)} in³ · ${r.all.length} secciones con los filtros elegidos${state.maxHeightMm?' · altura ≤ '+fmt(state.maxHeightMm/10,1)+' cm':''}.`;
    $('profile-rows').innerHTML = rows.map(p => `<tr class="${p.id === state.selected?.id ? 'selected' : ''}"><td class="profile-cell"><strong>${esc(p.name)}</strong>${p.id === r.best?.id ? '<span class="mini-tag">MEJOR AJUSTE</span>' : ''}<small>${esc(p.catalog)} · ${esc(p.type)} · ${esc(p.process)}</small></td><td>${fmt(p.heightMm/10,2)}</td><td>${fmt(p.area)}</td><td>${fmt(p.sTop)}</td><td>${fmt(p.sBottom)}</td><td>${fmt(p.massKgM, 2)}</td><td class="${p.surplus >= 0 ? 'surplus-positive' : 'surplus-negative'}">${p.surplus >= 0 ? '+' : ''}${fmt(p.surplus, 2)} %</td><td><span class="badge ${p.within ? 'good' : p.sufficient ? 'warning' : 'bad'}">${p.within ? 'Ajustado' : p.sufficient ? 'Excede tolerancia' : 'S insuficiente'}</span></td><td><button class="row-button" data-profile="${esc(p.id)}" aria-label="Ver perfil ${esc(p.name)}">↗</button></td></tr>`).join('');
    $('empty-results').hidden = rows.length > 0;
    if (!rows.length) $('empty-results').innerHTML = `<p>${r.all.length ? 'Ninguna sección está dentro de esta banda de tolerancia.' : 'No hay perfiles con los filtros o la referencia indicados.'} ${r.alternative ? 'Arriba puedes revisar la alternativa suficiente más cercana, fuera de tolerancia.' : ''}</p><button class="button secondary" id="empty-all">Ver todo el catálogo</button>`;
    $('empty-all')?.addEventListener('click', () => { clearFilters(); setMode('all'); });
    $('pagination-info').textContent = `${rows.length} perfiles visibles · valores redondeados`;
    $('export-csv').disabled = !rows.length;
    document.querySelectorAll('[data-profile]').forEach(b => b.addEventListener('click', () => {
      state.selected = r.all.find(p => p.id === b.dataset.profile);
      renderRecommendation(); renderTable();
      $('recommendation').scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(`Ficha de ${state.selected.name}`);
    }));
  }
  function setMode(mode) {
    state.mode = mode;
    ['matches', 'all'].forEach(m => { $(m + '-tab').classList.toggle('active', m === mode); $(m + '-tab').setAttribute('aria-pressed', String(m === mode)); });
    renderTable();
  }
  function setFamily(family) {
    state.family = family;
    $('family-filter').value=family;
  }
  function clearFilters() { setFamily('all'); state.catalog = 'all'; state.query = ''; $('catalog-filter').value = 'all'; $('search').value = ''; $('max-height').value=''; recalculate(); }
  function setMoment(value) { $('moment').value = String(value).replace('.', ','); recalculate(); }
  function exportCsv() {
    if (!state.demand) return;
    const d = state.demand;
    const header = ['Perfil', 'Catalogo', 'Familia', 'Proceso', 'M_kNm_con_signo', 'M_absoluto_kip_in', 'Fy_ksi', 'Fu_ksi', 'S_requerido_in3', 'Tolerancia_pct', 'S_limite_superior_in3', 'Area_in2', 'S_top_in3', 'S_bottom_in3', 'Peso_kg_m', 'Exceso_S_pct', 'Uso_elastico_pct', 'Sigma_top_ksi', 'Sigma_bottom_ksi', 'Evaluacion_geometrica', 'Fuente', 'Referencia', 'Alcance'];
    const rows = sortedRows().map(p => [p.name, p.catalog, p.family, p.process, d.moment, d.kipIn, d.fy, d.fu, d.required, d.tolerance, d.upper, p.area, p.sTop, p.sBottom, p.massKgM, p.surplus, p.utilization, p.stressTop, p.stressBottom, p.status, p.source, p.sourceRef, 'Predimensionamiento M/Fy de seccion bruta; no verifica resistencia de diseno ni pandeos']);
    const cell = v => '"' + (typeof v === 'number' ? String(v).replace('.', ',') : String(v)).replace(/"/g, '""') + '"';
    const blob = new Blob(['\uFEFF' + [header, ...rows].map(row => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `nervio_${Math.abs(d.moment)}kNm_${state.mode}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`${rows.length} perfiles exportados con el cálculo y su fuente.`);
  }
  function renderReportChart() {
    const X = x => 50 + x * 35.5, Y = m => 156 - m * 3.4;
    const spans = [{ start: 0, length: 8, w: 4, left: 0, right: -24.36 }, { start: 8, length: 3, w: 7.2, left: -24.36, right: -8.24 }, { start: 11, length: 5, w: 5, left: -8.24, right: 0 }];
    const points = spans.flatMap(s => Array.from({ length: 51 }, (_, i) => {
      const x = i / 50 * s.length;
      const reaction = (s.right - s.left) / s.length + s.w * s.length / 2;
      return [X(s.start + x), Y(s.left + reaction * x - s.w * x * x / 2)];
    }));
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
    const labels = [{ x: 3.24, m: 20.98, dy: -14, label: '+20,98' }, { x: 8, m: -24.36, dy: 22, label: '−24,36' }, { x: 11, m: -8.24, dy: 22, label: '−8,24' }, { x: 13.83, m: 11.78, dy: -14, label: '+11,78' }];
    $('report-chart').innerHTML = `<svg class="diagram" viewBox="0 0 665 300" role="group" aria-label="Diagrama de momentos del nervio. Apoyo B: menos 24,36 kN metros, máximo absoluto.">${[-20, -10, 0, 10, 20].map(m => `<path class="grid" d="M50 ${Y(m)}H618"/><text x="38" y="${Y(m) + 4}" text-anchor="end">${m}</text>`).join('')}<path class="moment-area" d="${path}L618 156H50Z"/><path class="moment-line" d="${path}"/><path class="axis" d="M50 156H618"/>${[0, 8, 11, 16].map((x, i) => `<path class="axis" d="M${X(x)} 45V270"/><text x="${X(x)}" y="285" text-anchor="middle">${'ABCD'[i]} · ${x} m</text>`).join('')}<text x="50" y="22">M (kN·m)</text>${labels.map(l => `<g class="diagram-preset" role="button" tabindex="0" data-report-moment="${l.m}" aria-label="Usar ${l.label} kN metros"><rect x="${X(l.x) - 35}" y="${Y(l.m) - 30}" width="70" height="60" fill="transparent"/><circle class="point" cx="${X(l.x)}" cy="${Y(l.m)}" r="4"/><text x="${X(l.x)}" y="${Y(l.m) + l.dy}" text-anchor="middle">${l.label}</text></g>`).join('')}</svg>`;
    document.querySelectorAll('[data-report-moment]').forEach(el => {
      const choose = () => { setMoment(el.dataset.reportMoment); $('report-dialog').close(); toast('Momento del informe aplicado.'); };
      el.addEventListener('click', choose); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
    });
  }
  function chooseProfile(id) {
    state.selected=state.results.all.find(p=>p.id===id);
    if(!state.selected)return;
    renderRecommendation();renderTable();
    $('recommendation').scrollIntoView({behavior:'smooth',block:'center'});
  }
  function renderEfficiency() {
    const rows=C.compareEfficiency(state.results.sufficient),best=state.results.best,light=state.results.lightest;
    if(!rows.length){$('efficiency-content').innerHTML='<p class="empty-results">No hay perfiles suficientes con estos filtros y altura.</p>';return;}
    const saving=best?best.massKgM-light.massKgM:0;
    const featured=[best,light].filter((p,i,a)=>p&&a.findIndex(q=>q?.id===p.id)===i);
    const maxSurplus=Math.min(100,Math.max(30,...rows.filter(p=>p.massKgM<=light.massKgM*2).map(p=>p.surplus)));
    const visible=rows.filter(p=>p.surplus<=maxSurplus && p.massKgM<=light.massKgM*2.5);
    const maxMass=Math.max(...visible.map(p=>p.massKgM),light.massKgM*1.1),minMass=Math.max(0,light.massKgM*.8);
    const X=v=>65+v/maxSurplus*640,Y=v=>260-(v-minMass)/(maxMass-minMass)*210;
    const chart=`<svg viewBox="0 0 760 320" class="efficiency-chart" role="group" aria-label="Relación entre exceso de S y peso por metro">${[0,25,50,75,100].filter(v=>v<=maxSurplus).map(v=>`<path class="chart-grid" d="M${X(v)} 30V265"/><text x="${X(v)}" y="287" text-anchor="middle">${v}%</text>`).join('')}${[0,1,2,3,4].map(i=>{let v=minMass+(maxMass-minMass)*i/4;return `<path class="chart-grid" d="M65 ${Y(v)}H705"/><text x="55" y="${Y(v)+4}" text-anchor="end">${fmt(v,1)}</text>`;}).join('')}<text x="65" y="17">Peso (kg/m) · menor es mejor</text><text x="385" y="314" text-anchor="middle">Exceso sobre S requerido →</text>${visible.map(p=>`<circle tabindex="0" role="button" aria-label="${esc(p.name)}: ${fmt(p.massKgM,2)} kg/m, exceso ${fmt(p.surplus,1)} %" data-efficient="${esc(p.id)}" cx="${X(p.surplus)}" cy="${Y(p.massKgM)}" r="${p.id===light.id?7:5}" class="${p.dominated?'dot-muted':'dot-efficient'}"><title>${esc(p.name)} · ${fmt(p.massKgM,2)} kg/m · +${fmt(p.surplus,2)} % · ${fmt(p.heightMm/10,1)} cm</title></circle>`).join('')}</svg>`;
    $('efficiency-content').innerHTML=`<div class="efficiency-featured">${featured.map(p=>`<article><span class="eyebrow">${p.id===light.id?'MÁS LIVIANO SUFICIENTE':'MEJOR DENTRO DE TOLERANCIA'}</span><h3>${esc(p.name)}</h3><div class="efficiency-metrics"><span><b>${fmt(p.massKgM,2)}</b> kg/m</span><span><b>+${fmt(p.surplus,2)} %</b> de S</span><span><b>${fmt(p.heightMm/10,1)}</b> cm</span></div><p>${p.within?'Dentro':'Fuera'} de la tolerancia · S/peso = ${fmt(p.sMin/p.massKgM,3)} in³/(kg/m)</p><button class="button secondary" data-efficient="${esc(p.id)}">Ver sección ↗</button>${!p.within?` <button class="button secondary" data-adopt-tolerance="${Math.ceil(p.surplus*100)/100}">Ampliar tolerancia a ${fmt(Math.ceil(p.surplus*100)/100,2)} %</button>`:''}</article>`).join('')}</div><p class="comparison-note">${saving>0?`La alternativa más liviana ahorra ${fmt(saving,2)} kg/m (${fmt(saving/best.massKgM*100,2)} %) frente al mejor ajuste en la banda. `:''}Más S con menos peso es una ventaja geométrica. La altura máxima se aplica a toda esta comparación; las verificaciones de estabilidad y servicio siguen pendientes.</p>${chart}<p class="comparison-note">Gráfico: ${visible.length} alternativas cercanas, hasta +${fmt(maxSurplus,0)} % de S y ${fmt(light.massKgM*2.5,2)} kg/m. La tabla incluye <strong>todos los ${rows.length} perfiles suficientes</strong>. Verde: no hay otro con igual o menor peso y mayor o igual S, con al menos una mejora. Esta comparación no optimiza simultáneamente la altura.</p><div class="table-scroll efficiency-table"><table><thead><tr><th>Perfil</th><th>Altura <small>cm</small></th><th>Peso <small>kg/m</small></th><th>S mín. <small>in³</small></th><th>Exceso S</th><th>S / peso</th><th>Comparación</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr><td class="profile-cell"><strong>${esc(p.name)}</strong><small>${p.within?'Dentro de tolerancia':'Fuera de tolerancia'}</small></td><td>${fmt(p.heightMm/10,2)}</td><td>${fmt(p.massKgM,2)}</td><td>${fmt(p.sMin,3)}</td><td>+${fmt(p.surplus,2)} %</td><td>${fmt(p.efficiency,3)}</td><td><span class="badge ${p.dominated?'':'good'}">${p.dominated?'Hay opción con más S y menor/igual peso':'Opción eficiente'}</span></td><td><button class="row-button" data-efficient="${esc(p.id)}" aria-label="Ver ${esc(p.name)}">↗</button></td></tr>`).join('')}</tbody></table></div>`;
    $('efficiency-content').querySelectorAll('[data-efficient]').forEach(el=>{const use=()=>chooseProfile(el.dataset.efficient);el.addEventListener('click',use);if(el.tagName.toLowerCase()==='circle')el.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();use();}});});
    document.querySelectorAll('[data-adopt-tolerance]').forEach(b=>b.addEventListener('click',()=>{$('tolerance').value=b.dataset.adoptTolerance;recalculate();}));
  }
  function renderSteelHelp(){
    const g=(window.STEEL_GRADES||[]).find(g=>g.id===$('steel').value);
    $('steel-help').innerHTML=g?`${esc(g.usage)} <a href="#aceros">Ver fuentes y propiedades ↓</a>`:'Valores personalizados. Usa el certificado del material.';
  }
  function applySteel(id){
    const g=window.STEEL_GRADES.find(g=>g.id===id);$('steel').value=id;
    if(g){$('fy').value=g.fy;$('fu').value=g.fu;}
    renderSteelHelp();recalculate();
  }
  function initializeExtras(){
    if(location.protocol!=='file:') document.querySelectorAll('a[href]').forEach(a=>{
      const href=a.getAttribute('href');
      if(href.startsWith('informe_grupo2.pdf')){a.removeAttribute('href');a.textContent+=' (PDF disponible en el computador)';}
      else if(href.startsWith('data/ACESCO'))a.href='https://acesco.com.ec/wp-content/uploads/2019/01/perfiles-c-y-z-grado-50-manual-tecnico.pdf#page=25';
      else if(href.startsWith('data/AISC')){a.removeAttribute('href');a.textContent+=' (Excel original en el computador)';}
    });
    $('total-profiles').textContent=profiles.length;$('sort').value='mass';
    $('steel').innerHTML=(window.STEEL_GRADES||[]).map(g=>`<option value="${g.id}">${esc(g.label)} · ${g.fy}/${g.fu} ksi</option>`).join('')+'<option value="custom">Valores personalizados</option>';
    $('steel-rows').innerHTML=(window.STEEL_GRADES||[]).map(g=>`<tr><td class="profile-cell"><strong>${esc(g.label)}</strong><small>Fy ≈ ${fmt(g.fy*6.894757293,1)} MPa · Fu ≈ ${fmt(g.fu*6.894757293,1)} MPa</small></td><td>${g.fy}</td><td>${g.fu}</td><td class="steel-description">${esc(g.usage)}<p>${esc(g.notes)}</p>${g.sources.map(s=>`<a target="_blank" rel="noopener" href="${esc(s.url)}">${esc(s.title)} ↗</a>`).join(' · ')}</td><td><button class="button secondary" data-steel="${g.id}">Usar</button></td></tr>`).join('');
    document.querySelectorAll('[data-steel]').forEach(b=>b.addEventListener('click',()=>{applySteel(b.dataset.steel);$('steel').scrollIntoView({behavior:'smooth',block:'center'});}));renderSteelHelp();
    const params=new URLSearchParams(location.search);
    if(params.has('moment')){
      $('moment').value=params.get('moment');
      if(params.get('source')==='beam'){$('beam-import-note').hidden=false;$('beam-import-note').textContent='Momento gobernante recibido de la calculadora de vigas. Se usa el valor absoluto para seleccionar S.';}
    }
    for(const [param,id] of [['fy','fy'],['fu','fu'],['tolerance','tolerance'],['height','max-height']])if(params.has(param))$(id).value=params.get(param);
    if(params.has('fy')||params.has('fu')){$('steel').value='custom';renderSteelHelp();}
    if(params.has('family')&&[...$('family-filter').options].some(o=>o.value===params.get('family')))setFamily(params.get('family'));
    if(params.has('catalog')&&['all','AISC','ACESCO'].includes(params.get('catalog'))){state.catalog=params.get('catalog');$('catalog-filter').value=state.catalog;}
    if(params.has('objective')&&['mass','area'].includes(params.get('objective'))){state.objective=params.get('objective');$('objective').value=state.objective;}
    initializeSharing();
  }
  function initializeSharing(){
    let connection=window.NERVIO_CONNECTION,shareUrl='';
    async function openShare(){
      const published=location.protocol==='https:';
      if(!published && location.protocol!=='file:'){try{const response=await fetch('connection.json',{cache:'no-store'});if(response.ok)connection=await response.json();}catch{}}
      let base=published?new URL('./',location.href).href.replace(/\/$/,''):connection?.urls?.[0]||((location.protocol.startsWith('http')&&!['localhost','127.0.0.1'].includes(location.hostname))?location.origin:null);
      const query=new URLSearchParams({moment:$('moment').value,fy:$('fy').value,fu:$('fu').value,tolerance:$('tolerance').value,height:$('max-height').value,family:state.family,catalog:state.catalog,objective:state.objective});
      shareUrl=base?base+'/index.html?'+query.toString():'';
      $('share-status').textContent=base?'Servidor de la red local. El enlace incluye el momento, el acero y los filtros actuales.':'Inicia COMPARTIR EN WIFI desde la carpeta del proyecto para generar la dirección de acceso.';
      $('share-links').innerHTML=base?`<p><a href="${esc(shareUrl)}" target="_blank" rel="noopener">${esc(base)}</a></p><label class="field-label" for="share-url">Enlace del cálculo</label><input id="share-url" readonly value="${esc(shareUrl)}">`:'';
      $('copy-share').disabled=!base;$('native-share').hidden=!navigator.share||!base;$('share-copy-result').textContent='';
      if(published){const dialog=$('share-dialog');dialog.querySelector(':scope > p').textContent='Comparte este enlace con cualquier dispositivo.';dialog.querySelector('.share-steps').innerHTML='<li>Abre el enlace con internet.</li><li>Espera el mensaje Disponible sin conexión.</li><li>Instala Nervio desde el menú del navegador o añade a la pantalla de inicio en Safari.</li>';dialog.querySelector('p.help').textContent='Después de descargar la aplicación, puedes usar el catálogo y las vigas sin internet. No necesitas mantener este computador encendido.';$('share-status').textContent='Enlace público con el momento, acero y filtros actuales.';}
      $('share-dialog').showModal();
    }
    $('open-share').addEventListener('click',openShare);$('close-share').addEventListener('click',()=>$('share-dialog').close());
    $('copy-share').addEventListener('click',async()=>{try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(shareUrl);else{$('share-url').select();if(!document.execCommand('copy'))throw Error('copy');}$('share-copy-result').textContent='Enlace copiado.';}catch{$('share-url')?.select();$('share-copy-result').textContent='Selecciona y copia el enlace del campo de arriba.';}});
    $('native-share').addEventListener('click',async()=>{try{await navigator.share({title:'Nervio · cálculo de sección',url:shareUrl});}catch{}});
    if(location.hash==='#compartir')openShare();
  }
  $('calculator').addEventListener('submit', e => { e.preventDefault(); recalculate(); if (state.demand) toast(`${state.results.matches.length} perfiles dentro de la tolerancia.`); });
  ['moment', 'fy', 'fu', 'tolerance','max-height'].forEach(id => $(id).addEventListener('input', () => { if (id === 'fy' || id === 'fu') { $('steel').value = 'custom'; renderSteelHelp(); } recalculate(); }));
  $('steel').addEventListener('change', () => applySteel($('steel').value));
  $('objective').addEventListener('change',()=>{state.objective=$('objective').value;recalculate();});
  $('tolerance-range').addEventListener('input', () => { $('tolerance').value = $('tolerance-range').value; recalculate(); });
  document.querySelectorAll('[data-moment]').forEach(b => b.addEventListener('click', () => setMoment(b.dataset.moment)));
  $('family-filter').addEventListener('change',()=>{setFamily($('family-filter').value);recalculate();});
  $('catalog-filter').addEventListener('change', () => { state.catalog = $('catalog-filter').value; recalculate(); });
  $('search').addEventListener('input', () => { state.query = $('search').value; recalculate(); });
  $('sort').addEventListener('change', () => { state.sort = $('sort').value; renderTable(); });
  $('matches-tab').addEventListener('click', () => setMode('matches'));
  $('all-tab').addEventListener('click', () => setMode('all'));
  $('reset').addEventListener('click', () => { $('moment').value = '-24,36'; $('fy').value = '50'; $('fu').value = '65'; $('steel').value = 'a572-50'; $('tolerance').value = '20'; state.sort = 'mass'; $('sort').value = 'mass';state.objective='mass';$('objective').value='mass'; state.showDetails = false; $('beam-import-note').hidden=true; renderSteelHelp(); clearFilters(); setMode('matches'); toast('Datos del informe restablecidos.'); });
  $('export-csv').addEventListener('click', exportCsv);
  $('open-report').addEventListener('click', () => $('report-dialog').showModal());
  $('close-report').addEventListener('click', () => $('report-dialog').close());
  $('use-governing').addEventListener('click', () => { setMoment(-24.36); $('report-dialog').close(); });
  $('report-dialog').addEventListener('click', e => { const r = $('report-dialog').getBoundingClientRect(); if (e.target === $('report-dialog') && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) $('report-dialog').close(); });
  let openBeforePrint = [];
  window.addEventListener('beforeprint', () => { openBeforePrint = [...document.querySelectorAll('.method-details details')].map(el => el.open); document.querySelectorAll('.method-details details').forEach(el => { el.open = true; }); });
  window.addEventListener('afterprint', () => document.querySelectorAll('.method-details details').forEach((el, i) => { el.open = openBeforePrint[i] || false; }));
  $('print').addEventListener('click', () => window.print());
  document.querySelectorAll('.nav-item').forEach(a => a.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); a.classList.add('active'); }));
  initializeExtras(); renderReportChart(); recalculate();
})();
