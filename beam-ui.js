(function(){
  'use strict';const $=id=>document.getElementById(id),parse=SteelCalc.parseNumber;
  const fmt=(n,d=3)=>new Intl.NumberFormat('es-CO',{maximumFractionDigits:d,minimumFractionDigits:d}).format(Math.abs(n)<1e-10?0:n);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let result=null;
  const example=[{L:8,q:4,P:0,a:4,EI:10000},{L:3,q:7.2,P:0,a:1.5,EI:10000},{L:5,q:5,P:0,a:2.5,EI:10000}];
  const letter=i=>i<26?String.fromCharCode(65+i):'A'+String.fromCharCode(65+i-26);
  function readRows(){return [...$('span-inputs').querySelectorAll('tr')].map(row=>Object.fromEntries([...row.querySelectorAll('input')].map(el=>[el.dataset.field,el.value])));}
  function setRows(rows){$('span-inputs').innerHTML=rows.map((r,i)=>`<tr><td>${letter(i)}–${letter(i+1)}</td>${['L','q','P','a','EI'].map(k=>`<td><input type="text" inputmode="decimal" data-field="${k}" value="${esc(r[k])}" aria-label="${k}, tramo ${i+1}"></td>`).join('')}</tr>`).join('');}
  function stale(){result=null;$('beam-output').hidden=true;$('beam-error').hidden=true;}
  function failure(e){stale();$('beam-error').textContent=e.message;$('beam-error').hidden=false;}
  function calculate(){try{
    const spans=readRows().map((r,i)=>{
      const s=Object.fromEntries(Object.entries(r).map(([k,v])=>[k,parse(v)]));
      if(s.P===0)s.a=s.L/2;
      if(!Object.values(s).every(Number.isFinite))throw Error(`Tramo ${i+1}: completa los datos con números; puedes usar coma o punto decimal.`);
      return s;
    });
    result=BeamSolver.solve({spans,left:$('left-support').value,right:$('right-support').value});
    $('beam-error').hidden=true;render();
  }catch(e){failure(e);}}
  function plot(kind){
    const points=result.spans.flatMap(s=>s.samples),max=Math.max(1,...points.map(p=>Math.abs(p[kind])));
    const X=x=>65+x/result.length*730,Y=y=>175-y/max*115;
    const d=points.map((p,i)=>`${i?'L':'M'}${X(p.x).toFixed(3)} ${Y(p[kind]).toFixed(3)}`).join(' ');
    const marks=kind==='M'?result.spans.flatMap(s=>s.critical).filter(p=>Math.abs(p.M)>.0001):[];
    const unique=marks.filter((p,i,a)=>a.findIndex(q=>Math.abs(q.startX-p.startX)<1e-8&&Math.abs(q.M-p.M)<1e-8)===i);
    return `<svg class="beam-chart" viewBox="0 0 855 335" role="img" aria-label="${kind==='M'?'Momento en kN metros':'Cortante en kN'}"><path class="plot-area" d="${d}L795 175H65Z"/>${[-1,-.5,0,.5,1].map(v=>`<path class="plot-grid" d="M65 ${Y(v*max)}H795"/><text x="55" y="${Y(v*max)+4}" text-anchor="end">${fmt(v*max,2)}</text>`).join('')}<path class="plot-zero" d="M65 175H795"/><path class="plot-line" d="${d}"/>${result.reactions.map((r,i)=>`<path class="plot-zero" d="M${X(r.x)} 45V295"/><text x="${X(r.x)}" y="320" text-anchor="middle">${letter(i)} · ${fmt(r.x,1)} m</text>`).join('')}${unique.map((p,i)=>`<circle class="critical-point" cx="${X(p.startX)}" cy="${Y(p.M)}" r="4"><title>x=${fmt(p.startX)} m; M=${fmt(p.M)} kN·m</title></circle>${unique.length<=14?`<text class="chart-value" x="${X(p.startX)}" y="${Y(p.M)+(p.M>=0?-12:19)}" text-anchor="middle">${fmt(p.M,2)}</text>`:''}`).join('')}<text x="65" y="23">${kind==='M'?'M (kN·m)':'V (kN)'} · x (m)</text></svg>`;
  }
  function scheme(){
    const X=x=>45+x/result.length*750,beamY=180;
    const maxQ=Math.max(...result.spans.map(s=>Math.abs(s.q)));
    const maxP=Math.max(...result.spans.map(s=>Math.abs(s.P)));
    // q and P have different units: use one common scale per load type.
    const arrow=(x,value,max,height,kind,index)=>{
      const size=Math.abs(value)/max*height,top=beamY-size;
      const tail=value>0?top:beamY,tip=value>0?beamY:top;
      const head=Math.min(5,size*.3),back=tip+(value>0?-head:head);
      return `<line class="load ${kind}-load load-arrow" data-kind="${kind}" data-span="${index}" x1="${x}" x2="${x}" y1="${tail}" y2="${tip}"/><path class="load ${kind}-load" fill="none" d="M${x-head*.65} ${back}L${x} ${tip}L${x+head*.65} ${back}"/>`;
    };
    const loads=result.spans.map((s,i)=>{
      const count=Math.max(2,Math.min(10,Math.round(s.L/result.length*30)));
      const qTop=beamY-(maxQ?Math.abs(s.q)/maxQ*85:0);
      const distributed=s.q===0?'':`<path class="load q-load" fill="none" d="M${X(s.start)+3} ${qTop}H${X(s.start+s.L)-3}"/>`+Array.from({length:count},(_,j)=>arrow(X(s.start+s.L*(j+.5)/count),s.q,maxQ,85,'q',i)).join('');
      const point=s.P===0?'':arrow(X(s.start+s.a),s.P,maxP,135,'p',i)+`<text class="point-load-label" x="${X(s.start+s.a)}" y="${beamY-Math.abs(s.P)/maxP*135-10}" text-anchor="middle">P=${fmt(s.P,2)} kN</text>`;
      return `${distributed}<text x="${X(s.start+s.L/2)}" y="${s.q===0?beamY-15:qTop-10}" text-anchor="middle">q=${fmt(s.q,2)} kN/m</text>${point}<text x="${X(s.start+s.L/2)}" y="247" text-anchor="middle">${fmt(s.L,2)} m</text>`;
    }).join('');
    return `<svg class="beam-chart" viewBox="0 0 845 305" role="img" aria-label="Modelo de viga: tama?o de flechas proporcional a la magnitud, escala com?n para cargas distribuidas y otra para puntuales"><path class="beam-line" d="M45 ${beamY}H795"/>${loads}${result.reactions.map((r,i)=>`<path class="support" d="M${X(r.x)} ${beamY+4}l-9 16h18z"/><text x="${X(r.x)}" y="222" text-anchor="middle">${letter(i)}</text>`).join('')}<text x="45" y="277">Longitud de flecha proporcional a |carga|. Cero = sin flecha.</text><text x="45" y="297">Escalas independientes: q en kN/m (verde) y P en kN (naranja).</text></svg>`;
  }
  function render(){const r=result;
    $('beam-output').hidden=false;$('beam-length').textContent=`${r.reactions.length} apoyos · ${fmt(r.length,2)} m`;
    $('beam-metrics').innerHTML=[['M máximo',r.maxPositive.M,`x = ${fmt(r.maxPositive.startX)} m`],['M mínimo',r.maxNegative.M,`x = ${fmt(r.maxNegative.startX)} m`],['|M| gobernante',Math.abs(r.governing.M),`x = ${fmt(r.governing.startX)} m`]].map(([l,v,p])=>`<article><span>${l}</span><strong>${fmt(v)} <small>kN·m</small></strong><small>${p}</small></article>`).join('');
    $('shear-chart').innerHTML=plot('V');$('moment-chart').innerHTML=plot('M');$('beam-scheme').innerHTML=scheme();
    $('beam-reactions').innerHTML=r.reactions.map((s,i)=>`<tr><td>${letter(i)}</td><td>${fmt(s.x,2)}</td><td>${fmt(s.R,4)}</td><td>${fmt(s.moment,4)}</td></tr>`).join('');
    $('beam-balance').textContent=`ΣR = ${fmt(r.reactions.reduce((a,s)=>a+s.R,0),6)} kN; Σcargas = ${fmt(r.totalLoad,6)} kN. Residuo vertical = ${r.forceResidual.toExponential(2)} kN; residuo de momentos = ${r.momentResidual.toExponential(2)} kN·m.${r.reactions.some(s=>s.R<-.0001)?' Hay reacción negativa: revisar levantamiento.':''}`;
    $('beam-transfer-text').textContent=`Momento firmado gobernante: ${fmt(r.governing.M,6)} kN·m. El selector usará |M| = ${fmt(Math.abs(r.governing.M),6)} kN·m.`;
    if(Math.abs(r.governing.M)>1e-10){$('beam-transfer').href=`index.html?moment=${encodeURIComponent(r.governing.M)}&source=beam`;$('beam-transfer').removeAttribute('aria-disabled');}
    else{$('beam-transfer').removeAttribute('href');$('beam-transfer').setAttribute('aria-disabled','true');$('beam-transfer-text').textContent='Este caso no genera momento. No hace falta S por flexión para estas cargas.';}
  }
  $('beam-transfer').addEventListener('click',e=>{if($('beam-transfer').getAttribute('aria-disabled')==='true')e.preventDefault();});
  $('span-inputs').addEventListener('input',stale);['left-support','right-support'].forEach(id=>$(id).addEventListener('change',stale));
  $('support-count').addEventListener('input',stale);
  $('apply-supports').addEventListener('click',()=>{try{const n=Number($('support-count').value);if(!Number.isInteger(n)||n<2||n>31)throw Error('El número de apoyos debe ser un entero entre 2 y 31.');const old=readRows();setRows(Array.from({length:n-1},(_,i)=>old[i]||{L:5,q:5,P:0,a:2.5,EI:10000}));stale();}catch(e){failure(e);}});
  $('solve-beam').addEventListener('click',()=>{const n=Number($('support-count').value);if(n!==readRows().length+1){failure(Error('Pulsa Aplicar para confirmar el nuevo número de apoyos.'));return;}calculate();});
  $('beam-example').addEventListener('click',()=>{$('support-count').value=4;$('left-support').value='pinned';$('right-support').value='pinned';setRows(example);calculate();});
  $('beam-export').addEventListener('click',()=>{if(!result)return;const rows=[['Tipo','Tramo_o_apoyo','x_m','V_o_reaccion_kN','M_kNm'],...result.reactions.map((r,i)=>['Reaccion',letter(i),r.x,r.R,r.moment]),...result.spans.flatMap((s,i)=>s.samples.map(p=>['Diagrama',i+1,p.x,p.V,p.M]))];const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download='nervio-diagramas-viga.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  setRows(example);calculate();
})();
