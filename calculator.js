/* Pure calculations. Imperial properties are kept at source precision. */
(function (root) {
  'use strict';
  const KNM_TO_KIPIN = 1000 / (4.4482216152605 * 1000 * 0.0254);
  const IN3_TO_MM3 = 25.4 ** 3;
  function parseNumber(value) {
    const s = String(value).trim().replace(/\u2212/g, '-');
    if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(s)) return NaN;
    return Number(s.replace(',', '.'));
  }
  function calculate({ moment, fy, fu, tolerance }) {
    const m = parseNumber(moment), yieldStress = parseNumber(fy), ultimate = parseNumber(fu), tol = parseNumber(tolerance);
    if (!Number.isFinite(m) || m === 0) throw new Error('Introduce un momento distinto de cero en kN·m. Puedes usar coma o punto decimal.');
    if (!Number.isFinite(yieldStress) || yieldStress <= 0) throw new Error('Fy debe ser un número mayor que cero, en ksi.');
    if (!Number.isFinite(ultimate) || ultimate < yieldStress) throw new Error('Fu debe ser mayor o igual que Fy, en ksi.');
    if (!Number.isFinite(tol) || tol < 0 || tol > 500) throw new Error('La tolerancia debe estar entre 0 y 500 %.');
    const kipIn = Math.abs(m) * KNM_TO_KIPIN;
    const required = kipIn / yieldStress;
    const upper = required * (1 + tol / 100);
    if (![kipIn, required, upper, required * IN3_TO_MM3].every(v => Number.isFinite(v) && v > 0)) throw new Error('Los valores exceden el rango numérico. Revisa el momento y Fy.');
    return { moment: m, fy: yieldStress, fu: ultimate, tolerance: tol, kipIn, required, upper, mm3: required * IN3_TO_MM3 };
  }
  function evaluate(profile, demand) {
    const sMin = Math.min(profile.sTop, profile.sBottom);
    // Only machine-roundoff slack, never an engineering tolerance below demand.
    const eps = Number.EPSILON * Math.max(sMin, demand.upper) * 8;
    const sufficient = profile.sTop + eps >= demand.required && profile.sBottom + eps >= demand.required;
    const within = sufficient && sMin <= demand.upper + eps;
    return { ...profile, sMin, sufficient, within,
      surplus: (sMin / demand.required - 1) * 100,
      stressTop: demand.kipIn / profile.sTop, stressBottom: demand.kipIn / profile.sBottom,
      utilization: demand.required / sMin * 100,
      yieldMoment: demand.fy * sMin / KNM_TO_KIPIN,
      status: within ? 'Dentro de tolerancia' : sufficient ? 'Excede tolerancia' : 'S insuficiente' };
  }
  function byArea(a, b) { return a.area - b.area || a.massKgM - b.massKgM || a.surplus - b.surplus || a.name.localeCompare(b.name); }
  function byMass(a, b) { return a.massKgM-b.massKgM || b.sMin-a.sMin || a.heightMm-b.heightMm || byArea(a,b); }
  function select(profiles, demand, filters = {}) {
    const q = (filters.query || '').toLowerCase().replace(/[×x\s]/g, '');
    const all = profiles.filter(p => (!filters.family || filters.family === 'all' || p.family === filters.family)
      && (!filters.catalog || filters.catalog === 'all' || p.catalog === filters.catalog)
      && (!filters.maxHeightMm || p.heightMm <= filters.maxHeightMm)
      && (!q || (p.name + p.catalog).toLowerCase().replace(/[×x\s]/g, '').includes(q)))
      .map(p => evaluate(p, demand));
    const compare=filters.objective==='mass'?byMass:byArea;
    const matches = all.filter(p => p.within).sort(compare);
    const sufficient = all.filter(p=>p.sufficient).sort(byMass);
    const alternatives = all.filter(p => p.sufficient).sort((a, b) => a.surplus - b.surplus || byArea(a, b));
    return { all, matches, sufficient, best: matches[0] || null, lightest:sufficient[0]||null, alternative: matches.length ? null : alternatives[0] || null };
  }
  function compareEfficiency(profiles) {
    return profiles.map(p=>({...p,efficiency:p.sMin/p.massKgM,
      dominated:profiles.some(q=>q.id!==p.id && q.massKgM<=p.massKgM && q.sMin>=p.sMin && (q.massKgM<p.massKgM || q.sMin>p.sMin))}));
  }
  root.SteelCalc = { KNM_TO_KIPIN, IN3_TO_MM3, parseNumber, calculate, evaluate, select, byArea, byMass, compareEfficiency };
})(globalThis);
