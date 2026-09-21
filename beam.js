/* Euler–Bernoulli beam, exact equivalent nodal loads, analytical V/M recovery. */
(function(root){
  'use strict';
  function gauss(A,b){
    const n=b.length,a=A.map((r,i)=>[...r,b[i]]);
    const scale=Math.max(...A.flat().map(Math.abs));
    for(let k=0;k<n;k++){
      let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
      if(Math.abs(a[pivot][k])<=Math.max(Number.MIN_VALUE,scale*1e-13))throw Error('La rigidez está mal condicionada. Revisa las luces y los valores EI.');
      [a[k],a[pivot]]=[a[pivot],a[k]];
      for(let i=k+1;i<n;i++){const f=a[i][k]/a[k][k];for(let j=k;j<=n;j++)a[i][j]-=f*a[k][j];}
    }
    const x=Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=a[i][n];for(let j=i+1;j<n;j++)s-=a[i][j]*x[j];x[i]=s/a[i][i];}return x;
  }
  function solve(model){
    if(!model||!Array.isArray(model.spans)||model.spans.length<1||model.spans.length>30)throw Error('Usa entre 1 y 30 luces (2 a 31 apoyos).');
    const spans=model.spans.map((s,i)=>{
      const L=Number(s.L),EI=Number(s.EI),q=Number(s.q),P=Number(s.P||0),a=Number(s.a??L/2);
      if(![L,EI,q,P,a].every(Number.isFinite)||L<=0||EI<=0)throw Error(`Tramo ${i+1}: luz y EI deben ser positivos; todas las cargas deben ser números.`);
      if(a<0||a>L)throw Error(`Tramo ${i+1}: la posición de P debe estar entre 0 y la luz.`);
      return {L,EI,q,P,a};
    });
    const supports=spans.length+1,nd=2*supports;
    const K=Array.from({length:nd},()=>Array(nd).fill(0)),F=Array(nd).fill(0),elements=[];
    spans.forEach((s,i)=>{
      const {L,EI,q,P,a}=s,e=EI/L**3;
      const k=[[12,6*L,-12,6*L],[6*L,4*L*L,-6*L,2*L*L],[-12,-6*L,12,-6*L],[6*L,2*L*L,-6*L,4*L*L]].map(r=>r.map(v=>v*e));
      // Vertical DOFs are positive upward, rotations positive counterclockwise.
      const t=a/L,N=[1-3*t*t+2*t*t*t,L*(t-2*t*t+t*t*t),3*t*t-2*t*t*t,L*(-t*t+t*t*t)];
      const f=[-q*L/2,-q*L*L/12,-q*L/2,q*L*L/12].map((v,j)=>v-P*N[j]);
      const ids=[2*i,2*i+1,2*i+2,2*i+3];
      ids.forEach((r,j)=>{F[r]+=f[j];ids.forEach((c,l)=>{K[r][c]+=k[j][l];});});elements.push({s,k,f,ids});
    });
    const free=[];
    for(let i=0;i<supports;i++)if(!((i===0&&model.left==='fixed')||(i===supports-1&&model.right==='fixed')))free.push(2*i+1);
    const u=Array(nd).fill(0);
    if(free.length){const x=gauss(free.map(i=>free.map(j=>K[i][j])),free.map(i=>F[i]));free.forEach((id,i)=>{u[id]=x[i];});}
    const R=K.map((row,i)=>row.reduce((s,k,j)=>s+k*u[j],0)-F[i]);
    let start=0,totalLoad=0,loadMoment=0;
    const recovered=elements.map(({s,k,f,ids},index)=>{
      const end=k.map((r,i)=>r.reduce((v,k,j)=>v+k*u[ids[j]],0)-f[i]);
      const m0=-end[1],v0=end[0];
      const moment=x=>m0+v0*x-s.q*x*x/2-s.P*Math.max(0,x-s.a);
      const shear=(x,side='right')=>v0-s.q*x-((x>s.a || (x===s.a&&side==='right'))?s.P:0);
      const locations=[0,s.L];if(s.P!==0)locations.push(s.a);
      if(s.q!==0){const before=v0/s.q,after=(v0-s.P)/s.q;if(before>0&&before<Math.min(s.a,s.L))locations.push(before);if(after>Math.max(s.a,0)&&after<s.L)locations.push(after);if(s.P===0&&before>0&&before<s.L)locations.push(before);}
      const critical=[...new Set(locations)].sort((a,b)=>a-b).map(x=>({x,startX:start+x,M:moment(x)}));
      const sampleXs=[...new Set([...Array.from({length:101},(_,j)=>s.L*j/100),...locations])].sort((a,b)=>a-b);
      const samples=sampleXs.flatMap(x=>s.P!==0&&x===s.a?[{x:start+x,M:moment(x),V:shear(x,'left')},{x:start+x,M:moment(x),V:shear(x,'right')}]:[{x:start+x,M:moment(x),V:shear(x)}]);
      const result={...s,index,start,endForces:end,mLeft:moment(0),mRight:moment(s.L),vLeft:shear(0),vRight:shear(s.L,'left'),critical,samples};
      totalLoad+=s.q*s.L+s.P;loadMoment+=s.q*s.L*(start+s.L/2)+s.P*(start+s.a);start+=s.L;return result;
    });
    const positions=[0];spans.forEach(s=>positions.push(positions.at(-1)+s.L));
    const reactions=positions.map((x,i)=>({x,R:R[2*i],moment:R[2*i+1],rotation:u[2*i+1]}));
    const critical=recovered.flatMap(s=>s.critical),governing=critical.reduce((a,b)=>Math.abs(b.M)>Math.abs(a.M)?b:a);
    const maxPositive=critical.reduce((a,b)=>b.M>a.M?b:a),maxNegative=critical.reduce((a,b)=>b.M<a.M?b:a);
    const forceResidual=reactions.reduce((a,r)=>a+r.R,0)-totalLoad;
    const momentResidual=reactions.reduce((a,r)=>a+r.R*r.x+r.moment,0)-loadMoment;
    if(![...R,governing.M,forceResidual,momentResidual].every(Number.isFinite))throw Error('Los valores superan el rango numérico del cálculo.');
    const scaleF=Math.max(1,spans.reduce((a,s)=>a+Math.abs(s.q*s.L)+Math.abs(s.P),0));
    if(Math.abs(forceResidual)>scaleF*1e-7||Math.abs(momentResidual)>scaleF*Math.max(1,start)*1e-7)throw Error('El modelo no supera la comprobación de equilibrio. Revisa la escala de luces, EI y cargas.');
    return {spans:recovered,reactions,length:start,totalLoad,forceResidual,momentResidual,governing,maxPositive,maxNegative};
  }
  root.BeamSolver={solve};
  if(typeof module!=='undefined')module.exports=root.BeamSolver;
})(globalThis);
