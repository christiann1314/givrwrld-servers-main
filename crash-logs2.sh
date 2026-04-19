#!/usr/bin/env bash
echo "===== CRASHED SERVERS - LAST 25 LINES EACH ====="
echo ""
for PAIR in \
  "055dc41c-36f2-46cd-8665-7ebe4102f7cd:Factorio" \
  "4063fc82-f1e1-4330-995c-30fbe5f93859:Among-Us-2" \
  "4c82ebc7-7545-48b0-b3ac-21c433e439aa:Among-Us-1" \
  "4d802166-559d-4a85-9361-4b57afe68d79:Vintage-Story" \
  "593c8f3d-7d02-4ac7-91e9-360b305804b4:Enshrouded" \
  "985bbb9e-7116-493a-b64a-b8fd1aa689d9:Mindustry" \
  "9fffe199-e319-4864-9f1a-a404d6af3692:Rimworld" \
  "b6f5bb2a-a51a-4571-ba20-3fe0827de6cd:Veloren" \
  "ba3477d5-b439-4080-86ee-5c8cff5e6675:MC-Purpur"; do
  UUID="${PAIR%%:*}"
  NAME="${PAIR##*:}"
  echo "======= $NAME ======="
  sudo docker logs --tail 25 "${UUID}" 2>&1 | cat -v | tail -25
  echo ""
done
