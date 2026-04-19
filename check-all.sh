#!/usr/bin/env bash
KEY="ptlc_7zzeOCln83YFMFzkZckJM6m9C4sMBIGJmADKwlj41MpjIPNvp4LzSv3u0Ym"
PANEL="https://panel.givrwrldservers.com"

for PAIR in "b5170dcd:Terraria" "abf43eee:Ark" "ba3477d5:MC-Purpur" "4c82ebc7:Among-Us-1" "055dc41c:Factorio" "985bbb9e:Mindustry" "9fffe199:Rimworld" "b73f41ba:Teeworlds" "b6f5bb2a:Veloren" "4d802166:Vintage-Story" "f1ec0c70:Rust-Oxide" "bd9503b8:Rust-Vanilla" "ea7b71a4:Terraria-2" "3233bb5c:Terraria-tMod" "06664060:Palworld" "593c8f3d:Enshrouded" "4063fc82:Among-Us-2"; do
  ID="${PAIR%%:*}"
  NAME="${PAIR##*:}"
  LINE=$(curl -s -H "Authorization: Bearer $KEY" -H "Accept: application/json" \
    "$PANEL/api/client/servers/$ID/resources" | python3 -c "
import sys,json
d=json.load(sys.stdin)
a=d.get('attributes',{})
r=a.get('resources',{})
print(f\"{a.get('current_state','?'):10} mem={r.get('memory_bytes',0)//1024//1024}MB\")
" 2>/dev/null || echo "ERROR")
  printf "%-16s %s\n" "$NAME" "$LINE"
done
