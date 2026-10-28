/* Run: node benchmark_genesis03.js ; no dependencies */
require('./genesis3_core.js');
const C=globalThis.GENESIS_CORE,lib=C.makeLibrary(7);
const Ns=[40,160],seeds=Array.from({length:20},(_,i)=>1000+i);
console.log('Independent deterministic held-out benchmark; 20 random training seeds; 900 clean test cases per task.');
for(const world of Object.keys(C.worlds))for(const N of Ns){
 const records=[];
 for(const seed of seeds){
  const obs=C.createSamples(seed,N,world),split=C.makeSplit(obs,72813),test=C.createSamples(seed^0x2367a65,900,world);
  const a=C.fitLinear(split.train),b=C.fitMemory(split.train),c=C.fitSymbolic(split.train,split.validation,lib);
  records.push([C.accuracy(a,test),C.accuracy(b,test),c.ready?C.accuracy(c,test):null]);
 }
 const report=[0,1,2].map(k=>{
  let xs=records.map(row=>row[k]).filter(x=>x!==null),mean=xs.reduce((a,b)=>a+b,0)/xs.length;
  const sd=Math.sqrt(xs.reduce((s,x)=>s+(x-mean)**2,0)/xs.length);
  return `${(mean*100).toFixed(1)} ± ${(sd*100).toFixed(1)}%`;
 });
 console.log(world.padEnd(10),`N=${N}`.padEnd(8),report.join(' | '));
}
