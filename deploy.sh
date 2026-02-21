#!/bin/bash

# GIVRwrld Deployment Script
# This script helps deploy the game server hosting platform

set -e

echo "🚀 GIVRwrld Deployment Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI is not installed. Installing..."
        npm install -g supabase
    fi
    
    print_success "All dependencies are available"
}

# Install frontend dependencies
install_dependencies() {
    print_status "Installing frontend dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Build frontend
build_frontend() {
    print_status "Building frontend for production..."
    npm run build
    print_success "Frontend built successfully"
}

# Deploy Supabase functions
deploy_functions() {
    print_status "Deploying Supabase Edge Functions..."
    
    # Check if user is logged in to Supabase
    if ! supabase projects list &> /dev/null; then
        print_warning "Please login to Supabase first:"
        echo "supabase login"
        echo "supabase link --project-ref YOUR_PROJECT_REF"
        exit 1
    fi
    
    # Deploy each function
    functions=("create-checkout-session" "stripe-webhook" "panel-sync-user" "servers-provision" "server-stats" "scheduler-reconcile")
    
    for func in "${functions[@]}"; do
        print_status "Deploying $func..."
        supabase functions deploy $func
        print_success "$func deployed"
    done
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if migration file exists
    if [ ! -f "supabase/migrations/001_init.sql" ]; then
        print_error "Migration file not found. Please ensure supabase/migrations/001_init.sql exists."
        exit 1
    fi
    
    print_warning "Please run the following SQL in your Supabase SQL Editor:"
    echo "----------------------------------------"
    cat supabase/migrations/001_init.sql
    echo "----------------------------------------"
    print_warning "After running the SQL, press Enter to continue..."
    read -r
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    if [ ! -f ".env.local" ]; then
        print_warning "Creating .env.local template..."
        cat > .env.local << EOF
# Frontend Environment Variables
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_FUNCTIONS_URL=https://your-project-ref.functions.supabase.co
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
VITE_PANEL_URL=https://panel.givrwrldservers.com
EOF
        print_warning "Please update .env.local with your actual values"
    fi
    
    if [ ! -f ".env.production" ]; then
        print_warning "Creating .env.production template..."
        cat > .env.production << EOF
# Supabase Edge Functions Environment Variables
# Set these in Supabase Dashboard > Edge Functions > Secrets
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_DB_URL=your_supabase_db_url_here

STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

PANEL_URL=https://panel.givrwrldservers.com
PTERO_APP_KEY=your_pterodactyl_application_api_key_here
PTERO_CLIENT_KEY=your_pterodactyl_client_api_key_here

ALLOW_ORIGINS=https://givrwrldservers.com,https://www.givrwrldservers.com,http://localhost:5173
ALERTS_WEBHOOK=your_slack_or_discord_webhook_url_here
EOF
        print_warning "Please update .env.production and set these as Supabase secrets"
    fi
}

# Setup Nginx
setup_nginx() {
    print_status "Setting up Nginx configuration..."
    
    if [ ! -f "infra/nginx.conf" ]; then
        print_error "Nginx configuration not found. Please ensure infra/nginx.conf exists."
        exit 1
    fi
    
    print_warning "Please copy infra/nginx.conf to your server and update SSL certificate paths:"
    echo "sudo cp infra/nginx.conf /etc/nginx/sites-available/givrwrld"
    echo "sudo ln -s /etc/nginx/sites-available/givrwrld /etc/nginx/sites-enabled/"
    echo "sudo nginx -t"
    echo "sudo systemctl reload nginx"
}

# Setup Cloudflare
setup_cloudflare() {
    print_status "Setting up Cloudflare configuration..."
    
    if [ ! -f "infra/cloudflare-rules.txt" ]; then
        print_error "Cloudflare configuration not found. Please ensure infra/cloudflare-rules.txt exists."
        exit 1
    fi
    
    print_warning "Please configure Cloudflare according to infra/cloudflare-rules.txt:"
    echo "1. Add DNS records"
    echo "2. Configure SSL/TLS settings"
    echo "3. Set up cache rules"
    echo "4. Configure firewall rules"
    echo "5. Enable security headers"
}

# Main deployment function
main() {
    echo "Starting deployment process..."
    echo ""
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Run deployment steps
    check_dependencies
    install_dependencies
    build_frontend
    setup_environment
    setup_database
    deploy_functions
    setup_nginx
    setup_cloudflare
    
    echo ""
    print_success "Deployment setup complete!"
    echo ""
    print_warning "Next steps:"
    echo "1. Update environment variables in .env.local and Supabase secrets"
    echo "2. Run the database migration in Supabase SQL Editor"
    echo "3. Configure Stripe webhooks"
    echo "4. Set up Pterodactyl panel and API keys"
    echo "5. Deploy the built files to your VPS"
    echo "6. Configure Nginx and Cloudflare"
    echo "7. Test the complete flow: Checkout → Payment → Provisioning"
    echo ""
    print_success "Happy hosting! 🎮"
}

# Run main function
main "$@"

