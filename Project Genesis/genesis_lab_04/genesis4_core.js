/* GENESIS 04: Genetic programming for symbolic feature construction.
 * All learners receive identical labeled observations. Pure JS, Node and browser.
 * Structural evolution uses only training labels; validation selects the final expression;
 * test is separate and is never used by the optimizer.
 */
(function(root, factory){const value=factory();if(typeof module!=='undefined'&&module.exports) module.exports=value; root.GENESIS4=value;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
  function rng(seed){let s=(Number(seed)>>>0);return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function randint(r,n){return Math.floor(r()*n)}
  function choose(r,a){return a[randint(r,a.length)]}
  const tasks={
    xor:{title:'XOR · 네 구역',detail:'곱의 부호에 따라 영역이 갈림',fn:(x,y)=>+(x*y>0)},
    circle:{title:'원형 영역',detail:'거리의 제곱으로 구분되는 영역',fn:(x,y)=>+(x*x+y*y<.44)},
    parabola:{title:'포물선',detail:'곡선 위아래를 구분',fn:(x,y)=>+(y>.08+.82*x*x)},
    stripes:{title:'주기적 줄무늬',detail:'GENESIS 03과 동일한 물결 조건',fn:(x,y)=>+(Math.sin(3.5*Math.PI*x)>0)},
    ripple:{title:'기울어진 물결',detail:'두 좌표의 조합에 따른 주기성',fn:(x,y)=>+(Math.sin(4*x+2*y)>0)},
    diagonal:{title:'대각선 · 대조군',detail:'처음 좌표로 충분히 선형 분리 가능',fn:(x,y)=>+(x+y>.2)}
  };
  const uops=['sin','cos','sq','abs','neg'];const bops=['add','sub','mul'];const nums=[-4,-3,-2,-1,-.5,0,.5,1,2,3,4,6];
  const X={op:'x'},Y={op:'y'};
  function leaf(r){const q=r();return q<.39?{op:'x'}:q<.78?{op:'y'}:{op:'c',v:choose(r,nums)};}
  function make(r,depth=3){if(depth<=0||r()<.31)return leaf(r);if(r()<.42)return {op:choose(r,uops),a:make(r,depth-1)};return {op:choose(r,bops),a:make(r,depth-1),b:make(r,depth-1)};}
  function size(n){return 1+(n.a?size(n.a):0)+(n.b?size(n.b):0)}
  function evalTree(n,x,y){switch(n.op){
    case 'x':return x; case 'y':return y;case 'c':return n.v;
    case 'sin':return Math.sin(evalTree(n.a,x,y));case 'cos':return Math.cos(evalTree(n.a,x,y));
    case 'sq':{const a=evalTree(n.a,x,y);return Math.min(1e6,a*a)}
    case 'abs':return Math.abs(evalTree(n.a,x,y));case 'neg':return -evalTree(n.a,x,y);
    case 'add':return Math.max(-1e6,Math.min(1e6,evalTree(n.a,x,y)+evalTree(n.b,x,y)));
    case 'sub':return Math.max(-1e6,Math.min(1e6,evalTree(n.a,x,y)-evalTree(n.b,x,y)));
    case 'mul':return Math.max(-1e6,Math.min(1e6,evalTree(n.a,x,y)*evalTree(n.b,x,y)));
  }return 0;}
  function expr(n){switch(n.op){case 'x':case 'y':return n.op;case 'c':return String(Number(n.v.toFixed(2)));case 'sin':case 'cos':case 'abs':return n.op+'('+expr(n.a)+')';case 'sq':return '('+expr(n.a)+')²';case 'neg':return '−'+expr(n.a);default:return '('+expr(n.a)+' '+({add:'+',sub:'−',mul:'×'}[n.op])+' '+expr(n.b)+')';}}
  function clone(n){return n.a? (n.b?{op:n.op,a:clone(n.a),b:clone(n.b)}:{op:n.op,a:clone(n.a)}):n.op==='c'?{op:'c',v:n.v}:{op:n.op};}
  function paths(n,path=[],all=[]){all.push(path);if(n.a)paths(n.a,path.concat('a'),all);if(n.b)paths(n.b,path.concat('b'),all);return all;}
  function get(n,p){for(const k of p)n=n[k];return n;}
  function put(n,p,sub){if(!p.length)return clone(sub);const out=clone(n);let cur=out;for(let i=0;i<p.length-1;i++)cur=cur[p[i]];cur[p[p.length-1]]=clone(sub);return out;}
  function safe(n,limit=19){return size(n)>limit?null:n;}
  function mutate(n,r,maxSize=19){const ps=paths(n),p=choose(r,ps),part=get(n,p);let v=null;const z=r();
    if(z<.18){v=make(r,randint(r,3)+1)}
    else if(z<.32){v={op:choose(r,uops),a:clone(part)}}
    else if(z<.57){v={op:choose(r,bops),a:clone(part),b: r()<.52?{op:'c',v:choose(r,nums)}:leaf(r)}}
    else if(z<.75){v=clone(part);if(v.op==='c'){v.v= Math.round((v.v+(r()-.5)*2.5)*4)/4;v.v=Math.max(-8,Math.min(8,v.v));}else if(v.a&&!v.b){v.op=choose(r,uops);}else if(v.b){v.op=choose(r,bops);}else v=make(r,2)}
    else if(z<.90){v={op:'sin',a:{op:'mul',a:clone(part),b:{op:'c',v:choose(r,[.5,1,2,3,4,6])}}};}
    else{v={op:'add',a:clone(part),b:leaf(r)}}
    const newN=put(n,p,v);return safe(newN,maxSize)||clone(n);
  }
  function crossover(a,b,r,maxSize=19){const pa=choose(r,paths(a)),pb=choose(r,paths(b));return safe(put(a,pa,get(b,pb)),maxSize)||clone(a);}
  function makeSamples(task,count,r,region='all',noise=0){const arr=[];for(let i=0;i<count;i++){
    const x=region==='left'?-1+r():-1+2*r(),y=-1+2*r();const truth=tasks[task].fn(x,y);const label=r()<noise?1-truth:truth;
    arr.push({x,y,label,truth});}return arr;}
  function partition(n,seed,noise=0,region='all'){
    const r=rng(seed);const all=makeSamples(n.task||'xor',n.samples||120,r,region,noise);
    // All models see the same budget of labeled observations. GENESIS splits them 75/25
    // into evolution-fitness and model-selection validation. Baselines fit all observations.
    const split=Math.max(1,Math.min(all.length-1,Math.round(all.length*.75)));
    const train=all.slice(0,split),validation=all.slice(split);
    const test=makeSamples(n.task||'xor',1000,r,'all',0);
    return {train,validation,test};}
  function fitThreshold(tree,data){
    const sorted=data.map(d=>({v:evalTree(tree,d.x,d.y),label:d.label}));sorted.sort((a,b)=>a.v-b.v);
    const n=sorted.length;if(!n)return {threshold:0,right:true,acc:0};
    const positive=sorted.reduce((s,d)=>s+d.label,0);let leftPositive=0, leftNegative=0;
    let best={mistakes:n+1,threshold:0,right:true,acc:0};
    function check(t){const rightPositive=positive-leftPositive,rightNegative=(n-positive)-leftNegative;const errRight=leftPositive+rightNegative,errLeft=leftNegative+rightPositive;
      if(errRight<best.mistakes)best={mistakes:errRight,threshold:t,right:true};
      if(errLeft<best.mistakes)best={mistakes:errLeft,threshold:t,right:false};}
    check(sorted[0].v-1e-5);
    for(let i=0;i<n;i++){
      if(sorted[i].label)leftPositive++;else leftNegative++;
      if(i===n-1||sorted[i+1].v-sorted[i].v>1e-8)check(i===n-1?sorted[i].v+1e-5:(sorted[i].v+sorted[i+1].v)/2);
    }
    best.acc=1-best.mistakes/n;return best;
  }
  function predict(symbol,x,y){const v=evalTree(symbol.tree,x,y);return +(symbol.fit.right?v>symbol.fit.threshold:v<symbol.fit.threshold);}
  function accuracy(symbol,data){if(!data.length)return 0;let hit=0;for(const d of data)hit+=predict(symbol,d.x,d.y)===d.truth?1:0;return hit/data.length;}
  function trainingAccuracy(symbol,data){let hit=0;for(const d of data)hit+=predict(symbol,d.x,d.y)===d.label?1:0;return data.length?hit/data.length:0;}
  function fitLinear(data){let w=[0,0,0];for(let i=0;i<360;i++){
    let g=[0,0,0];for(const d of data){const z=w[0]+w[1]*d.x+w[2]*d.y;const p=1/(1+Math.exp(-Math.max(-30,Math.min(30,z))));const e=p-d.label;g[0]+=e;g[1]+=e*d.x;g[2]+=e*d.y;}
    const rate=.9/Math.max(1,data.length);for(let j=0;j<3;j++)w[j]-=rate*(g[j]+(j?0.005*w[j]*data.length:0));}
    return {w,predict:(x,y)=>+(w[0]+w[1]*x+w[2]*y>0)};}
  function knn(data,k=5){return {predict:(x,y)=>{const a=[];for(const d of data){let dist=(d.x-x)**2+(d.y-y)**2;if(a.length===k&&dist>=a[a.length-1].dist)continue;let j=0;while(j<a.length&&a[j].dist<dist)j++;a.splice(j,0,{dist,label:d.label});if(a.length>k)a.pop();}let y1=0,ym=0;for(const d of a){const wt=1/(d.dist+.005);y1+=wt*d.label;ym+=wt;}return +(y1>=ym/2);}};}
  function modelAcc(model,data){let hits=0;for(const d of data)hits+=model.predict(d.x,d.y)===d.truth;return data.length?hits/data.length:0;}
  function seedPopulation(r,population,macro=[]){const arr=[clone(X),clone(Y),{op:'add',a:clone(X),b:clone(Y)},{op:'sub',a:clone(X),b:clone(Y)}];
    for(const m of macro){if(m&&size(m)<=19)arr.push(clone(m));}
    while(arr.length<population)arr.push(make(r,randint(r,4)+1));return arr.slice(0,population);}
  function evaluate(tree,data){const fit=fitThreshold(tree,data);const complexity=size(tree);return {tree,fit,complexity,training:fit.acc,fitness:fit.acc-0.0025*Math.max(0,complexity-2)};}
  function evolveSession(opts){
    const seed=Number(opts.seed||1),r=rng(seed+612299);let population=Math.max(40,Math.min(400,Number(opts.population||140)));
    let members=seedPopulation(r,population,opts.macro||[]),gen=0,history=[],best=null;
    const maxSize=Math.max(7,Math.min(25,Number(opts.maxSize||19)));
    function generation(){const scores=members.map(m=>evaluate(m,opts.train));scores.sort((a,b)=>b.fitness-a.fitness);
      const review=scores.slice(0,Math.min(scores.length,25)); // candidate selection via validation, not test
      for(const item of review){item.validation=trainingAccuracy({tree:item.tree,fit:item.fit},opts.validation);item.rank=item.validation-0.001*Math.max(0,item.complexity-2);
        if(!best||item.rank>best.rank+1e-8||(Math.abs(item.rank-best.rank)<1e-8&&item.complexity<best.complexity))best={...item,tree:clone(item.tree),generation:gen};}
      history.push({generation:gen,train:scores[0].training,validation:best?best.validation:0,complexity:best?.complexity||0,formula:best?expr(best.tree):''});
      const next=scores.slice(0,Math.min(8,scores.length)).map(o=>clone(o.tree));
      const tournament=()=>{let winner=null;for(let i=0;i<4;i++){const candidate=choose(r,scores.slice(0,Math.min(100,scores.length)));if(!winner||candidate.fitness>winner.fitness)winner=candidate;}return winner.tree;};
      while(next.length<population){let child;const z=r();if(z<.13)child=make(r,randint(r,5)+1);else if(z<.4)child=crossover(tournament(),tournament(),r,maxSize);else child=mutate(tournament(),r,maxSize);
        if(size(child)>maxSize)child=leaf(r);next.push(child);}
      members=next;gen++;
      return {gen,leader:scores[0],best,history:history[history.length-1]};}
    return {generation,get generationCount(){return gen},get best(){return best},get history(){return history},get popSize(){return population}};
  }
  function asSymbol(best){if(!best)return null;return {tree:best.tree,fit:best.fit};}
  return {rng,tasks,makeSamples,partition,fitLinear,knn,modelAcc,fitThreshold,evalTree,expr,size,clone,accuracy,trainingAccuracy,predict,evolveSession,asSymbol};
});
