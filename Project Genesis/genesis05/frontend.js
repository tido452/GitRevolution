(()=>{'use strict';
const G=globalThis.GENESIS5,$=id=>document.getElementById(id);
const el={source:$('source'),target:$('target'),count:$('count'),gens:$('gens'),seed:$('seed'),discover:$('discover'),save:$('save'),clear:$('clear'),transfer:$('transfer'),reset:$('reset'),export:$('export'),status:$('status')};
let currentSource=null,library=null,experiment=null,busy=false;
const pop=100,sourceGens=48;
function settings(){return {source:el.source.value,target:el.target.value,n:parseInt(el.count.value,10),gens:parseInt(el.gens.value,10),seed:(parseInt(el.seed.value,10)||1)};}
function percent(v){return (v*100).toFixed(1)+'%';}
function notify(s){el.status.textContent=s;}
function lock(v){busy=v;el.discover.disabled=v;el.transfer.disabled=v||!library;el.save.disabled=v||!currentSource;el.reset.disabled=v;el.clear.disabled=v;el.export.disabled=v||!experiment;['source','target','count','gens','seed'].forEach(id=>$(id).disabled=v);}
function nextFrame(){return new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));}
function blank(canvasId,message){const c=$(canvasId),ctx=c.getContext('2d');ctx.fillStyle='#172f40';ctx.fillRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.fillStyle='#a5becb';ctx.font='12px sans-serif';ctx.fillText(message,c.width/2,c.height/2);}
function paint(canvasId,fn){const c=$(canvasId),ctx=c.getContext('2d'),size=140,tmp=document.createElement('canvas');tmp.width=size;tmp.height=size;const t=tmp.getContext('2d');const img=t.createImageData(size,size);
for(let j=0;j<size;j++)for(let i=0;i<size;i++){const x=-1+2*(i+.5)/size,y=1-2*(j+.5)/size;const q=fn(x,y),k=4*(j*size+i);const col=q?[39,112,106]:[116,79,64];img.data[k]=col[0];img.data[k+1]=col[1];img.data[k+2]=col[2];img.data[k+3]=255;}
t.putImageData(img,0,0);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(tmp,0,0,c.width,c.height);ctx.strokeStyle='#ffffff18';ctx.beginPath();ctx.moveTo(140,0);ctx.lineTo(140,280);ctx.moveTo(0,140);ctx.lineTo(280,140);ctx.stroke();}
function mapReset(){paint('truth',G.tasks[el.target.value].fn);blank('cold','예측 대기');blank('warm','예측 대기');}
function plot(a=[],b=[]){const c=$('chart'),ctx=c.getContext('2d');const W=c.width,H=c.height;ctx.clearRect(0,0,W,H);ctx.strokeStyle='#4a6071';ctx.lineWidth=1;ctx.font='11px sans-serif';ctx.fillStyle='#98b6c7';
for(let j=0;j<=4;j++){let y=12+(H-30)*j/4;ctx.beginPath();ctx.moveTo(34,y);ctx.lineTo(W-6,y);ctx.stroke();ctx.fillText((100-25*j)+'',4,y+4);}
for(const [arr,col] of [[a,'#86bef2'],[b,'#6de3c0']]){if(!arr.length)continue;ctx.strokeStyle=col;ctx.lineWidth=2.2;ctx.beginPath();arr.forEach((v,i)=>{const x=35+(W-46)*(i/Math.max(1,Math.max(a.length,b.length)-1)),y=12+(H-30)*(1-v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}}
function reset(keepSettings=true){if(busy)return;currentSource=null;library=null;experiment=null;$('sourceFormula').textContent='아직 발견된 수식 없음';$('sourceMeta').textContent='학습 대기';$('macroName').textContent='저장된 연산 없음';$('macroFormula').textContent='M₁(x,y) = ?';$('macroInfo').textContent='정의가 등록되면 다음 문제에서 새로운 후보 연산으로 사용돼.';$('transferFormula').textContent='두 모델의 발견한 수식을 비교할 수 있어.';$('targetMeta').textContent='비교 대기';$('coldExpr').textContent=$('warmExpr').textContent='—';['knnAcc','coldAcc','warmAcc','replayAcc','delta'].forEach(id=>$(id).textContent='—');$('deltaMsg').textContent='다른 시드로 반복해야 의미 있는 비교가 가능해.';$('coldLabel').textContent=$('warmLabel').textContent='아직 탐색 전';$('discoverBar').style.width='0%';$('transferBar').style.width='0%';$('progressInfo').textContent='0세대';plot();el.save.disabled=true;el.transfer.disabled=true;el.export.disabled=true;notify('준비 완료. ① 규칙 발견부터 시작해.');mapReset();}
async function discover(){if(busy)return;const s=settings();currentSource=null;library=null;experiment=null;el.save.disabled=true;el.transfer.disabled=true;lock(true);try{
const dataset=G.partition({task:s.source,samples:s.n},s.seed);const run=G.evolveSession({seed:s.seed+11,train:dataset.train,validation:dataset.validation,population:pop});
for(let k=0;k<sourceGens;k++){run.generation();if(k%3===2||k===sourceGens-1){$('discoverBar').style.width=(100*(k+1)/sourceGens)+'%';$('sourceMeta').textContent='원본 규칙 탐색 중 · '+(k+1)+' / '+sourceGens+'세대';await nextFrame();}}
currentSource={tree:G.clone(run.best.tree),acc:G.accuracy(G.asSymbol(run.best),dataset.test),source:s.source,seed:s.seed,sample:s.n};$('sourceFormula').textContent='z = '+G.expr(run.best.tree);$('sourceMeta').textContent='관측 '+s.n+'개 · 독립 시험 정확도 '+percent(currentSource.acc);notify('원본 문제에서 표현식을 발견했어. ② 연산 등록을 누르면 다음 문제에서 사용할 수 있어.');
}catch(e){notify('오류: '+e.message);console.error(e)}finally{lock(false);}}
function save(){if(!currentSource||busy)return;library={id:1,body:G.clone(currentSource.tree),source:currentSource.source};$('macroName').textContent='M₁ · 학습된 합성 연산 등록 완료';$('macroFormula').textContent='M₁(x,y) = '+G.expr(library.body);$('macroInfo').textContent='압축된 크기: 연산 트리 1노드 · 원래 정의 크기 '+G.expandedSize(library.body)+'노드 (정의 저장 비용 별도)';el.transfer.disabled=false;notify('M₁을 저장했어. 같은 수식을 더 짧게 참조하고 새 문제에서 조합할 수 있어.');}
async function transfer(){if(!library||busy)return;const s=settings();experiment=null;lock(true);try{
 const dataset=G.partition({task:s.target,samples:s.n},s.seed+4000);
 const config={seed:s.seed+300,train:dataset.train,validation:dataset.validation,population:pop};
 const cold=G.evolveSession(config),replay=G.evolveSession({...config,seedExpressions:[library.body]}),warm=G.evolveSession({...config,macro:[library]});
 const ca=[],wa=[];for(let i=0;i<s.gens;i++){
  cold.generation();replay.generation();warm.generation();ca.push(cold.best.validation);wa.push(warm.best.validation);
  $('transferBar').style.width=(100*(i+1)/s.gens)+'%';$('progressInfo').textContent=(i+1)+' / '+s.gens+'세대';plot(ca,wa);
  if(i%2===1||i===s.gens-1)await nextFrame();
 }
 const knn=G.knn(dataset.train.concat(dataset.validation));const ac=G.accuracy(G.asSymbol(cold.best),dataset.test),ar=G.accuracy(G.asSymbol(replay.best),dataset.test),aw=G.accuracy(G.asSymbol(warm.best),dataset.test),ak=G.modelAcc(knn,dataset.test);
 experiment={...s,cold:ac,replay:ar,warm:aw,knn:ak,sourceAcc:currentSource.acc,sourceExpr:G.expr(currentSource.tree),coldExpr:G.expr(cold.best.tree),warmExpr:G.expr(warm.best.tree),coldHistory:ca,warmHistory:wa};
 $('coldAcc').textContent=percent(ac);$('warmAcc').textContent=percent(aw);$('knnAcc').textContent=percent(ak);$('replayAcc').textContent=percent(ar);
 $('delta').textContent=(aw>=ac?'+':'')+((aw-ac)*100).toFixed(1)+'%p';$('delta').style.color=aw>ac?'var(--aqua)':aw<ac?'var(--orange)':'var(--text)';
 $('deltaMsg').textContent=aw>ac?'이 실행에서는 이전에 배운 연산이 도움이 됐어. 반복 실험이 필요해.':aw<ac?'이 실행에서는 오히려 전이가 방해됐어. 무조건 도움되지는 않아.':'두 방식의 최종 정확도 차이는 없었어.';
 $('targetMeta').textContent='새 세계 · 관측 '+s.n+'개 · '+s.gens+'세대';$('transferFormula').textContent='M₁ = '+G.expr(library.body);
 $('coldExpr').textContent='z = '+G.expr(cold.best.tree);$('warmExpr').textContent='z = '+G.expr(warm.best.tree);
 $('coldLabel').textContent='정확도 '+percent(ac);$('warmLabel').textContent='정확도 '+percent(aw);
 paint('cold',(x,y)=>G.predict(G.asSymbol(cold.best),x,y));paint('warm',(x,y)=>G.predict(G.asSymbol(warm.best),x,y));
 notify('전이 비교 완료. 동일한 새 문제의 관측으로 두 모델을 학습했어. 결과를 여러 시드로 반복해봐.');
 }catch(e){console.error(e);notify('오류: '+e.message)}finally{lock(false);}}
function csv(){if(!experiment)return;const r=experiment;const rows=[['source','target','observations','generations','seed','source_test','knn_test','cold_test','replay_test','warm_test','source_expr','cold_expr','warm_expr'],[r.source,r.target,r.n,r.gens,r.seed,r.sourceAcc,r.knn,r.cold,r.replay,r.warm,r.sourceExpr,r.coldExpr,r.warmExpr]];const t=rows.map(a=>a.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');const blob=new Blob(['\ufeff'+t],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='genesis05_result.csv';a.click();URL.revokeObjectURL(url);}
el.discover.addEventListener('click',discover);el.save.addEventListener('click',save);el.transfer.addEventListener('click',transfer);el.clear.addEventListener('click',()=>{if(!busy){library=null;el.transfer.disabled=true;$('macroName').textContent='저장된 연산 없음';$('macroFormula').textContent='M₁(x,y) = ?';notify('합성 연산을 초기화했어. 새 연산을 등록할 수 있어.')}});el.reset.addEventListener('click',()=>reset());el.export.addEventListener('click',csv);
['source','target','count','gens','seed'].forEach(id=>$(id).addEventListener('change',()=>{reset();notify('설정이 바뀌었어. 새 시드와 환경에서 ①부터 시작해.')}));reset();
})();
