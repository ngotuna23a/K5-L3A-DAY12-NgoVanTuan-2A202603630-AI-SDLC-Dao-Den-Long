import{spawn}from'node:child_process';
import{existsSync,mkdirSync,readFileSync}from'node:fs';
import{resolve}from'node:path';
import{randomUUID}from'node:crypto';
export const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
export function connectCdp(url){
  return new Promise((ok,no)=>{const socket=new WebSocket(url),pending=new Map(),listeners=new Map();let id=0;
    socket.addEventListener('error',no,{once:true});
    socket.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);if(!p)return;pending.delete(r.id);clearTimeout(p.timer);if(r.error)p.no(Error(JSON.stringify(r.error)));else p.ok(r.result);}else for(const cb of listeners.get(r.method)??[])cb(r.params);});
    socket.addEventListener('close',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.no(Error('Browser connection closed'));}pending.clear();});
    socket.addEventListener('open',()=>ok({call(method,params={},timeout=30000){return new Promise((ok,no)=>{const key=++id,timer=setTimeout(()=>{pending.delete(key);no(Error('CDP timeout: '+method));},timeout);pending.set(key,{ok,no,timer});socket.send(JSON.stringify({id:key,method,params}));});},on(method,cb){if(!listeners.has(method))listeners.set(method,new Set());listeners.get(method).add(cb);return()=>listeners.get(method).delete(cb);},close(){socket.close();}}),{once:true});
  });
}
export function chromeBinary(){const paths=[process.env.CHROME_BIN,...(process.platform==='win32'?['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']:process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']:['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser','/opt/google/chrome/chrome'])].filter(Boolean);const found=paths.find(existsSync);if(!found)throw Error('Chrome/Edge not found. Set CHROME_BIN to an installed browser executable.');return found;}
export async function launchBrowser({url,headless=false,uncapped=false,width=1280,height=720}={}){
  const profile=resolve(import.meta.dirname,'../tmp/browser-'+randomUUID());mkdirSync(profile,{recursive:true});
  const args=['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--force-device-scale-factor=1','--window-size='+width+','+height,'--autoplay-policy=no-user-gesture-required','--app=about:blank'];
  if(headless)args.unshift('--headless=new');if(uncapped)args.unshift('--disable-frame-rate-limit','--disable-gpu-vsync');
  const child=spawn(chromeBinary(),args,{stdio:'ignore',windowsHide:true});let failure;child.once('error',e=>{failure=e;});
  let port;for(let n=0;n<200;n++){if(failure)throw failure;if(child.exitCode!==null)throw Error('Chrome exited before CDP became ready');try{port=Number(readFileSync(resolve(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);if(port)break;}catch{}await delay(50);}if(!port){child.kill();throw Error('Chrome CDP start timeout');}
  const meta=await fetch('http://127.0.0.1:'+port+'/json/version').then(r=>r.json()),tabs=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());const target=tabs.find(t=>t.type==='page');if(!target)throw Error('No browser page target');
  const browser=await connectCdp(meta.webSocketDebuggerUrl),page=await connectCdp(target.webSocketDebuggerUrl),errors=[];
  page.on('Runtime.exceptionThrown',p=>errors.push(p.exceptionDetails.exception?.description??p.exceptionDetails.text));page.on('Log.entryAdded',p=>{if(p.entry.level==='error')errors.push(p.entry.text);});
  await page.call('Runtime.enable');await page.call('Page.enable');await page.call('Log.enable');await page.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  const evaluate=async expression=>{const r=await page.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  if(url)await page.call('Page.navigate',{url});
  return{page,browser,errors,profile,evaluate,async until(expression,timeout=20000){const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(expression))return;await delay(50);}throw Error('Timed out: '+expression);},async close(){await browser.call('Browser.close').catch(()=>{});page.close();browser.close();if(child.exitCode===null)child.kill();}};
}
