const G=require('./genesis4_core.js');
const tasks=process.argv[2]?[process.argv[2]]:['xor','circle','parabola','stripes','ripple','diagonal'];
const repeats=Number(process.argv[3]||8),gens=Number(process.argv[4]||65),n=Number(process.argv[5]||120),pop=Number(process.argv[6]||160);
for(const task of tasks){const score=[],formula=[];const start=Date.now();
 for(let i=0;i<repeats;i++){
  const seed=178+i*131;const d=G.partition({task,samples:n},seed);const shared=d.train.concat(d.validation);const l=G.fitLinear(shared),k=G.knn(shared);
  const ev=G.evolveSession({train:d.train,validation:d.validation,seed,population:pop});
  for(let j=0;j<gens;j++)ev.generation();
  score.push([G.modelAcc(l,d.test),G.modelAcc(k,d.test),G.accuracy(G.asSymbol(ev.best),d.test)]);
  formula.push(G.expr(ev.best.tree));
 }
 const mean=col=>Math.round(score.reduce((s,x)=>s+x[col],0)/score.length*1000)/10;
 console.log(task, 'linear',mean(0),'knn',mean(1),'genesis04',mean(2),'duration',Math.round((Date.now()-start)/1000)+'s', 'formulas',formula.slice(0,3).join(' | '));
}
