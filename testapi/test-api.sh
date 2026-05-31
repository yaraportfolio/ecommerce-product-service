#!/bin/sh
set -e

# --- CONFIGURATION ---
LOG_FILE="test-results.log"
HTML_FILE="test-api-report.html"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Initialisation du Log Console (Inchangé)
echo "Product Service API Full Suite - $(date)" > "$LOG_FILE"
echo "----------------------------------------------------------------------" >> "$LOG_FILE"
printf "%-10s | %-40s | %s\n" "STATUS" "TEST DESCRIPTION" "RESULT" | tee -a "$LOG_FILE"
echo "----------------------------------------------------------------------" >> "$LOG_FILE"

# 2. Initialisation du Dashboard HTML (Nouveau look harmonisé)
cat <<EOF > "$HTML_FILE"
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f4f7f9; padding: 20px; }
        .container { max-width: 850px; margin: auto; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; padding: 20px; border-radius: 12px; text-align: center; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 25px;
            width: 90%; margin-left: auto; margin-right: auto;
        }
        .test-card { background: white; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 6px solid #ccc; }
        .PASS { border-left-color: #4caf50; }
        .FAIL { border-left-color: #f44336; }
        .badge { padding: 6px 12px; margin-left: 10px; border-radius: 4px; font-weight: bold; font-size: 0.8em; color: white; }
        .bg-PASS { background: #4caf50; }
        .bg-FAIL { background: #f44336; }
        .tech-info { font-size: 0.8em; color: #7f8c8d; font-family: monospace; margin-top: 5px; word-break: break-all; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏷️ PRODUCT SERVICE DASHBOARD</h1>
            <p>Product-Service | Port: $SERVICE_PORT</p>
        </div>
EOF

run_test() {
  DESC="$1"
  CMD="$2"
  DISPLAY_CMD="$3"
  [ -z "$DISPLAY_CMD" ] && DISPLAY_CMD="$CMD"

  if eval "$CMD" > /dev/null 2>&1; then
    printf "${GREEN}%-10s${NC} | %-40s | Success\n" "PASS ✅" "$DESC" | tee -a "$LOG_FILE"
    echo "<div class='test-card PASS'><div><strong>$DESC</strong><div class='tech-info'>$DISPLAY_CMD</div></div><span class='badge bg-PASS'>PASS</span></div>" >> "$HTML_FILE"
  else
    printf "${RED}%-10s${NC} | %-40s | Error\n" "FAIL ❌" "$DESC" | tee -a "$LOG_FILE"
    echo "<div class='test-card FAIL'><div><strong>$DESC</strong><div class='tech-info'>$DISPLAY_CMD</div></div><span class='badge bg-FAIL'>FAIL</span></div>" >> "$HTML_FILE"
    echo "</div></body></html>" >> "$HTML_FILE"
    kill $SERVICE_PID 2>/dev/null || true
    exit 1
  fi
}

# --- DÉMARRAGE DU SERVICE ---
node src/server.js > service-output.log 2>&1 &
SERVICE_PID=$!
timeout 60 sh -c "until curl -s http://localhost:${SERVICE_PORT}/api/products/health > /dev/null; do sleep 1; done"

# --- 1. OBSERVABILITÉ ---
run_test "1. Health Check (Liveness)" "curl -s http://localhost:${SERVICE_PORT}/api/products/health | jq -e '.status == \"ok\"'"
run_test "2. Ready Check (Readiness)" "curl -s http://localhost:${SERVICE_PORT}/api/products/ready | jq -e '.status == \"ready\"'"
run_test "3. Prometheus Metrics" "curl -s http://localhost:${SERVICE_PORT}/api/products/metrics | grep -q 'http_requests_total'"
run_test "4. Service Metadata Info" "curl -s http://localhost:${SERVICE_PORT}/api/products/info | jq -e '.service == \"product-service\"'"

# --- 2. CONSULTATION ---
run_test "5. List All Products (Min 5 items)" "[ \$(curl -s http://localhost:${SERVICE_PORT}/api/products | jq 'length') -ge 5 ]" "curl .../api/products | jq 'length >= 5'"
run_test "6. Get Product by ID (iPhone 15)" "curl -s http://localhost:${SERVICE_PORT}/api/products/1 | jq -e '.name == \"iPhone 15 Pro\"'"
run_test "7. Get Product Category (Smartphones)" "curl -s http://localhost:${SERVICE_PORT}/api/products/category/Smartphones | jq -e 'length >= 2'"

# --- 3. RECHERCHE ---
run_test "8. Search Product by Name (iPhone)" "curl -s \"http://localhost:${SERVICE_PORT}/api/products/search?q=iPhone\" | jq -e '.[0].name | contains(\"iPhone\")'"
run_test "9. Search Product (No Results)" "[ \$(curl -s \"http://localhost:${SERVICE_PORT}/api/products/search?q=NonExistent\" | jq 'length') -eq 0 ]"

# --- 4. GESTION DES ERREURS ---
run_test "10. Error 404 on Unknown ID" "[ \$(curl -s -o /dev/null -w '%{http_code}' http://localhost:${SERVICE_PORT}/api/products/9999) = 404 ]"
run_test "11. Product Data Schema Integrity" "PRODUCT=\$(curl -s http://localhost:${SERVICE_PORT}/api/products/1) && echo \"\$PRODUCT\" | jq -e '.price and .stock and .category'" "Vérification JSON : price, stock, category"

# --- FINALISATION ---
echo "----------------------------------------------------------------------" | tee -a "$LOG_FILE"
echo "${GREEN}Succès : Les 11 points de contrôle sont validés.${NC}" | tee -a "$LOG_FILE"
echo "</div><p style='text-align:center; color:#7f8c8d;'>Fin du rapport</p></body></html>" >> "$HTML_FILE"
kill $SERVICE_PID 2>/dev/null || true