#!/usr/bin/env python3
"""Keep deletion coordination mounted after subsequent Reader deployments."""
import hashlib,os
from pathlib import Path
import shutil,subprocess
app=Path('/opt/qiaomu-apps/qmreader');server=app/'server.js';source=server.read_text()
marker="app.use(require('/opt/qiaomu-apps/qiaomu-rss-dr/primary-gate.cjs').middleware());"
if marker not in source:
 needle="app.disable('x-powered-by');"
 if source.count(needle)!=1:raise SystemExit('Reader middleware mount changed; review required')
 backup=app/'.deploy-backups/rss-dr-mount';backup.mkdir(parents=True,exist_ok=True)
 shutil.copy2(server,backup/(hashlib.sha256(source.encode()).hexdigest()+'.js'))
 temporary=app/'server.dr-patch-tmp.js';temporary.write_text(source.replace(needle,marker+'\n'+needle));temporary.chmod(server.stat().st_mode & 0o777)
 subprocess.run(['/usr/bin/node','--check',str(temporary)],check=True);os.replace(temporary,server)
