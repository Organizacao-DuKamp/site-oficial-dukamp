import { execFileSync, spawnSync } from "node:child_process";
import { symlinkSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const baseline = mkdtempSync(join(tmpdir(), "dukamp-type-baseline-"));
const compiler = resolve("node_modules/typescript/bin/tsc");
function diagnostics(cwd) {
  const r=spawnSync(process.execPath,[compiler,"--noEmit","--pretty","false"],{cwd,encoding:"utf8"});
  if(r.error)throw r.error;
  if(r.status!==0 && !r.stdout.includes("error TS"))throw Error(r.stderr || r.stdout);
  return r.stdout.split("\n").filter(line=>line.includes("error TS")).map(line=>line.replace(/\(\d+,\d+\)/,"(line)"));
}
try {
 execFileSync("git",["fetch","--depth=1","origin","057b576b5c2fad5ae8938cfb1d27c062800d47ff"],{stdio:"pipe"});
 execFileSync("git",["worktree","add","--detach",baseline,"057b576b5c2fad5ae8938cfb1d27c062800d47ff"],{stdio:"pipe"});
 symlinkSync(resolve("node_modules"),join(baseline,"node_modules"),"dir");
 const old=diagnostics(baseline),current=diagnostics(process.cwd()),counts=new Map();
 for(const message of old)counts.set(message,(counts.get(message)||0)+1);
 const added=current.filter(message=>{const n=counts.get(message)||0;if(n){counts.set(message,n-1);return false;}return true;});
 console.log(JSON.stringify({baseline:old.length,current:current.length,newErrors:added},null,2));
 if(added.length)process.exitCode=1;
} finally {
 try {execFileSync("git",["worktree","remove","--force",baseline],{stdio:"pipe"});} catch {rmSync(baseline,{recursive:true,force:true});}
}
