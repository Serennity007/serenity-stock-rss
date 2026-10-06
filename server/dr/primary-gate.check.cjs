const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {middleware,critical}=require('./primary-gate.cjs');
test('only visibility mutations need coordination',()=>{
 for(const [path,method,expected] of [['/api/admin/entry/x','DELETE',true],['/api/sources/x/toggle','POST',true],['/api/admin/sources','PUT',true],['/api/entry/x','GET',false],['/api/login','POST',false]])assert.equal(critical({path,method}),expected);
});
test('unreachable coordinator blocks mutation before next handler',async()=>{
 const original=global.fetch;global.fetch=async()=>{throw Error('offline')};let called=false;
 const res={status(c){assert.equal(c,503);return this},json(x){assert.equal(x.error,'dr_gate_unavailable')}};
 try{await middleware({origin:'https://test',key:'x'})({path:'/api/admin/entry/x',method:'DELETE'},res,()=>called=true);assert.equal(called,false)}finally{global.fetch=original}
});
test('successful mutation finishes ticket, server failure deliberately leaves pending',async()=>{
 const original=global.fetch;let calls=[];global.fetch=async u=>{calls.push(u);return new Response('{}')};
 try{for(const status of [200,500]){calls=[];const res=new EventEmitter();res.statusCode=status;await middleware({origin:'https://test',key:'x'})({path:'/api/admin/entry/x',method:'DELETE'},res,()=>{});res.emit('finish');await new Promise(r=>setImmediate(r));assert.deepEqual(calls,status===200?['https://test/__dr/start','https://test/__dr/finish']:['https://test/__dr/start'])}}finally{global.fetch=original}
});
