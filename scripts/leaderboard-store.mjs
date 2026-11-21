import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{dirname,resolve}from'node:path';
import{sortEntries,addEntry}from'../src/leaderboard.mjs';
export const defaultLeaderboardPath=resolve(import.meta.dirname,'../data/leaderboard.json');
export function readLeaderboard(path=defaultLeaderboardPath){try{const data=JSON.parse(readFileSync(path,'utf8'));return{entries:sortEntries(data.entries)};}catch(e){if(e.code==='ENOENT')return{entries:[]};throw e;}}
export function saveScore(path,payload){const data=readLeaderboard(path),next={entries:addEntry(data.entries,payload)};mkdirSync(dirname(resolve(path)),{recursive:true});writeFileSync(path,JSON.stringify(next,null,2)+'\n');return next;}
export function exportLeaderboard(out,path=defaultLeaderboardPath){const data=readLeaderboard(path);writeFileSync(out,JSON.stringify(data,null,2)+'\n');return data;}
