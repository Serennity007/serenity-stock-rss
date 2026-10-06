set -eu
cat > /etc/logrotate.d/qiaomu-rss-dr <<'EOF'
/www/wwwlogs/rss-origin.qiaomu.ai.log /www/wwwlogs/rss-origin.qiaomu.ai.error.log /www/wwwlogs/rss-standby.qiaomu.ai.log /www/wwwlogs/rss-standby.qiaomu.ai.error.log {
 daily
 rotate 7
 maxsize 20M
 missingok
 notifempty
 compress
 delaycompress
 copytruncate
}
EOF
cat > /etc/systemd/system/qiaomu-rss-disk-health.service <<'EOF'
[Unit]
Description=Qiaomu RSS disk capacity and backup freshness
[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /opt/qiaomu-apps/qiaomu-rss-dr/disk-health.py
EOF
cat > /etc/systemd/system/qiaomu-rss-disk-health.timer <<'EOF'
[Unit]
Description=Check Qiaomu RSS disk and backup health every 15 minutes
[Timer]
OnBootSec=120
OnUnitInactiveSec=900
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now qiaomu-rss-disk-health.timer
systemctl start qiaomu-rss-disk-health
