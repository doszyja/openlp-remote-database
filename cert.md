docker exec openlp-web-prod sh -c "cat > /etc/nginx/conf.d/default.conf << 'EOF'
# HTTP server - serves app and handles Let's Encrypt challenge
server {
    listen 80;
    server_name piesni.swietochlowicekwch.pl;
    root /usr/share/nginx/html;
    index index.html;
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # API proxy - forward /api/* to http://api:3000/api/*
    # This must come before the redirect to allow API calls through HTTP if needed
    location /api {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        
        # Standard proxy headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers (if needed)
        proxy_set_header Origin \$scheme://\$host;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket - forward /ws/* to http://api:3000/ws/*
    location /ws {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        
        # WebSocket upgrade headers
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        
        # Standard proxy headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Disable buffering for WebSocket
        proxy_buffering off;
        proxy_cache_bypass \$http_upgrade;
        
        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 75s;
    }
    
    # Redirect to HTTPS for all other requests
    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF
"

docker exec openlp-web-prod nginx -t && docker exec openlp-web-prod nginx -s reload