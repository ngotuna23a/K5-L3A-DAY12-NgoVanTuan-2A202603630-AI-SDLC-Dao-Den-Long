import{readdirSync,readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{join,relative,resolve}from'node:path';
import{deflateRawSync}from'node:zlib';
import{createHash}from'node:crypto';
// Portable ZIP writer using only Node standard library; no packaging dependency.
const roots=['dist','src','scripts','tests','docs'],files=['README.md','CHANGELOG.md','CREDITS.md','LICENSE','AGENTS.md','package.json','package-lock.json','game.contract.json','index.html','style.css','bench.json','bench.json.frames.json','soak.json'];
function walk(path){for(const item of readdirSync(path,{withFileTypes:true})){const name=join(path,item.name);if(item.isDirectory())walk(name);else if(item.isFile())files.push(name);}}
roots.forEach(walk);files.sort();
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(data){let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
const locals=[],centrals=[],manifest=[];let offset=0;
for(const file of files){const data=readFileSync(file),packed=deflateRawSync(data),name=Buffer.from('dao-den-long-v1.0.0/'+relative('.',file).replaceAll('\\','/')),crc=crc32(data),local=Buffer.alloc(30),central=Buffer.alloc(46);
  local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(0x5821,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
  central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(0x5821,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
  locals.push(local,name,packed);centrals.push(central,name);offset+=local.length+name.length+packed.length;manifest.push({path:file.replaceAll('\\','/'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
const directory=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...locals,directory,end]),out=resolve('artifacts/dao-den-long-v1.0.0.zip');mkdirSync('artifacts',{recursive:true});writeFileSync(out,zip);
writeFileSync('artifacts/manifest.json',JSON.stringify({zip:out,bytes:zip.length,sha256:createHash('sha256').update(zip).digest('hex'),files:manifest},null,2)+'\n');
console.log(JSON.stringify({out,files:files.length,bytes:zip.length,sha256:createHash('sha256').update(zip).digest('hex')}));
