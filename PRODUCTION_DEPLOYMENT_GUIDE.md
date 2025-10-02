# 🚀 Vision AI Production Deployment Guide

## 🎯 Overview

Complete guide for deploying the Vision AI + Product Management system to production environment, including:
- ✅ Server setup and configuration
- ✅ Database optimization and scaling
- ✅ File storage and CDN setup
- ✅ Security hardening
- ✅ Performance optimization
- ✅ Monitoring and logging
- ✅ Backup and disaster recovery

---

## 🏗️ Infrastructure Requirements

### Minimum Production Requirements

**Backend Server:**
- CPU: 4 cores minimum (8 cores recommended)
- RAM: 8GB minimum (16GB recommended)
- Storage: 100GB SSD (500GB+ for file storage)
- OS: Ubuntu 20.04 LTS or newer
- Node.js: v18.0.0 or newer
- PM2: For process management

**Database:**
- MongoDB Atlas M10+ cluster (or self-hosted with 16GB RAM)
- Storage: 50GB minimum (auto-scaling recommended)
- Backup: Point-in-time recovery enabled
- Region: Same as application server for low latency

**File Storage:**
- Local storage: 500GB+ SSD for uploads
- CDN: CloudFlare/AWS CloudFront recommended
- Backup: AWS S3 or Google Cloud Storage

**External Services:**
- OpenAI API: Pay-as-you-go plan with sufficient quota
- Facebook Graph API: Business verification completed
- SSL Certificate: Let's Encrypt or commercial

---

## 🔧 Server Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install nginx
sudo apt install nginx -y

# Install certbot for SSL
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Create application user
sudo adduser --system --group --home /var/www/vision-ai vision-ai
sudo mkdir -p /var/www/vision-ai
sudo chown -R vision-ai:vision-ai /var/www/vision-ai
```

### 2. Application Deployment

```bash
# Switch to application user
sudo -u vision-ai -i

# Clone repository
cd /var/www/vision-ai
git clone https://github.com/yourusername/vision-ai-product-management.git .

# Install dependencies
npm run install:all

# Build applications
npm run build:all

# Create uploads directory with proper permissions
mkdir -p backend/uploads/products
mkdir -p backend/uploads/samples
chmod 755 backend/uploads
chmod 755 backend/uploads/products
chmod 755 backend/uploads/samples
```

### 3. Environment Configuration

```bash
# Backend environment
cat > backend/.env << 'EOF'
# Production Environment Variables
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vision-ai-prod?retryWrites=true&w=majority

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-production-api-key-here
OPENAI_MODEL=gpt-4-vision-preview
OPENAI_MAX_TOKENS=500

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DEST=./uploads
BASE_URL=https://yourdomain.com

# Facebook Integration
FB_GRAPH_VERSION=v23.0
FB_VERIFY_TOKEN=your-secure-verify-token-here

# Security
JWT_SECRET=your-very-secure-jwt-secret-256-bits-long
SESSION_SECRET=your-very-secure-session-secret-256-bits-long

# Logging
LOG_LEVEL=warn
LOG_FILE=/var/log/vision-ai/backend.log

# Performance
CACHE_TTL=3600
API_RATE_LIMIT=100

# Monitoring
HEALTH_CHECK_PATH=/health
METRICS_PATH=/metrics
EOF

# Frontend environment
cat > frontend/src/environments/environment.prod.ts << 'EOF'
export const environment = {
  production: true,
  apiUrl: 'https://yourdomain.com/api',
  uploadUrl: 'https://yourdomain.com/uploads',
  
  // Feature flags
  enableVisionAI: true,
  enableAnalytics: true,
  enableErrorReporting: true,
  
  // Performance
  enableServiceWorker: true,
  enableLazyLoading: true,
  
  // Security
  enableCSRF: true,
  enableCORS: false // Handled by nginx
};
EOF
```

---

## 🌐 Nginx Configuration

### 1. Main Configuration

```bash
# Create nginx configuration
sudo tee /etc/nginx/sites-available/vision-ai << 'EOF'
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

# Upstream backend servers
upstream backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Root directory for frontend
    root /var/www/vision-ai/frontend/dist/frontend;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # File uploads (with special rate limiting)
    location /api/products/upload-images {
        limit_req zone=upload burst=5 nodelay;
        
        proxy_pass http://backend/products/upload-images;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Large file upload settings
        client_max_body_size 20M;
        proxy_read_timeout 600s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 600s;
    }
    
    # Static file serving with caching
    location /uploads/ {
        alias /var/www/vision-ai/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
        
        # Optimize image delivery
        location ~* \.(jpg|jpeg|png|webp)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept";
        }
    }
    
    # Frontend routes (Angular)
    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Static assets with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }
    
    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ /(\.env|\.git|node_modules|package\.json) {
        deny all;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/vision-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. SSL Certificate Setup

```bash
# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run

# Add renewal to crontab
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
```

---

## 🔄 Process Management with PM2

### 1. PM2 Configuration

```bash
# Create PM2 ecosystem file
cat > /var/www/vision-ai/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'vision-ai-backend',
    script: './backend/dist/main.js',
    cwd: '/var/www/vision-ai',
    instances: 'max',
    exec_mode: 'cluster',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/vision-ai/backend-error.log',
    out_file: '/var/log/vision-ai/backend-out.log',
    
    // Process management
    min_uptime: '10s',
    max_restarts: 10,
    autorestart: true,
    restart_delay: 5000,
    
    // Memory management
    max_memory_restart: '1G',
    
    // Monitoring
    pmx: true,
    
    // Advanced settings
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // Health check
    health_check_grace_period: 3000
  }]
};
EOF

# Create log directory
sudo mkdir -p /var/log/vision-ai
sudo chown -R vision-ai:vision-ai /var/log/vision-ai
```

### 2. Start Application

```bash
# Start with PM2
sudo -u vision-ai pm2 start /var/www/vision-ai/ecosystem.config.js

# Setup PM2 startup
pm2 startup ubuntu -u vision-ai --hp /var/www/vision-ai
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup ubuntu -u vision-ai --hp /var/www/vision-ai

# Save current processes
sudo -u vision-ai pm2 save

# Check status
sudo -u vision-ai pm2 status
sudo -u vision-ai pm2 logs
```

---

## 📊 Database Production Setup

### 1. MongoDB Atlas Configuration

```javascript
// Connection string optimization
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  retryWrites: true,
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 5000
  }
};
```

### 2. Database Indexing

```javascript
// Create production indexes
db.products.createIndex({ "searchKeywords": 1 });
db.products.createIndex({ "fanpages.fanpageId": 1 });
db.products.createIndex({ "category": 1, "fanpages.isActive": 1 });
db.products.createIndex({ "createdAt": -1 });
db.products.createIndex({ "fanpages.priority": -1, "fanpages.fanpageId": 1 });

// Text search index
db.products.createIndex({
  "name": "text",
  "description": "text",
  "searchKeywords": "text"
}, {
  "weights": {
    "name": 10,
    "searchKeywords": 5,
    "description": 1
  }
});

// Fanpage indexes
db.fanpages.createIndex({ "pageId": 1 }, { unique: true });
db.fanpages.createIndex({ "aiEnabled": 1 });

// Session logs indexes (for performance monitoring)
db.sessionlogs.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 2592000 }); // 30 days
db.sessionlogs.createIndex({ "fanpageId": 1, "createdAt": -1 });
```

### 3. Backup Strategy

```bash
# MongoDB Atlas automatic backup is enabled
# Additional local backup script for critical data

#!/bin/bash
# /var/www/vision-ai/scripts/backup-db.sh

BACKUP_DIR="/var/backups/vision-ai"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="vision-ai-backup-${DATE}"

# Create backup directory
mkdir -p $BACKUP_DIR

# Export critical collections
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$BACKUP_NAME"

# Compress backup
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/$BACKUP_NAME.tar.gz"

# Add to crontab for daily backup at 2 AM
# 0 2 * * * /var/www/vision-ai/scripts/backup-db.sh >> /var/log/vision-ai/backup.log 2>&1
```

---

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Fail2ban for additional protection
sudo apt install fail2ban -y

# Configure fail2ban for nginx
sudo tee /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Application Security

```bash
# Set proper file permissions
sudo chown -R vision-ai:vision-ai /var/www/vision-ai
sudo chmod -R 755 /var/www/vision-ai
sudo chmod -R 644 /var/www/vision-ai/backend/.env
sudo chmod 700 /var/www/vision-ai/backend/uploads

# Secure sensitive files
sudo chmod 600 /var/www/vision-ai/backend/.env
sudo chown vision-ai:vision-ai /var/www/vision-ai/backend/.env

# Remove development files in production
rm -f /var/www/vision-ai/backend/.env.example
rm -f /var/www/vision-ai/.git -rf
rm -f /var/www/vision-ai/README.md
```

### 3. API Security Headers

```typescript
// backend/src/main.ts - Production security middleware
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    }
  }));
  
  // Rate limiting
  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  }));
  
  // Special rate limit for AI endpoints
  app.use('/api/products/analyze-image', rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 AI requests per minute
    message: 'Too many AI analysis requests',
  }));
  
  await app.listen(3000);
}
```

---

## 📈 Performance Optimization

### 1. Backend Optimization

```typescript
// backend/src/app.module.ts - Production optimizations
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    // Redis cache for better performance
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes
      max: 1000, // maximum number of items in cache
    }),
    
    // Request throttling
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
    
    // Other modules...
  ],
})
export class AppModule {}
```

### 2. File Upload Optimization

```typescript
// backend/src/products/file-upload.service.ts - Production settings
const OPTIMIZATION_SETTINGS = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  medium: { width: 500, height: 500, quality: 85 },
  large: { width: 1200, height: 1200, quality: 90 },
  
  // WebP settings for better compression
  webp: {
    quality: 85,
    lossless: false,
    nearLossless: false,
    smartSubsample: true
  }
};
```

### 3. Database Query Optimization

```typescript
// Optimized product search with proper indexing
async findSimilarProducts(query: string, fanpageId?: string, limit = 10) {
  const pipeline = [
    // Text search stage
    {
      $match: {
        $text: { $search: query },
        ...(fanpageId && { 'fanpages.fanpageId': new Types.ObjectId(fanpageId) })
      }
    },
    
    // Add relevance score
    {
      $addFields: {
        score: { $meta: 'textScore' }
      }
    },
    
    // Sort by relevance and priority
    {
      $sort: { 
        score: { $meta: 'textScore' },
        'fanpages.priority': -1 
      }
    },
    
    // Limit results
    { $limit: limit },
    
    // Project only needed fields
    {
      $project: {
        name: 1,
        category: 1,
        images: { $slice: ['$images', 1] }, // Only first image
        fanpages: {
          $filter: {
            input: '$fanpages',
            cond: fanpageId ? 
              { $eq: ['$$this.fanpageId', new Types.ObjectId(fanpageId)] } : 
              true
          }
        },
        score: 1
      }
    }
  ];
  
  return this.productModel.aggregate(pipeline);
}
```

---

## 📊 Monitoring and Logging

### 1. Application Monitoring

```typescript
// backend/src/health/health.controller.ts - Production health checks
import { HealthCheckService, MongooseHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  check() {
    return this.health.check([
      // Database health
      () => this.db.pingCheck('mongodb'),
      
      // Memory usage
      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024), // 1GB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024), // 1GB
    ]);
  }

  @Get('detailed')
  detailedCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      environment: process.env.NODE_ENV,
    };
  }
}
```

### 2. Logging Configuration

```typescript
// backend/src/main.ts - Production logging
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const logger = WinstonModule.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    // File logging
    new winston.transports.File({
      filename: '/var/log/vision-ai/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: '/var/log/vision-ai/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
    
    // Console logging for PM2
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger });
  // ... rest of bootstrap
}
```

### 3. Error Tracking

```bash
# Install log rotation
sudo apt install logrotate

# Configure log rotation
sudo tee /etc/logrotate.d/vision-ai << 'EOF'
/var/log/vision-ai/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 vision-ai vision-ai
    postrotate
        sudo -u vision-ai pm2 reloadLogs
    endscript
}
EOF
```

---

## 🔄 Deployment Automation

### 1. Deploy Script

```bash
#!/bin/bash
# /var/www/vision-ai/scripts/deploy.sh

set -e

REPO_URL="https://github.com/yourusername/vision-ai-product-management.git"
APP_DIR="/var/www/vision-ai"
BACKUP_DIR="/var/backups/vision-ai-releases"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting deployment at $(date)"

# Create backup of current release
if [ -d "$APP_DIR" ]; then
    echo "📦 Creating backup..."
    sudo mkdir -p $BACKUP_DIR
    sudo cp -r $APP_DIR $BACKUP_DIR/backup-$TIMESTAMP
fi

# Pull latest code
echo "📥 Pulling latest code..."
cd $APP_DIR
sudo -u vision-ai git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
sudo -u vision-ai npm run install:all

# Build applications
echo "🔨 Building applications..."
sudo -u vision-ai npm run build:all

# Database migrations (if any)
echo "🗄️  Running database migrations..."
# Add migration commands here if needed

# Restart application
echo "🔄 Restarting application..."
sudo -u vision-ai pm2 reload ecosystem.config.js

# Health check
echo "🏥 Performing health check..."
sleep 10
curl -f http://localhost:3000/health || exit 1

# Reload nginx
echo "🌐 Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment completed successfully at $(date)"

# Clean old backups (keep last 5)
find $BACKUP_DIR -name "backup-*" -type d | sort -r | tail -n +6 | xargs rm -rf

echo "🎉 Deployment finished!"
```

### 2. Zero-Downtime Deployment

```bash
#!/bin/bash
# /var/www/vision-ai/scripts/zero-downtime-deploy.sh

set -e

echo "🚀 Zero-downtime deployment started"

# Deploy to staging directory first
STAGING_DIR="/var/www/vision-ai-staging"
PRODUCTION_DIR="/var/www/vision-ai"

# Prepare staging environment
echo "📦 Preparing staging environment..."
sudo rm -rf $STAGING_DIR
sudo cp -r $PRODUCTION_DIR $STAGING_DIR
cd $STAGING_DIR

# Update staging with latest code
sudo -u vision-ai git pull origin main
sudo -u vision-ai npm run install:all
sudo -u vision-ai npm run build:all

# Test staging environment
echo "🧪 Testing staging environment..."
sudo -u vision-ai PORT=3001 npm run start:backend &
STAGING_PID=$!
sleep 10

# Health check on staging
curl -f http://localhost:3001/health || {
    echo "❌ Staging health check failed"
    kill $STAGING_PID
    exit 1
}

kill $STAGING_PID

# Swap staging to production
echo "🔄 Swapping to production..."
sudo mv $PRODUCTION_DIR $PRODUCTION_DIR-old
sudo mv $STAGING_DIR $PRODUCTION_DIR
sudo -u vision-ai pm2 reload ecosystem.config.js

# Final health check
sleep 5
curl -f http://localhost:3000/health || {
    echo "❌ Production health check failed, rolling back..."
    sudo -u vision-ai pm2 stop all
    sudo mv $PRODUCTION_DIR $PRODUCTION_DIR-failed
    sudo mv $PRODUCTION_DIR-old $PRODUCTION_DIR
    sudo -u vision-ai pm2 start ecosystem.config.js
    exit 1
}

# Cleanup
sudo rm -rf $PRODUCTION_DIR-old

echo "✅ Zero-downtime deployment completed successfully"
```

---

## 📊 Performance Monitoring

### 1. System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Setup monitoring script
cat > /var/www/vision-ai/scripts/monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/vision-ai/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# System metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEMORY_USAGE=$(free | grep '^Mem' | awk '{printf "%.1f", $3/$2 * 100.0}')
DISK_USAGE=$(df -h /var/www | awk 'NR==2 {print $5}' | cut -d'%' -f1)

# Application metrics
ACTIVE_CONNECTIONS=$(ss -tuln | grep :3000 | wc -l)
PM2_STATUS=$(sudo -u vision-ai pm2 jlist | jq -r '.[].pm2_env.status' | grep -c "online" || echo "0")

# Log metrics
echo "$DATE,CPU:$CPU_USAGE%,Memory:$MEMORY_USAGE%,Disk:$DISK_USAGE%,Connections:$ACTIVE_CONNECTIONS,PM2:$PM2_STATUS" >> $LOG_FILE

# Alert if thresholds exceeded
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "$DATE: HIGH CPU USAGE: $CPU_USAGE%" >> $LOG_FILE
fi

if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
    echo "$DATE: HIGH MEMORY USAGE: $MEMORY_USAGE%" >> $LOG_FILE
fi
EOF

chmod +x /var/www/vision-ai/scripts/monitor.sh

# Add to crontab (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/vision-ai/scripts/monitor.sh") | crontab -
```

### 2. Application Performance Monitoring

```typescript
// backend/src/common/interceptors/performance.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const startTime = Date.now();

    return next
      .handle()
      .pipe(
        tap(() => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Log slow requests (> 2 seconds)
          if (duration > 2000) {
            console.warn(`Slow request: ${method} ${url} took ${duration}ms`);
          }
          
          // Log AI analysis performance
          if (url.includes('/analyze-image')) {
            console.info(`AI Analysis: ${duration}ms`);
          }
        }),
      );
  }
}
```

---

## 🎯 Final Production Checklist

### Pre-Deployment
- [ ] ✅ Server provisioned with adequate resources
- [ ] ✅ Domain name configured and DNS propagated
- [ ] ✅ SSL certificate obtained and configured
- [ ] ✅ MongoDB Atlas production cluster setup
- [ ] ✅ OpenAI API production key configured
- [ ] ✅ Environment variables configured
- [ ] ✅ File upload directories created with proper permissions
- [ ] ✅ Firewall and security hardening completed

### Deployment
- [ ] ✅ Code deployed and built successfully
- [ ] ✅ Database indexes created
- [ ] ✅ PM2 process manager configured and running
- [ ] ✅ Nginx reverse proxy configured
- [ ] ✅ Health checks passing
- [ ] ✅ Error logging working
- [ ] ✅ Backup scripts configured

### Post-Deployment
- [ ] ✅ Load testing completed
- [ ] ✅ Performance monitoring active
- [ ] ✅ SSL certificate auto-renewal working
- [ ] ✅ Backup and restore procedures tested
- [ ] ✅ Alert notifications configured
- [ ] ✅ Documentation updated with production URLs
- [ ] ✅ Team trained on monitoring and maintenance

### Final Tests
- [ ] ✅ Vision AI image analysis working in production
- [ ] ✅ File uploads and optimization functional
- [ ] ✅ Product search returning accurate results
- [ ] ✅ Frontend loading and API communication working
- [ ] ✅ Messenger webhook integration functional
- [ ] ✅ Performance within acceptable thresholds
- [ ] ✅ Security scans completed and passed

---

**🎊 Once all checklist items are complete, your Vision AI + Product Management system is ready for production use!** 🚀

**📞 Support:** For production issues, check logs in `/var/log/vision-ai/` and monitor system resources with the provided monitoring scripts.