#!/bin/bash

# Remove all files from the S3 bucket
aws s3 rm s3://gabe-static-sites/map-of-the-stars --recursive

# Navigate to app directory and install dependencies
cd app
npm install

# Build the app
npm run build

# Sync the dist directory to S3
aws s3 sync dist/ s3://gabe-static-sites/map-of-the-stars

# Navigate back to root
cd ..

echo "Deployment complete!"

