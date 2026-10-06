import hashlib,json,sqlite3,tempfile,unittest
from pathlib import Path
import receiver
class ReceiverTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.old=receiver.ROOT;receiver.ROOT=Path(self.tmp.name).resolve()
  (receiver.ROOT/'generations').mkdir();self.candidate=receiver.ROOT/'staging/s1';self.candidate.mkdir(parents=True)
  self.database=self.candidate/'public.sqlite'
  with sqlite3.connect(self.database) as db:db.executescript('CREATE TABLE sources(id);CREATE TABLE entries(id);INSERT INTO entries VALUES (1);CREATE TABLE images(token);')
  self.meta={'protocol':1,'id':'s1','sha256':hashlib.sha256(self.database.read_bytes()).hexdigest()}
  self.save()
 def save(self):(self.candidate/'manifest.json').write_text(json.dumps(self.meta))
 def tearDown(self):receiver.ROOT=self.old;self.tmp.cleanup()
 def test_atomic_public_generation(self):
  receiver.promote('s1');self.assertEqual((receiver.ROOT/'current').resolve(),receiver.ROOT/'generations/s1')
 def test_corrupt_checksum_refused(self):
  self.database.write_bytes(b'corrupt')
  with self.assertRaisesRegex(ValueError,'checksum'):receiver.promote('s1')
 def test_private_tables_refused(self):
  with sqlite3.connect(self.database) as db:db.execute('CREATE TABLE accounts(secret)')
  self.meta['sha256']=hashlib.sha256(self.database.read_bytes()).hexdigest();self.save()
  with self.assertRaisesRegex(ValueError,'private_tables'):receiver.promote('s1')
 def test_secret_symlink_refused(self):
  (self.candidate/'key').symlink_to('/etc/passwd')
  with self.assertRaisesRegex(ValueError,'symlink'):receiver.promote('s1')

 def test_unexpected_secret_file_refused(self):
  (self.candidate/'private.env').write_text('SECRET')
  with self.assertRaisesRegex(ValueError,'unexpected_file'):receiver.promote('s1')
