import hashlib,http.client,json,sqlite3,tempfile,threading,unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
import standby
class MediaTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.oldroot=standby.ROOT;self.oldkey=standby.KEY;standby.ROOT=self.root;standby.KEY='test'
  self.token='signed.'+'x'*22;self.digest=hashlib.sha256(b'public').hexdigest();self.content=b'\x89PNG\r\n\x1a\npublic'
  (self.root/'manifest.json').write_text(json.dumps({'protocol':1,'id':'s1','revision':0,'createdAt':1}))
  (self.root/'wechat-images').mkdir();(self.root/'wechat-images'/ (self.digest+'.bin')).write_bytes(self.content);(self.root/'wechat-images/.signing-key').write_text('SECRET')
  with sqlite3.connect(self.root/'public.sqlite') as db:db.execute('CREATE TABLE images(token,digest,mime)');db.execute('INSERT INTO images VALUES(?,?,?)',[self.token,self.digest,'image/png'])
  self.server=ThreadingHTTPServer(('127.0.0.1',0),standby.Handler);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
 def tearDown(self):
  self.server.shutdown();self.server.server_close();self.thread.join();standby.ROOT=self.oldroot;standby.KEY=self.oldkey;self.tmp.cleanup()
 def request(self,path,method='GET',authenticated=True):
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port);c.request(method,path,headers={'X-Rss-Origin-Key':'test'} if authenticated else {});r=c.getresponse();status=r.status;data=r.read();c.close();return status,data
 def test_only_registered_signed_media_is_served(self):
  self.assertEqual(self.request('/media/wechat/'+self.token),(200,self.content))
  for token in ['.signing-key','../.signing-key','unregistered.'+'x'*22]:self.assertEqual(self.request('/media/wechat/'+token)[0],404)
 def test_origin_auth_and_write_rejection(self):
  self.assertEqual(self.request('/media/wechat/'+self.token,authenticated=False)[0],403)
  self.assertEqual(self.request('/api/entries',method='DELETE')[0],405)
