#!/bin/bash

echo "========================================"
echo "  Information Hub - Vercel Deployment"
echo "========================================"
echo

echo "[1/4] Checking if Vercel CLI is installed..."
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI not found. Installing..."
    npm install -g vercel
    if [ $? -ne 0 ]; then
        echo "Failed to install Vercel CLI. Please install manually:"
        echo "npm install -g vercel"
        exit 1
    fi
fi

echo "[2/4] Checking if logged in to Vercel..."
if ! vercel whoami &> /dev/null; then
    echo "Please log in to Vercel:"
    vercel login
    if [ $? -ne 0 ]; then
        echo "Login failed. Please try again."
        exit 1
    fi
fi

echo "[3/4] Deploying to Vercel..."
vercel --prod

echo "[4/4] Deployment complete!"
echo
echo "Next steps:"
echo "1. Set up your Supabase database with complete-schema-fixed.sql"
echo "2. Add environment variables in Vercel dashboard:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY"
echo "3. Test your deployment"
echo
