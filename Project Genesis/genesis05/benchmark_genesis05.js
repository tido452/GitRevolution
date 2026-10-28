/* Reproducible small study. All target variants see IDENTICAL labeled observations and
 * train/validation splits; test is held out from selection.
 * Source training COST is additional and is not counted in target generations.
 * The GP setting is precommitted; do not tune based on held-out test performance.
 */
const G=require('./genesis5_core.js');
const N=Number(process.argv[2]||8);
const cases=[['xor','xor_offset'],['circle','circle_small'],['stripes','stripes_offset'],['xor','stripes_offset']];
for(const [source,target] of cases){
 const rows=[];
 for(let i=0;i<N;i++){
  const seed=1001+137*i;
  const ds=G.partition({task:source,samples:140},seed);
  const creator=G.evolveSession({seed:seed+11,train:ds.train,validation:ds.validation,population:100});
  for(let t=0;t<45;t++)creator.generation();
  const learned={id:1,body:G.clone(creator.best.tree)};
  const dt=G.partition({task:target,samples:70},seed+4000);
  const cfg={seed:seed+300,train:dt.train,validation:dt.validation,population:100};
  const no=G.evolveSession(cfg),reuse=G.evolveSession({...cfg,seedExpressions:[learned.body]}),yes=G.evolveSession({...cfg,macro:[learned]});
  for(let t=0;t<12;t++){no.generation();reuse.generation();yes.generation();}
  const cold=G.accuracy(G.asSymbol(no.best),dt.test),replay=G.accuracy(G.asSymbol(reuse.best),dt.test),transfer=G.accuracy(G.asSymbol(yes.best),dt.test);
  rows.push({cold,replay,transfer,sourceAcc:G.accuracy(G.asSymbol(creator.best),ds.test),source:G.expr(creator.best.tree),coldExpr:G.expr(no.best.tree),transferExpr:G.expr(yes.best.tree)});
 }
 const mean=k=>rows.reduce((s,r)=>s+r[k],0)/rows.length;
 console.log(`${source}->${target} n=${N} sourceAcc=${(100*mean('sourceAcc')).toFixed(1)} cold=${(100*mean('cold')).toFixed(1)} rawReuse=${(100*mean('replay')).toFixed(1)} transfer=${(100*mean('transfer')).toFixed(1)} gain=${(100*(mean('transfer')-mean('cold'))).toFixed(1)}pp`);
 console.log(' first',JSON.stringify(rows[0]));
}
