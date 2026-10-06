#!/usr/bin/env python3
"""Restricted SSH rsync receiver and atomic public snapshot activation."""
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import sqlite3
import subprocess
import sys

ROOT = Path('/var/lib/qiaomu-rss-standby')
def promote(identifier):
    if not re.fullmatch(r'[a-z0-9-]+', identifier): raise ValueError('invalid_generation')
    candidate = ROOT / 'staging' / identifier
    meta = json.loads((candidate / 'manifest.json').read_text())
    if meta['id'] != identifier or meta.get('protocol') != 1: raise ValueError('invalid_manifest')
    database = candidate / 'public.sqlite'
    if database.is_symlink() or hashlib.sha256(database.read_bytes()).hexdigest() != meta['sha256']: raise ValueError('checksum_mismatch')
    with sqlite3.connect('file:' + str(database) + '?mode=ro', uri=True) as db:
        if db.execute('PRAGMA quick_check').fetchone()[0] != 'ok': raise ValueError('database_invalid')
        if set(x[0] for x in db.execute("SELECT name FROM sqlite_master WHERE type='table'")) != {'entries', 'sources', 'images'}: raise ValueError('private_tables_present')
        if not db.execute('SELECT COUNT(*) FROM entries').fetchone()[0]: raise ValueError('empty_snapshot')
    for p in candidate.rglob('*'):
        if p.is_symlink(): raise ValueError('unexpected_symlink')
        relative=p.relative_to(candidate).as_posix()
        if relative not in {'public.sqlite', 'manifest.json', 'wechat-images'} and not re.fullmatch(r'wechat-images/[a-f0-9]{64}\.bin',relative): raise ValueError('unexpected_file')
        os.chown(p, -1, ROOT.stat().st_gid)
        p.chmod(0o2750 if p.is_dir() else 0o640)
    os.chown(candidate, -1, ROOT.stat().st_gid)
    candidate.chmod(0o2750)
    final = ROOT / 'generations' / identifier
    if final.exists(): raise ValueError('generation_exists')
    candidate.rename(final)
    previous = (ROOT / 'current').resolve() if (ROOT / 'current').exists() else None
    temp = ROOT / 'next'
    temp.unlink(missing_ok=True); temp.symlink_to(final); temp.replace(ROOT / 'current')
    # Keep the previous generation for in-flight readers and immediate rollback.
    for old in (ROOT / 'generations').iterdir():
        if old != final and old != previous: shutil.rmtree(old)
    print(json.dumps({'id': identifier, 'ok': True}))

if __name__ == '__main__':
    args = shlex.split(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    if len(args) == 2 and args[0] == 'promote': promote(args[1])
    elif len(args) >= 5 and args[:2] == ['rsync', '--server'] and '--sender' not in args and '--daemon' not in args:
        destination = Path(args[-1]).resolve()
        if not str(destination).startswith(str(ROOT / 'staging') + '/') or not re.fullmatch(r'[a-z0-9-]+', destination.name): raise SystemExit('Destination refused')
        allowed = {'--delete', '--delete-after', '--partial', '--delay-updates'}
        options=args[2:-2]
        for index,arg in enumerate(options):
            if arg == '--link-dest':
                if index+1 >= len(options) or options[index+1] != str(ROOT / 'current'): raise SystemExit('Basis refused')
                continue
            if index and options[index-1] == '--link-dest': continue
            if arg.startswith('--') and arg not in allowed and not arg.startswith('--link-dest='): raise SystemExit('Option refused: '+arg)
            if not arg.startswith('-'): raise SystemExit('Unexpected operand')
            if arg.startswith('--link-dest=') and arg.split('=',1)[1] != str(ROOT / 'current'): raise SystemExit('Basis refused')
        if args[-2] != '.': raise SystemExit('Protocol refused')
        destination.mkdir(parents=True, exist_ok=True)
        os.execv('/usr/bin/rsync', ['/usr/bin/rsync'] + args[1:])
    else: raise SystemExit('Command refused')
