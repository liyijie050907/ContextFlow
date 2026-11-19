import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function moduleAt(path){
  const {outputFiles}=await build({entryPoints:[path],bundle:true,format:'esm',write:false,platform:'node'});
  return import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
}
const {CardRound}=await moduleAt('src/card-round.ts');
const {initialState,previewMerge,mergeState,validateState,backupEnvelope,readBackup}=await moduleAt('src/domain.ts');
test('round follows ungraded cards, including when starting partway through',()=>{
  const r=new CardRound(['a','b','c']);
  r.grade('b','again');assert.equal(r.nextUnseen(1),2);
  r.grade('c','pass');assert.equal(r.nextUnseen(2),0);
  r.grade('a','pass');assert.equal(r.nextUnseen(0),-1);assert.deepEqual(r.missed,['b']);
  r.grade('other','again');r.grade('b','pass');assert.equal(r.marks.size,3);assert.deepEqual(r.missed,[]);
});
test('card self-checks round-trip; legacy backups and per-sense merge choices work',async()=>{
  const legacy=initialState('v');delete legacy.cardChecks;
  assert.deepEqual(await readBackup(await backupEnvelope(legacy)),legacy);
  const current=structuredClone(legacy);
  current.cardChecks=[{id:'sense',mark:'again',updatedAt:current.updatedAt}];
  assert.deepEqual(await readBackup(await backupEnvelope(current)),current);
  assert.equal(previewMerge(legacy,current).added,1);
  assert.deepEqual(mergeState(current,legacy).cardChecks,current.cardChecks);
  const second=structuredClone(current);second.cardChecks[0].mark='pass';
  assert.equal(previewMerge(current,second).conflicts,1);
  assert.equal(mergeState(current,second,true).cardChecks[0].mark,'pass');
  assert.equal(mergeState(current,second,false).cardChecks[0].mark,'again');
  assert.deepEqual(current.reviews,[]);
  const invalid=structuredClone(second);invalid.cardChecks.push({...invalid.cardChecks[0]});
  assert.throws(()=>validateState(invalid));invalid.cardChecks=[{...invalid.cardChecks[0],mark:'unknown'}];assert.throws(()=>validateState(invalid));
});

const {notebookStatus,matchesSearch}=await moduleAt('src/notebook-status.ts');
test('search normalizes full-width text, spaces, case and apostrophes',()=>{
  assert(matchesSearch('  ＣＡＭＥＲＡ   照 ',['Camera','照相机']));
  assert(matchesSearch("teacher's",['Teacher’s desk']));
  assert(!matchesSearch('不存在',['camera','照相机']));
});
test('notebook filters reflect new cards, personal marks and the newest formal review',()=>{
  const at='2026-11-19T12:00:00Z',now=Date.parse(at);
  const check=mark=>({id:'camera',mark,updatedAt:at});
  const formal={id:'camera',lastAt:'2026-11-17T12:00:00Z',nextAt:'2026-12-17T12:00:00Z',mastered:true};
  assert.equal(notebookStatus(undefined,undefined,now),'due');
  assert.equal(notebookStatus(formal,check('again'),now),'due');
  assert.equal(notebookStatus(formal,check('pass'),now),'learning');
  assert.equal(notebookStatus(undefined,check('pass'),now+86400000),'due');
  assert.equal(notebookStatus(undefined,check('mastered'),now),'mastered');
  assert.equal(notebookStatus({...formal,lastAt:'2026-11-20T12:00:00Z'},check('again'),now),'mastered');
});
