const assert=require('node:assert/strict');
const {solve}=require('../beam.js');
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const span=(L,q,P=0,a=L/2,EI=10000)=>({L,q,P,a,EI});
let r=solve({spans:[span(6,10)]});near(r.maxPositive.M,45);near(r.reactions[0].R,30);near(r.spans[0].mLeft,0);near(r.spans[0].mRight,0);
r=solve({spans:[span(6,0,20)]});near(r.maxPositive.M,30);near(r.reactions[0].R,10);
r=solve({spans:[span(6,0,20,2)]});near(r.maxPositive.M,20*2*4/6);near(r.reactions[0].R,20*4/6);near(r.governing.startX,2);
r=solve({spans:[span(6,10)],left:'fixed',right:'fixed'});near(r.spans[0].mLeft,-30);near(r.spans[0].mRight,-30);near(r.maxPositive.M,15);
r=solve({spans:[span(6,10),span(6,10)]});near(r.spans[0].mRight,-45);near(r.reactions[0].R,22.5);near(r.reactions[1].R,75);near(r.maxPositive.M,25.3125);
r=solve({spans:[span(6,10),span(6,0)]});near(r.spans[0].mRight,-22.5);near(r.reactions[2].R,-3.75);
r=solve({spans:[span(8,4),span(3,7.2),span(5,5)]});near(r.totalLoad,78.6);near(r.spans[0].mRight,-24.36,.01);near(r.spans[1].mRight,-8.24,.01);near(r.maxPositive.M,20.98,.01);
for(const s of r.spans){near(s.endForces[0]+s.endForces[2],s.q*s.L+s.P);near(s.mRight,s.endForces[3]);}
let varied=solve({spans:[span(8,4,5,3,10000),span(3,7.2,0,1,15000),span(5,5,10,2,20000),span(7,9,5,5,18000)],left:'fixed'});near(varied.forceResidual,0);near(varied.momentResidual,0);for(let i=0;i<varied.spans.length-1;i++)near(varied.spans[i].mRight,varied.spans[i+1].mLeft);
let scaled=solve({spans:[span(8,4,5,3,100000),span(3,7.2,0,1,150000),span(5,5,10,2,200000),span(7,9,5,5,180000)],left:'fixed'});near(varied.governing.M,scaled.governing.M);
let up=solve({spans:[span(6,-10)]});near(up.maxNegative.M,-45);near(up.reactions[0].R,-30);
let zero=solve({spans:[span(4,0)]});near(zero.governing.M,0);
for(const a of [0,6]){let boundary=solve({spans:[span(6,0,20,a)]});near(boundary.governing.M,0);near(boundary.totalLoad,20);}
assert.throws(()=>solve({spans:[span(0,2)]}));assert.throws(()=>solve({spans:[span(3,2,5,4)]}));
let many=solve({spans:Array.from({length:30},()=>span(5,5))});near(many.forceResidual,0);near(many.momentResidual,0,1e-6);
console.log('PASS beam: simple, point, fixed, continuous, report, variable EI, uplift, zero, endpoints, 31 supports, exact extrema and equilibrium.');
