#!/usr/bin/env python3
"""Download and verify an encrypted R2 backup into a NEW isolated directory."""
import argparse, hashlib, hmac, json, os
from pathlib import Path
import sqlite3, subprocess, tarfile, urllib.request
p=argparse.ArgumentParser();p.add_argument('manifest');p.add_argument('destination');args=p.parse_args()
if not args.manifest.startswith('hourly/') or '..' in args.manifest:raise SystemExit('Invalid manifest key')
destination=Path(args.destination);destination.mkdir(mode=0o700,parents=False,exist_ok=False)
base=os.environ['RSS_DR_CONTROL_URL'];key=os.environ['RSS_DR_CONTROL_KEY'];password=Path(os.environ['RSS_DR_BACKUP_PASSWORD_FILE'])
def download(name):
 request=urllib.request.Request(base+'/__dr/backup/'+name,headers={'User-Agent':'Qiaomu-RSS-DR/1.0','Authorization':'Bearer '+key})
 with urllib.request.urlopen(request,timeout=120) as r:return r.read()
meta=json.loads(download(args.manifest));mac=hmac.new(hashlib.sha256(password.read_bytes()+b'RSS-DR-MAC-v1').digest(),digestmod=hashlib.sha256)
encrypted=destination/'archive.enc'
with encrypted.open('wb') as f:
 for part in meta['parts']:
  if not part['key'].startswith(args.manifest.removesuffix('manifest.json')):raise SystemExit('Part outside backup')
  data=download(part['key'])
  if len(data)!=part['size'] or hashlib.sha256(data).hexdigest()!=part['sha256']:raise SystemExit('Part checksum failed')
  mac.update(data);f.write(data)
if not hmac.compare_digest(mac.hexdigest(),meta['hmac']):raise SystemExit('Backup authentication failed')
archive=destination/'archive.tar.gz'
subprocess.run(['openssl','enc','-d','-aes-256-cbc','-pbkdf2','-iter','200000','-in',str(encrypted),'-out',str(archive),'-pass','file:'+str(password)],check=True)
with tarfile.open(archive,'r:gz') as t:t.extractall(destination/'restored',filter='data')
db=destination/'restored/qmreader.sqlite'
if hashlib.sha256(db.read_bytes()).hexdigest()!=meta['databaseSha256']:raise SystemExit('Database checksum failed')
with sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True) as c:
 if c.execute('PRAGMA quick_check').fetchone()[0]!='ok':raise SystemExit('Database integrity failed')
encrypted.unlink();archive.unlink();print(json.dumps({'ok':True,'snapshot':meta['id'],'restored':str(db.parent)}))
