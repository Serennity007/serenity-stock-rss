#!/usr/bin/env python3
"""Local capacity/backup-age check. Never deletes product data."""
import json,shutil,time
from pathlib import Path
usage=shutil.disk_usage('/');used=round(100*usage.used/usage.total,1);free=round(usage.free/1024**3,2)
report={'diskUsedPercent':used,'freeGiB':free,'ok':used<85 and free>=5}
for name,max_age in [('last-sync.json',900),('last-backup.json',7200)]:
 path=Path('/var/lib/qiaomu-rss-backup')/name
 if path.exists():
  data=json.loads(path.read_text());stamp=data['completedAt'];stamp=stamp/1000 if stamp>10**11 else stamp;age=round(time.time()-stamp)
  report[name+'AgeSeconds']=age
  if age>max_age:report['ok']=False
 elif Path('/opt/qiaomu-apps/qmreader/data/qmreader.sqlite').exists():report[name+'Missing']=True;report['ok']=False
snapshot=Path('/var/lib/qiaomu-rss-standby/current/manifest.json')
if snapshot.exists():
 age=round(time.time()-json.loads(snapshot.read_text())['createdAt']/1000);report['standbySnapshotAgeSeconds']=age
 if age>900:report['ok']=False
print(json.dumps(report));raise SystemExit(0 if report['ok'] else 1)
