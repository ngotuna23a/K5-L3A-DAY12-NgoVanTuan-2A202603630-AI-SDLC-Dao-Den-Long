import {createServer}from'node:http';
import{readFile,stat}from'node:fs/promises';
import{resolve,extname,sep}from'node:path';
import{pathToFileURL}from'node:url';
import{readLeaderboard,saveScore,exportLeaderboard,defaultLeaderboardPath}from'./leaderboard-store.mjs';
const root=resolve(import.meta.dirname,'../dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json'};
export async function startServer({port=Number(process.env.PORT??4173),dataFile=defaultLeaderboardPath}={}){
  await stat(resolve(root,'index.html'));
  const server=createServer(async(req,res)=>{
    const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    try{
      const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(path==='/api/leaderboard'){
        if(req.method==='GET'){json(200,readLeaderboard(dataFile));return;}
        if(req.method==='POST'){
          let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>4096){json(413,{error:'Dữ liệu quá dài.'});return;}body+=chunk;}
          try{json(200,saveScore(dataFile,JSON.parse(body)));}catch(e){json(400,{error:e.message});}return;
        }
        json(405,{error:'Method not allowed'});return;
      }
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
      const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
      const content=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:content);
    }catch(e){if(e.code==='ENOENT'||e instanceof URIError){res.writeHead(404).end('Not found');}else json(500,{error:'Không đọc được dữ liệu cục bộ.'});}
  });
  await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});
  return{server,url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(ok=>server.close(ok))};
}
async function main(){const args=process.argv.slice(2),o={};for(let i=0;i<args.length;i+=2){if(!['--export-leaderboard','--data-file','--port'].includes(args[i])||args[i+1]===undefined||args[i]in o)throw Error('Invalid argument '+args[i]);o[args[i]]=args[i+1];}const dataFile=o['--data-file']??defaultLeaderboardPath;if(o['--export-leaderboard']){exportLeaderboard(o['--export-leaderboard'],dataFile);console.log('Đã xuất bảng xếp hạng: '+o['--export-leaderboard']);return;}const port=Number(o['--port']??process.env.PORT??4173);if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid port');const app=await startServer({port,dataFile});console.log('Đảo Đèn Lồng: '+app.url.replace('127.0.0.1','localhost'));}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.code==='ENOENT'?'Run npm run build first.':e.message);process.exitCode=1;});
