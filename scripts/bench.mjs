import{writeFileSync,readFileSync,mkdirSync}from'node:fs';
import{dirname,resolve}from'node:path';
import{platform,release}from'node:os';
import{performance}from'node:perf_hooks';
import{startServer}from'./serve.mjs';
import{launchBrowser}from'./browser-driver.mjs';
const processStart=performance.timeOrigin;
async function main(){
  const args=process.argv.slice(2),o={};for(let i=0;i<args.length;i++){if(args[i]==='--headless'){o.headless=true;continue;}if(!['--seed','--duration','--out'].includes(args[i])||args[i+1]===undefined||args[i]in o)throw Error('Invalid argument '+args[i]);o[args[i]]=args[++i];}
  const seed=Number(o['--seed']??42),duration=Number(o['--duration']??30);if(!Number.isSafeInteger(seed)||!Number.isFinite(duration)||duration<=0||duration>600||!o['--out'])throw Error('Expected integer seed, duration (0,600], --out');
  const app=await startServer({port:0});let browser;
  try{
    browser=await launchBrowser({url:app.url+'/?benchmark=1&seed='+seed+'&duration='+duration,headless:o.headless,uncapped:true});
    await browser.until('Boolean(window.__bench)&&window.__bench.done',(duration+30)*1000);
    if(browser.errors.length)throw Error(browser.errors.join('\n'));
    const data=await browser.evaluate('window.__bench.result'),version=JSON.parse(readFileSync(new URL('../dist/build-info.json',import.meta.url)));
    const result={contract_version:'1.3',...data.metrics,load_ms:Math.max(0,data.first_frame_wall_ms-processStart),peak_mem_mb:null,vsync_off:false,renderer:'Three.js '+version.three+' / WebGL2 / '+data.gpu,os:platform()+' '+release(),viewport:[1280,720],requested_duration_s:duration,measured_frame_sum_s:data.frame_ms.reduce((a,b)=>a+b,0)/1000,vsync_note:'Browser rAF scheduling cannot be guaranteed unsynchronized; Chrome uncapping flags were requested.'};
    const out=resolve(o['--out']);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(result,null,2)+'\n');writeFileSync(out+'.frames.json',JSON.stringify({frame_ms:data.frame_ms,scene:data.scene,initial_camera:data.initial_camera})+'\n');
    console.log(JSON.stringify(result));
  }finally{await browser?.close();await app.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
