/**
 * Vercel Web Analytics integration
 * 
 * This script initializes Vercel Analytics for the site.
 * When deployed to Vercel with Analytics enabled in the dashboard,
 * Vercel will automatically inject the tracking script that uses this initialization.
 * 
 * The @vercel/analytics package is installed for potential custom event tracking
 * and to ensure compatibility with Vercel's analytics infrastructure.
 * 
 * For static sites like this Eleventy project:
 * 1. Enable Analytics in your Vercel project dashboard
 * 2. Deploy the site to Vercel
 * 3. Vercel automatically injects the analytics script at /_vercel/insights/script.js
 * 4. Analytics data will start appearing in your dashboard after deployment
 * 
 * No additional configuration is needed - this file serves as documentation
 * and a placeholder for future custom event tracking if needed.
 */

// Initialize the analytics queue that Vercel's injected script will use
if (typeof window !== 'undefined') {
  window.va = window.va || function () { 
    (window.vaq = window.vaq || []).push(arguments); 
  };
}
