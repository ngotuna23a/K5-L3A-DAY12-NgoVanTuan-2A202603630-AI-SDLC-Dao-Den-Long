import{readFileSync,writeFileSync}from'node:fs';
import{resolve}from'node:path';
import{pathToFileURL}from'node:url';
import{Game,seededRandom}from'../src/game.mjs';
export function runSoak(tuning,seed=7,nights=10){
  const start=performance.now(),results=[],details=[];let crashes=0,game=new Game(tuning,seed,{},1);
  global.gc?.();const memStart=process.memoryUsage().rss/1048576;
  for(let i=0;i<nights;i++){
    const night=i%3+1,nightSeed=seed+i,random=seededRandom(nightSeed);let move=[0,0];
    try{for(let tick=0;tick<tuning['night'+night+'_duration_s']*60&&['playing','paused'].includes(game.state);tick++){if(tick%30===0){const a=random()*Math.PI*2;move=[Math.cos(a),Math.sin(a)];}game.step({move,jump:random()<.05,dash:random()<.03,pulse:random()<.02,interact:random()<.1});}results.push(game.state);details.push({night,seed:nightSeed,ticks:game.tick,result:game.state});}
    catch(e){crashes++;results.push('error');details.push({night,seed:nightSeed,error:e.message});}
    game=null;global.gc?.();game=new Game(tuning,seed+i+1,{},(i+1)%3+1);global.gc?.();
  }
  const memEnd=process.memoryUsage().rss/1048576;
  return{nights,crashes,results,mem_start_mb:memStart,mem_end_mb:memEnd,duration_s:(performance.now()-start)/1000,details};
}
function main(){const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){if(!['--seed','--nights','--out'].includes(args[i])||args[i+1]===undefined||args[i]in options)throw Error('Invalid argument '+args[i]);options[args[i]]=args[i+1];}const seed=Number(options['--seed']??7),nights=Number(options['--nights']??10);if(!Number.isSafeInteger(seed)||!Number.isSafeInteger(nights)||nights<1||!options['--out'])throw Error('Expected integer seed, positive nights and --out');const tuning=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url))).tuning;const result=runSoak(tuning,seed,nights);writeFileSync(options['--out'],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({nights,crashes:result.crashes,memory_ratio:result.mem_end_mb/result.mem_start_mb,duration_s:result.duration_s}));if(result.crashes>0||result.mem_end_mb>1.2*result.mem_start_mb)process.exitCode=1;}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
