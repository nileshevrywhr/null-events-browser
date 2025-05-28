# Deployment Guide - Netlify

This guide will help you deploy the Null Events Session Browser to Netlify.

## 🚀 Quick Deployment

### Option 1: Deploy from Git Repository

1. **Push to GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Ready for Netlify deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `public`
     - **Node version**: `18`

3. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically build and deploy

### Option 2: Manual Deploy (Drag & Drop)

1. **Build locally**
   ```bash
   npm install
   npm run build
   ```

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Drag the `public` folder to the deploy area
   - Your site will be live immediately

## 📋 Pre-Deployment Checklist

### Required Files ✅
- [x] `netlify.toml` - Netlify configuration
- [x] `build-for-deployment.js` - Build script
- [x] `public/index.html` - Main HTML file
- [x] `public/css/styles.css` - Styles
- [x] `public/js/app.js` - JavaScript
- [x] `package.json` - Dependencies

### Data Options
Choose one of these approaches:

#### Option A: Deploy with Sample Data (Recommended for Demo)
```bash
npm run build  # Uses placeholder data
```

#### Option B: Deploy with Real Data
```bash
# First, fetch real data
npm run fetch-all  # Takes 5-15 minutes
npm run build      # Process for deployment
```

#### Option C: Deploy Empty (Fetch Data Later)
```bash
npm run build  # Will create placeholder
```

## 🔧 Configuration

### Build Settings
```toml
[build]
  command = "npm run build"
  publish = "public"
  
[build.environment]
  NODE_VERSION = "18"
```

### Environment Variables (Optional)
Set these in Netlify dashboard under Site Settings > Environment Variables:

- `NODE_ENV=production`
- `API_BASE_URL=https://null.community:443/api-v2`

## 🌐 Post-Deployment

### 1. Custom Domain (Optional)
- Go to Site Settings > Domain management
- Add your custom domain
- Configure DNS settings

### 2. HTTPS
- Automatically enabled by Netlify
- Force HTTPS redirect is configured in `netlify.toml`

### 3. Performance Optimization
- Lighthouse plugin automatically runs
- Static assets are cached for 1 year
- Data files cached for 1 hour

## 🔄 Updating Data

### Manual Updates
Since this is a static site, you have several options for updating data:

#### Option 1: Rebuild and Redeploy
```bash
npm run fetch-all  # Get latest data
npm run build      # Process for deployment
# Then redeploy via Git or manual upload
```

#### Option 2: Netlify Build Hooks
1. Create a build hook in Netlify dashboard
2. Use the webhook URL to trigger rebuilds
3. Can be automated with GitHub Actions or cron jobs

#### Option 3: Scheduled Builds
- Use Netlify's scheduled builds feature
- Set up daily/weekly automatic rebuilds
- Requires data fetching in build process

### GitHub Actions (Advanced)
Create `.github/workflows/update-data.yml`:

```yaml
name: Update Data
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run fetch-all
      - run: npm run build
      - name: Deploy to Netlify
        run: |
          curl -X POST -d {} ${{ secrets.NETLIFY_BUILD_HOOK }}
```

## 🐛 Troubleshooting

### Build Fails
1. Check Node.js version (should be 18+)
2. Verify all dependencies are in `package.json`
3. Check build logs in Netlify dashboard

### Missing Data
1. Ensure data files exist in `sessions/` and `events/`
2. Run `npm run build:data` locally to test
3. Check `public/data/deployment-info.json` for build details

### Performance Issues
1. Check Lighthouse scores in Netlify
2. Optimize images if added
3. Review caching headers in `netlify.toml`

## 📊 Monitoring

### Analytics
- Enable Netlify Analytics in dashboard
- Track page views and performance
- Monitor build frequency

### Uptime
- Netlify provides 99.9% uptime SLA
- Status page: status.netlify.com
- Set up status notifications

## 🔐 Security

### Headers
Security headers are configured in `netlify.toml`:
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy: Configured for null.community API

### HTTPS
- Automatic SSL certificates
- HTTP to HTTPS redirects
- HSTS headers enabled

## 💡 Tips

1. **Test locally first**: Always run `npm run build` locally before deploying
2. **Use branch deploys**: Create feature branches for testing
3. **Monitor build times**: Large datasets may increase build time
4. **Cache strategy**: Data files are cached for 1 hour, static assets for 1 year
5. **Mobile testing**: Use Netlify's device preview feature

## 🆘 Support

- Netlify Documentation: [docs.netlify.com](https://docs.netlify.com)
- Community Forum: [community.netlify.com](https://community.netlify.com)
- Status Page: [status.netlify.com](https://status.netlify.com)
