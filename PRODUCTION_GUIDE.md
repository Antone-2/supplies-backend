# Medhelm Supplies - Production Deployment Guide

## 🚀 Production-Ready eCommerce Backend

This is the complete production deployment guide for the Medhelm Supplies eCommerce backend system. The system is fully production-ready with enterprise-grade security, monitoring, and scalability features.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Production Features](#production-features)
- [Environment Setup](#environment-setup)
- [Deployment Methods](#deployment-methods)
- [Security Configuration](#security-configuration)
- [Monitoring & Observability](#monitoring--observability)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose 20.10+
- Node.js 18+ (for local development)
- MongoDB Atlas account or MongoDB instance
- PesaPal merchant account
- Domain name and SSL certificates

### 1. Clone and Setup
```bash
git clone <repository-url>
cd eCommerce-Backend
cp .env.example .env.production
```

### 2. Configure Environment
Edit `.env.production` with your production values:
```bash
vim .env.production
```

### 3. Deploy with Docker
```bash
chmod +x deploy.sh
./deploy.sh deploy
```

### 4. Verify Deployment
```bash
curl https://api.yourdomain.com/api/health
```

## 🏗️ Architecture Overview

### System Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │────│  Backend API     │────│   MongoDB       │
│   Load Balancer │    │  Node.js/Express │    │   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌─────────────────┐                │
         │              │     Redis       │                │
         │              │     Cache       │                │
         │              └─────────────────┘                │
         │                                                 │
    ┌─────────┐                                      ┌──────────┐
    │   SSL   │                                      │   File   │
    │  Certs  │                                      │ Storage  │
    └─────────┘                                      └──────────┘
```

### Technology Stack
- **Backend**: Node.js 18, Express.js, TypeScript
- **Database**: MongoDB Atlas with replica sets
- **Cache**: Redis for session storage
- **Payment**: PesaPal production integration
- **Security**: Helmet, Rate limiting, Input validation
- **Monitoring**: Pino logging, Health checks, Metrics
- **Deployment**: Docker, Docker Compose, Nginx

## ✨ Production Features

### 🔒 Security Features
- ✅ **Enterprise Security Headers** (HSTS, CSP, XSS Protection)
- ✅ **Advanced Rate Limiting** (Per-endpoint, IP-based)
- ✅ **Input Validation & Sanitization** (XSS, NoSQL injection protection)
- ✅ **JWT Authentication** with refresh tokens
- ✅ **CORS Policy** with domain whitelisting
- ✅ **SSL/TLS Termination** with modern cipher suites
- ✅ **IP Whitelisting** for admin endpoints

### 📊 Monitoring & Observability
- ✅ **Health Checks** (Database, Memory, External services)
- ✅ **Metrics Collection** (Request rates, Response times, Error rates)
- ✅ **Error Tracking** with structured logging
- ✅ **Alerting System** (Slack, Email, PagerDuty integration)
- ✅ **Performance Monitoring** (Memory usage, CPU metrics)
- ✅ **Kubernetes Probes** (Readiness, Liveness)

### 🚀 Performance & Scalability
- ✅ **Docker Containerization** with multi-stage builds
- ✅ **Nginx Load Balancing** with caching
- ✅ **Database Connection Pooling**
- ✅ **Redis Caching** for sessions and data
- ✅ **Compression** (Gzip, Brotli support)
- ✅ **Static Asset Optimization**

### 💳 Payment Integration
- ✅ **PesaPal Production Integration** with retry logic
- ✅ **Webhook Handling** for payment notifications
- ✅ **Transaction Logging** and audit trails
- ✅ **Payment Security** with tokenization
- ✅ **Multi-Currency Support** (KES primary)

## 🔧 Environment Setup

### Required Environment Variables

#### Database Configuration
```bash
MONGO_URI=mongodb+srv://user:pass@cluster/database
MONGO_ROOT_USER=admin_user
MONGO_ROOT_PASSWORD=secure_password
```

#### Security Configuration
```bash
JWT_SECRET=your-256-bit-secret-key
JWT_REFRESH_SECRET=your-256-bit-refresh-secret
SESSION_SECRET=your-session-secret-key
```

#### PesaPal Configuration
```bash
PESAPAL_CONSUMER_KEY=your-production-key
PESAPAL_CONSUMER_SECRET=your-production-secret
PESAPAL_TEST_MODE=false
PESAPAL_CALLBACK_URL=https://api.yourdomain.com/api/v1/payment/callback
```

#### Email & Notifications
```bash
BREVO_API_KEY=your-brevo-api-key
EMAIL_FROM=noreply@yourdomain.com
SENTRY_DSN=your-sentry-dsn
```

### SSL Certificate Setup
```bash
# Place SSL certificates in the ssl directory
mkdir ssl
cp fullchain.pem ssl/
cp privkey.pem ssl/
chmod 600 ssl/*
```

## 🚀 Deployment Methods

### Method 1: Docker Compose (Recommended)
```bash
# Production deployment
docker-compose -f docker-compose.yml up -d

# With environment file
docker-compose --env-file .env.production up -d
```

### Method 2: Automated Deployment Script
```bash
# Full automated deployment
./deploy.sh deploy

# Rollback to previous version
./deploy.sh rollback backup_20241002_143000

# Health check only
./deploy.sh health-check
```

### Method 3: Kubernetes Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: medhelm-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: medhelm-backend
  template:
    spec:
      containers:
      - name: backend
        image: medhelm/backend:latest
        ports:
        - containerPort: 5000
        livenessProbe:
          httpGet:
            path: /api/live
            port: 5000
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 5000
```

## 🛡️ Security Configuration

### Rate Limiting Configuration
```javascript
// Different limits for different endpoints
API_RATE_LIMIT=100         // requests per 15min
AUTH_RATE_LIMIT=10         // login attempts per 15min  
PAYMENT_RATE_LIMIT=5       // payment attempts per 5min
```

### CORS Configuration
```bash
# Production CORS origins
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com
```

### Admin Security
```bash
# IP whitelist for admin endpoints
ADMIN_ALLOWED_IPS=203.0.113.1,198.51.100.1
```

## 📊 Monitoring & Observability

### Health Check Endpoints
- **`GET /api/health`** - Comprehensive system health
- **`GET /api/ready`** - Kubernetes readiness probe
- **`GET /api/live`** - Kubernetes liveness probe
- **`GET /api/metrics`** - Application metrics (authenticated)

### Sample Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2024-10-02T14:30:00Z",
  "uptime": 3600,
  "responseTime": "45ms",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "12ms"
    },
    "pesapal": {
      "status": "healthy", 
      "responseTime": "234ms"
    },
    "memory": {
      "status": "healthy",
      "used": 256,
      "total": 512,
      "percentage": 50
    }
  }
}
```

### Metrics Collection
```bash
# View application metrics
curl -H "Authorization: Bearer metrics-secret" \
  https://api.yourdomain.com/api/metrics
```

### Alert Configuration
Alerts are automatically sent for:
- High error rates (>5% in 5 minutes)
- Slow response times (>5 seconds)
- Memory usage >85%
- Payment failure rates >30%
- Authentication failure spikes

## 📚 API Documentation

### Authentication Endpoints
```bash
POST /api/v1/auth/register     # User registration
POST /api/v1/auth/login        # User login
POST /api/v1/auth/logout       # User logout
POST /api/v1/auth/refresh      # Token refresh
GET  /api/v1/auth/profile      # Get user profile
```

### Product Management
```bash
GET    /api/v1/products        # List products
GET    /api/v1/products/:id    # Get product details
POST   /api/v1/products        # Create product (admin)
PUT    /api/v1/products/:id    # Update product (admin)
DELETE /api/v1/products/:id    # Delete product (admin)
```

### Order Management
```bash
GET  /api/v1/orders           # List user orders
POST /api/v1/orders/create    # Create new order
GET  /api/v1/orders/:id       # Get order details
PUT  /api/v1/orders/:id       # Update order status (admin)
```

### Payment Processing
```bash
POST /api/v1/payment/pesapal     # Initiate PesaPal payment
POST /api/v1/payment/callback    # PesaPal webhook callback
GET  /api/v1/payment/status/:id  # Check payment status
```

### Sample API Request
```bash
# Create new order
curl -X POST https://api.yourdomain.com/api/v1/orders/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "items": [
      {"productId": "64abc123", "quantity": 2}
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Nairobi",
      "country": "Kenya"
    }
  }'
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check MongoDB connection
docker exec medhelm-mongodb mongosh --eval "db.adminCommand('ping')"

# View MongoDB logs
docker logs medhelm-mongodb
```

#### Payment Integration Issues
```bash
# Test PesaPal connectivity
node quick-pesapal-test.js

# Check PesaPal credentials
curl -X POST https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken \
  -H "Content-Type: application/json" \
  -d '{"consumer_key":"$KEY","consumer_secret":"$SECRET"}'
```

#### SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in ssl/fullchain.pem -text -noout | grep "Not After"

# Test SSL configuration  
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

#### Performance Issues
```bash
# Check container resource usage
docker stats medhelm-backend

# View application logs
docker logs -f medhelm-backend

# Check metrics
curl -H "Authorization: Bearer metrics-secret" \
  https://api.yourdomain.com/api/metrics
```

### Log Locations
- **Application Logs**: `docker logs medhelm-backend`
- **Nginx Logs**: `/var/log/nginx/` in nginx container
- **MongoDB Logs**: `docker logs medhelm-mongodb`
- **Deployment Logs**: `/var/log/medhelm/deploy.log`

## ⚡ Performance Optimization

### Database Optimization
```javascript
// Index creation for better performance
db.products.createIndex({ "name": "text", "description": "text" })
db.orders.createIndex({ "userId": 1, "createdAt": -1 })
db.users.createIndex({ "email": 1 }, { unique: true })
```

### Caching Strategy
```bash
# Redis configuration for optimal performance
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
```

### Nginx Caching
```nginx
# Static asset caching (configured in nginx.conf)
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔄 Backup & Recovery

### Automated Backups
```bash
# Database backup (included in deploy script)
./deploy.sh backup

# Manual backup
docker exec medhelm-mongodb mongodump \
  --username $MONGO_ROOT_USER \
  --password $MONGO_ROOT_PASSWORD \
  --out /backup
```

### Disaster Recovery
```bash
# Restore from backup
./deploy.sh rollback backup_20241002_143000

# Manual restore
docker exec medhelm-mongodb mongorestore \
  --username $MONGO_ROOT_USER \
  --password $MONGO_ROOT_PASSWORD \
  /backup
```

## 📞 Support & Maintenance

### Production Checklist
- [ ] SSL certificates configured and valid
- [ ] Environment variables properly set
- [ ] Database backups scheduled
- [ ] Monitoring alerts configured
- [ ] Rate limiting tuned for traffic
- [ ] Error tracking enabled
- [ ] Payment gateway tested
- [ ] Load balancer configured
- [ ] Security headers verified
- [ ] Performance benchmarks established

### Maintenance Tasks
- **Daily**: Monitor error rates, check payment processing
- **Weekly**: Review performance metrics, check disk space
- **Monthly**: Update dependencies, rotate secrets, test backups
- **Quarterly**: Security audit, performance optimization

### Contact Information
- **Technical Support**: tech@medhelmsupplies.co.ke
- **Emergency Contact**: +254-XXX-XXXXXX
- **Documentation**: https://docs.medhelmsupplies.co.ke

---

## 🚀 Ready for Production!

Your Medhelm Supplies eCommerce backend is now production-ready with:
- ✅ Enterprise-grade security
- ✅ Comprehensive monitoring
- ✅ Scalable architecture  
- ✅ Automated deployment
- ✅ Full documentation

For additional support or customization, contact the development team.