# PayPal Environment Variables Setup

## Required Environment Variables

When switching from Sandbox to Live PayPal, you need to update these environment variables:

### Development (.env file)
```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your_live_client_id_here
PAYPAL_CLIENT_SECRET=your_live_client_secret_here
PAYPAL_BASE_URL=https://api-m.paypal.com
PAYPAL_MODE=live
PAYPAL_PRODUCT_NAME=Arcade Manager Store Subscription
PAYPAL_BRAND_NAME=Arcade Manager
PAYPAL_PRODUCT_ID=
PAYPAL_PLAN_ID=

# Frontend URL (Important for PayPal return URLs)
FRONTEND_URL=https://arcademanager.app
```

### Production (Heroku/Deployment Platform)
Set these environment variables in your deployment platform:

- `PAYPAL_CLIENT_ID` - Your Live PayPal Client ID
- `PAYPAL_CLIENT_SECRET` - Your Live PayPal Client Secret
- `PAYPAL_BASE_URL` - `https://api-m.paypal.com` (for Live)
- `PAYPAL_MODE` - `live`
- `PAYPAL_PRODUCT_NAME` - `Arcade Manager Store Subscription`
- `PAYPAL_BRAND_NAME` - `Arcade Manager`
- `PAYPAL_PRODUCT_ID` - (Leave empty, created automatically)
- `PAYPAL_PLAN_ID` - (Leave empty, created automatically)
- `FRONTEND_URL` - `https://arcademanager.app` (Important!)

## PayPal Return URLs

The PayPal return URLs are automatically generated from your `FRONTEND_URL`:

### Success URL
- **Development**: `http://localhost:3000/billing/success`
- **Production**: `https://arcademanager.app/billing/success`

### Cancel URL
- **Development**: `http://localhost:3000/billing/cancel`
- **Production**: `https://arcademanager.app/billing/cancel`

## Sandbox vs Live Configuration

### Sandbox (Testing)
```bash
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_MODE=sandbox
FRONTEND_URL=http://localhost:3000
```

### Live (Production)
```bash
PAYPAL_BASE_URL=https://api-m.paypal.com
PAYPAL_MODE=live
FRONTEND_URL=https://arcademanager.app
```

## What Changed

1. **Product Names**: Changed from "High Score Hero" to "Arcade Manager"
2. **Environment Variables**: All PayPal configuration now uses environment variables
3. **Fallbacks**: Development config has fallbacks for local testing
4. **Flexibility**: Easy to switch between Sandbox and Live environments
5. **Return URLs**: Automatically generated from FRONTEND_URL environment variable

## Next Steps

1. Create your Live PayPal app in the PayPal Developer Dashboard
2. Get your Live Client ID and Secret
3. Update your environment variables (especially `FRONTEND_URL`)
4. Test the integration
5. Deploy to production with Live credentials 