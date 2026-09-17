const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

// Fallback to index.html for SPA routing
app.use((req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
});

const PORT = 3055;
const ROUTES_TO_PRERENDER = ['/', '/about', '/contact', '/pricing', '/career-tips'];

const server = app.listen(PORT, '127.0.0.1', async () => {
    console.log(`Prerender server running on port ${PORT}`);
    
    try {
        const browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        for (const route of ROUTES_TO_PRERENDER) {
            console.log(`Prerendering ${route}...`);
            await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle0' });
            
            // Wait an extra second for any React animations/suspense to settle
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const html = await page.content();
            
            const routeDir = path.join(distDir, route);
            if (!fs.existsSync(routeDir)) {
                fs.mkdirSync(routeDir, { recursive: true });
            }
            
            fs.writeFileSync(path.join(routeDir, 'index.html'), html);
            console.log(`Saved ${route}/index.html`);
        }
        
        await browser.close();
        console.log('Prerendering complete!');
    } catch (err) {
        console.error('Error during prerendering:', err);
    } finally {
        server.close();
        process.exit(0);
    }
});
