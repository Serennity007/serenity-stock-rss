const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mountLabModeration } = require('./lab-moderation');

function fixture() {
  const routes = {}, deleted = new Set(), calls = [];
  const store = {
    isEntryDeleted: id => deleted.has(id),
    getUserBySessionToken: token => token === 'admin' ? {id:'admin-id',role:'admin'} : token === 'reader' ? {id:'reader-id',role:'user'} : null,
  };
  mountLabModeration({get:(path,handler)=>routes[path]=handler,post:(path,handler)=>routes[path]=handler},{store,deleteEntry:(id,options)=>{calls.push(options);if(id==='missing')return null;deleted.add(id);return{id};}});
  const call = (path, {token='',body={},query={}}={}) => {
    const response={statusCode:200,setHeader(){},status(code){this.statusCode=code;return this;},json(data){this.data=data;return this;}};
    routes[path]({body,query,get:()=>`Bearer ${token}`},response);return response;
  };
  return {call,calls};
}
test('only a live administrator session can delete; public refresh sees the deletion',()=>{
  const {call,calls}=fixture(),route='/api/lab/admin/delete-entry';
  for(const token of ['', 'invite', 'reader'])assert.equal(call(route,{token,body:{entryId:'entry'}}).statusCode,403);
  assert.equal(calls.length,0);
  assert.deepEqual(call('/api/lab/entries/deleted',{query:{ids:'entry,other'}}).data,{deletedIds:[]});
  assert.deepEqual(call(route,{token:'admin',body:{entryId:'entry'}}).data,{ok:true,entryId:'entry'});
  assert.equal(calls[0].userId,'admin-id');
  assert.deepEqual(call('/api/lab/entries/deleted',{query:{ids:'entry,entry,other'}}).data,{deletedIds:['entry']});
  assert.equal(call(route,{token:'admin',body:{entryId:'entry'}}).statusCode,200);
});
test('limits refresh queries and rejects missing article identifiers',()=>{
  const {call,calls}=fixture();
  assert.equal(call('/api/lab/entries/deleted',{query:{ids:Array.from({length:101},(_,i)=>`entry-${i}`).join(',')}}).statusCode,400);
  assert.equal(call('/api/lab/admin/delete-entry',{token:'admin',body:{entryId:''}}).statusCode,400);
  assert.equal(calls.length,0);
  assert.equal(call('/api/lab/admin/delete-entry',{token:'admin',body:{entryId:'missing'}}).statusCode,404);
});
