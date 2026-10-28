/* GENESIS 03: explicit symbolic feature construction. No target-rule-specific code in the learner. */
(function (root) {
  'use strict';
  function rng(seed){let s=seed>>>0;return function(){s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  const worlds={
    xor:{name:'XOR · 엇갈린 사분면',fn:(x,y)=>+(x*y>0),description:'대각선 방향의 두 구역이 같은 분류인 세계'},
    circle:{name:'원형 영역',fn:(x,y)=>+(x*x+y*y<.44),description:'중심까지의 거리가 일정한 범위 안이면 1'},
    parabola:{name:'포물선 경계',fn:(x,y)=>+(y>.05+.85*x*x),description:'곡선 위쪽과 아래쪽의 분류가 다른 세계'},
    diagonal:{name:'직선 경계 · 대조군',fn:(x,y)=>+(x+y>.22),description:'새 특징 없이도 선형 모델이 풀 수 있는 세계'},
    wave:{name:'물결 경계 · 한계 실험',fn:(x,y)=>+(Math.sin(3.5*Math.PI*x)>0),description:'현재 연산 문법에 없는 여러 개의 세로 줄무늬 영역'}
  };
  const anchors=(()=>{const r=rng(34923);return Array.from({length:16},()=>[r()*1.8-.9,r()*1.8-.9]);})();
  function fingerprint(v){
    const mean=v.reduce((a,b)=>a+b,0)/v.length;
    let dev=Math.sqrt(v.reduce((a,b)=>a+(b-mean)*(b-mean),0)/v.length);
    if(dev<1e-9||!isFinite(dev))return null;
    let norm=v.map(a=>(a-mean)/dev), first=norm.find(a=>Math.abs(a)>1e-7)||0;
    if(first<0)norm=norm.map(a=>-a);
    return norm.map(a=>Math.round(a*2000)).join(':');
  }
  function makeLibrary(maxComplexity=7){
    const levels=new Map(),all=[],seen=new Set();
    function add(node){
      const sig=fingerprint(node.probes);if(!sig||seen.has(sig))return;
      seen.add(sig);all.push(node);if(!levels.has(node.cost))levels.set(node.cost,[]);levels.get(node.cost).push(node);
    }
    add({repr:'x',op:'x',cost:1,probes:anchors.map(p=>p[0])});
    add({repr:'y',op:'y',cost:1,probes:anchors.map(p=>p[1])});
    for(let complexity=3;complexity<=maxComplexity;complexity+=2){
      for(let left=1;left<complexity;left+=2){
        const right=complexity-1-left;
        if(right<1)continue;
        for(const a of (levels.get(left)||[])) for(const b of (levels.get(right)||[])){
          for(const op of ['+','−','×']){
            if((op==='+'||op==='×')&&a.repr>b.repr)continue;
            if(op==='−'&&a.repr===b.repr)continue;
            const probes=a.probes.map((p,i)=>op==='+'?p+b.probes[i]:op==='−'?p-b.probes[i]:p*b.probes[i]);
            add({op,a,b,cost:complexity,repr:`(${a.repr} ${op} ${b.repr})`,probes});
          }
        }
      }
    }
    return all;
  }
  function value(node,x,y){
    if(node.op==='x')return x;if(node.op==='y')return y;
    const a=value(node.a,x,y),b=value(node.b,x,y);
    return node.op==='+'?a+b:node.op==='−'?a-b:a*b;
  }
  function fitLinear(data){
    if(data.length<4)return {w:[0,0,0],predict:(x,y)=>0};
    let w=[0,0,0];
    for(let iter=0;iter<500;iter++){
      let g0=0,g1=0,g2=0;
      for(const d of data){let z=Math.max(-30,Math.min(30,w[0]+w[1]*d.x+w[2]*d.y));let err=1/(1+Math.exp(-z))-d.label;g0+=err;g1+=err*d.x;g2+=err*d.y;}
      const rate=.9/data.length;
      w[0]-=rate*g0;w[1]-=rate*(g1+.006*w[1]*data.length);w[2]-=rate*(g2+.006*w[2]*data.length);
    }
    return {w,predict:(x,y)=>+(w[0]+w[1]*x+w[2]*y>=0)};
  }
  function fitThreshold(node,training){
    let items=training.map(d=>({v:value(node,d.x,d.y),y:d.label})).sort((a,b)=>a.v-b.v);
    let totalPos=items.reduce((s,d)=>s+d.y,0),totalNeg=items.length-totalPos;
    let leftPos=0,leftNeg=0,best={mistakes:Infinity,threshold:0,positiveRight:true};
    function consider(thresh){
      const rightPos=totalPos-leftPos,rightNeg=totalNeg-leftNeg;
      const errRight=leftPos+rightNeg,errLeft=leftNeg+rightPos;
      if(errRight<best.mistakes)best={mistakes:errRight,threshold:thresh,positiveRight:true};
      if(errLeft<best.mistakes)best={mistakes:errLeft,threshold:thresh,positiveRight:false};
    }
    if(!items.length)return best;
    consider(items[0].v-1e-6);
    for(let i=0;i<items.length;){
      let j=i;while(j<items.length&&Math.abs(items[j].v-items[i].v)<1e-10)j++;
      for(let k=i;k<j;k++){if(items[k].y)leftPos++;else leftNeg++;}
      consider(j<items.length?(items[j-1].v+items[j].v)/2:items[j-1].v+1e-6);
      i=j;
    }
    return best;
  }
  const thresholdPredict=(node,fit,x,y)=>+(fit.positiveRight?(value(node,x,y)>=fit.threshold):(value(node,x,y)<fit.threshold));
  function fitSymbolic(training,validation,library){
    if(training.length<10||validation.length<4)return {ready:false,reason:'훈련 10개·검증 4개 이상 필요'};
    let best=null;
    for(const node of library){
      const fit=fitThreshold(node,training);
      let valWrong=0;
      for(const d of validation){if(thresholdPredict(node,fit,d.x,d.y)!==d.label)valWrong++;}
      const trError=fit.mistakes/training.length,valError=valWrong/validation.length;
      // Simplicity penalty discourages complex formulas with tiny gains.
      const score=.55*valError+.45*trError+.008*(node.cost-1);
      if(best===null||score<best.score-1e-12||Math.abs(score-best.score)<1e-12&&node.cost<best.node.cost){
        best={ready:true,node,fit,score,trError,valError,predict:(x,y)=>thresholdPredict(node,fit,x,y)};
      }
    }
    return best;
  }
  function fitMemory(training){
    return {predict:(x,y)=>{
      if(!training.length)return 0;
      const nearest=training.map(p=>({dist:(p.x-x)**2+(p.y-y)**2,label:p.label})).sort((a,b)=>a.dist-b.dist).slice(0,Math.min(5,training.length));
      let z=0,tot=0;for(const n of nearest){const weight=1/(Math.sqrt(n.dist)+.045);z+=weight*n.label;tot+=weight;}
      return +(z>=.5*tot);
    }};
  }
  function accuracy(model,data){return data.reduce((s,p)=>s+(model.predict(p.x,p.y)===p.label),0)/Math.max(1,data.length);}
  function createSamples(seed,count,world,noise=0,sampling='uniform'){
    const r=rng(seed),w=worlds[world];const points=[];
    for(let i=0;i<count;i++){let x=(sampling==='left'?r()-1:r()*2-1),y=r()*2-1;let label=w.fn(x,y);if(r()<noise)label=1-label;points.push({x,y,label});}
    return points;
  }
  function makeSplit(samples,seed=42){const r=rng(seed);let train=[],validation=[];samples.forEach(d=>{(r()<.22?validation:train).push(d);});return {train,validation};}
  root.GENESIS_CORE={rng,worlds,makeLibrary,value,fitLinear,fitThreshold,fitSymbolic,fitMemory,accuracy,createSamples,makeSplit};
})(typeof globalThis!=='undefined'?globalThis:this);
