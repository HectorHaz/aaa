#!/usr/bin/env bash
set -euo pipefail

API_URL=${API_URL:-http://localhost:4000}

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@demo.do","password":"Admin1234!"}')
TOKEN=$(python -c 'import json,sys; print(json.load(sys.stdin)["accessToken"])' <<< "$LOGIN_RESPONSE")

echo "Token obtenido"

CUSTOMER_RESPONSE=$(curl -s -X POST "$API_URL/customers" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"code":"C-DEMO","name":"Cliente Script","paymentTermsDays":30,"creditLimit":25000}')
CUSTOMER_ID=$(python -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<< "$CUSTOMER_RESPONSE")

echo "Cliente creado: $CUSTOMER_ID"
