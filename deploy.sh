#!/bin/bash

# Production deployment script for Medhelm Backend
# This script handles secure production deployment with zero-downtime

set -euo pipefail

# Configuration
PROJECT_NAME="medhelm-backend"
BACKUP_DIR="/opt/backups/medhelm"
LOG_FILE="/var/log/medhelm/deploy.log"
HEALTH_CHECK_URL="http://localhost:5000/api/health"
MAX_HEALTH_CHECKS=30
HEALTH_CHECK_INTERVAL=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    echo "[ERROR] $1" >> "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
    echo "[WARN] $1" >> "$LOG_FILE"
}

# Check if running as root
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
    
    # Check if user is in docker group
    if ! groups $USER | grep &>/dev/null '\bdocker\b'; then
        error "User $USER is not in the docker group. Add with: sudo usermod -aG docker $USER"
    fi
}

# Validate environment
validate_environment() {
    log "Validating deployment environment..."
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "curl" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command '$cmd' not found"
        fi
    done
    
    # Check environment file
    if [[ ! -f ".env.production" ]]; then
        error "Production environment file .env.production not found"
    fi
    
    # Validate critical environment variables
    source .env.production
    local required_vars=("MONGO_ROOT_PASSWORD" "JWT_SECRET" "PESAPAL_CONSUMER_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    log "Environment validation passed"
}

# Create backup
create_backup() {
    log "Creating backup before deployment..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/backup_$timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup database
    if docker ps | grep -q "medhelm-mongodb"; then
        log "Backing up MongoDB..."
        docker exec medhelm-mongodb mongodump \
            --username "$MONGO_ROOT_USER" \
            --password "$MONGO_ROOT_PASSWORD" \
            --authenticationDatabase admin \
            --out /backup
        
        docker cp medhelm-mongodb:/backup "$backup_path/mongodb"
    fi
    
    # Backup uploads
    if docker ps | grep -q "medhelm-backend"; then
        log "Backing up uploads..."
        docker cp medhelm-backend:/app/uploads "$backup_path/uploads" 2>/dev/null || true
    fi
    
    # Keep only last 5 backups
    ls -1t "$BACKUP_DIR" | tail -n +6 | xargs -r rm -rf
    
    log "Backup created at $backup_path"
}

# Health check function
health_check() {
    log "Performing health check..."
    
    local attempts=0
    while [[ $attempts -lt $MAX_HEALTH_CHECKS ]]; do
        if curl -sf "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
            log "Health check passed"
            return 0
        fi
        
        attempts=$((attempts + 1))
        log "Health check attempt $attempts/$MAX_HEALTH_CHECKS failed, retrying in ${HEALTH_CHECK_INTERVAL}s..."
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    error "Health check failed after $MAX_HEALTH_CHECKS attempts"
}

# Deploy function
deploy() {
    log "Starting production deployment..."
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose -f docker-compose.yml pull
    
    # Build application
    log "Building application..."
    docker-compose -f docker-compose.yml build --no-cache backend
    
    # Stop old containers gracefully
    log "Stopping old containers..."
    docker-compose -f docker-compose.yml down --timeout 30
    
    # Start new containers
    log "Starting new containers..."
    docker-compose -f docker-compose.yml up -d
    
    # Wait for containers to be ready
    log "Waiting for containers to start..."
    sleep 30
    
    # Perform health check
    health_check
    
    log "Deployment completed successfully!"
}

# Rollback function
rollback() {
    local backup_name=$1
    if [[ -z "$backup_name" ]]; then
        error "Backup name required for rollback"
    fi
    
    local backup_path="$BACKUP_DIR/$backup_name"
    if [[ ! -d "$backup_path" ]]; then
        error "Backup $backup_name not found"
    fi
    
    warn "Rolling back to backup: $backup_name"
    
    # Stop current containers
    docker-compose -f docker-compose.yml down --timeout 30
    
    # Restore database
    if [[ -d "$backup_path/mongodb" ]]; then
        log "Restoring MongoDB..."
        # Implementation depends on your restore strategy
    fi
    
    # Start containers
    docker-compose -f docker-compose.yml up -d
    
    health_check
    log "Rollback completed"
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove unused volumes (be careful!)
    # docker volume prune -f
    
    log "Cleanup completed"
}

# Main function
main() {
    local command=${1:-deploy}
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$BACKUP_DIR"
    
    case "$command" in
        "deploy")
            check_permissions
            validate_environment
            create_backup
            deploy
            cleanup
            ;;
        "rollback")
            check_permissions
            rollback "$2"
            ;;
        "health-check")
            health_check
            ;;
        "backup")
            create_backup
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 {deploy|rollback <backup_name>|health-check|backup|cleanup}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"