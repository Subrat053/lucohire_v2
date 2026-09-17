const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const prisma = require('./config/prisma');
const { withLegacyIds } = require('./utils/prismaResponse');
const { validateEnv } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const authRoutesV1 = require('./routes/authRoutesV1');
const providerRoutes = require('./routes/providerRoutes');
const providerAIRoutes = require('./routes/providerAI');
const recruiterRoutes = require('./routes/recruiterRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const jobRoutes = require('./routes/jobRoutes');
const searchRoutes = require('./routes/searchRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const planRoutes = require('./routes/planRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const jobRoleRoutes = require('./routes/jobRoleRoutes');
const chatRoutes = require('./routes/chatRoutes');
const claimProfileRoutes = require('./routes/claimProfileRoutes');
const aiRoutes = require('./modules/ai/routes/ai.routes');
const partnerRoutes = require('./routes/partnerRoutes');
const adminPartnerRoutes = require('./routes/adminPartnerRoutes');
const otpRoutes = require('./routes/otpRoutes');
const adminOutreachRoutes = require('./routes/adminOutreach.routes');
const webhookRoutes = require('./routes/webhookRoutes');
const { setIO } = require('./services/notificationService');
const { detectLocaleFromRequest, reverseGeocodeCoordinates, COUNTRY_CURRENCY_FALLBACK } = require('./utils/geoLocation');
const { getExchangeRates } = require('./utils/exchangeRates');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requireOperationalFlags } = require('./middleware/operationalFeatureGate');

const isEnabled = (name) => String(process.env[name] || '').trim().toLowerCase() === 'true';

const app = express();
app.disable('x-powered-by');
const server = http.createServer(app);

// Serve uploads statically
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const resumesDir = path.join(__dirname, 'uploads', 'resumes');
if (!fs.existsSync(resumesDir)) {
  fs.mkdirSync(resumesDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const envValidation = validateEnv();
if (Array.isArray(envValidation?.warnings) && envValidation.warnings.length > 0) {
  envValidation.warnings.forEach((warning) => {
    console.warn(`[ENV WARNING] ${warning}`);
  });
}

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://lucohire.mallofcayman.online',
  'https://luco.bangalorerapid.online',
  'https://www.lucohire.com',
  'https://www.lucohire.com',
  'http://192.168.1.7:5173',
  'http://172.18.16.1:5173',
];
const corsOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const combinedOrigins = [...new Set([...defaultCorsOrigins, ...corsOrigins])];

const corsOriginPatterns = [
  /^https:\/\/[a-z0-9-]+\.mallofcayman\.online$/i,
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/i,
  /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/i,
  /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/i,
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (combinedOrigins.includes(origin)) return true;
  return corsOriginPatterns.some((pattern) => pattern.test(origin));
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'", "https:", "http:", "blob:", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "data:", "https://scripts.clarity.ms", "https://www.clarity.ms", "https://checkout.razorpay.com", "https://cdn.razorpay.com", "https://*.razorpay.com", "https://www.googletagmanager.com", "https://accounts.google.com", "https://*.googleapis.com", "https://apis.google.com", "https://*.firebaseapp.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "data:", "https://scripts.clarity.ms", "https://www.clarity.ms", "https://checkout.razorpay.com", "https://cdn.razorpay.com", "https://*.razorpay.com", "https://www.googletagmanager.com", "https://accounts.google.com", "https://*.googleapis.com", "https://apis.google.com", "https://*.firebaseapp.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "https:", "http:", "https://www.youtube.com", "https://api.razorpay.com", "https://checkout.razorpay.com", "https://*.razorpay.com"],
    },
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  frameguard: false,
}));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: combinedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true // for compatibility
});

// Pass io to notification service
setIO(io);

io.on('connection', (socket) => {
  // Clients join a room named after their userId for targeted notifications
  socket.on('join', (userId) => {
    if (userId) socket.join(`user_${userId}`);
  });

  socket.on('disconnect', () => {});
});

// Connect Database
connectDB().then(() => {});

// Enable trusting reverse proxies (Nginx, Cloudflare, etc.)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000,
  message: { message: 'Too many requests, please try again later.' },
  validate: { trustProxy: false }
});
app.use('/api/', limiter);

// Stripe webhook – must receive RAW body before express.json() parses it
app.post(
  '/api/payments/webhook',
  requireOperationalFlags('ENABLE_WEBHOOKS', 'ENABLE_PAYMENT_PROVIDERS'),
  express.raw({ type: 'application/json' }),
  require('./controllers/paymentController').stripeWebhook
);

// Razorpay webhook - must receive RAW body before express.json() parses it
app.post(
  '/api/payments/razorpay-webhook',
  requireOperationalFlags('ENABLE_WEBHOOKS', 'ENABLE_PAYMENT_PROVIDERS'),
  express.raw({ type: 'application/json' }),
  require('./controllers/paymentController').razorpayWebhook
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Prevent caching of sensitive/authenticated responses
app.use([
  '/api/auth',
  '/api/v1/auth',
  '/api/v1/admin',
  '/api/admin',
  '/api/provider',
  '/api/recruiter',
  '/api/partner',
  '/api/user',
  '/api/otp',
], (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
  },
}));

// Public skill categories (no auth required)
app.get('/api/skills', async (req, res) => {
  try {
    const cats = withLegacyIds(await prisma.skillCategory.findMany({
      where: { isActive: true },
      orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
    }));
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public company & footer details (no auth required)
app.get('/api/public/company-details', async (req, res) => {
  try {
    const setting = await prisma.adminSetting.findUnique({ where: { key: 'admin_company_details' } });
    res.json(setting?.value || {
      companyName: 'Lucohire Inc.',
      registrationDetails: '',
      addressLine1: '',
      addressLine2: '',
      gstNumber: '',
      footerDescription: "India's AI-powered hiring platform. Verified providers, fair distribution, WhatsApp-first.",
      copyrightText: '© 2026 Lucohire. All rights reserved.',
      supportEmail: '',
      supportPhone: ''
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Newsletter subscription
app.post('/api/public/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const normalizedEmail = email.toLowerCase();
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: normalizedEmail } });
    
    if (existing) {
      if (!existing.isActive) {
        await prisma.newsletterSubscriber.update({
          where: { email: normalizedEmail },
          data: { isActive: true },
        });
        return res.json({ message: 'Successfully re-subscribed to newsletter' });
      }
      return res.json({ message: 'Already subscribed to newsletter' });
    }
    
    await prisma.newsletterSubscriber.create({ data: { email: normalizedEmail } });
    res.json({ message: 'Successfully subscribed to newsletter' });
  } catch (err) {
    console.error('Newsletter subscription error:', err);
    res.status(500).json({ message: 'Failed to subscribe' });
  }
});

// Routes
// Public & Onboarding Routes
app.use('/api/claim-profile', claimProfileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutesV1);
app.use('/api/webhooks', webhookRoutes);

// Admin bulk outreach engine
app.use('/api/v1/admin/outreach', adminOutreachRoutes);
app.use('/api/v1/admin/data-pipeline', require('./routes/adminDataPipeline.routes'));
app.use('/api/v1/pipeline', require('./routes/pipeline.routes'));

// Protected Routes
app.use('/api/v1/admin', adminAuthRoutes);
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/provider/custom-plan', require('./routes/provider/customPlan.routes'));
app.use('/api/provider', providerRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/v1/providers', providerRoutes);
app.use('/api/provider/wallet', require('./routes/providerWalletRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/provider/ai', providerAIRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/recruiter-plans', require('./routes/recruiterPlanRoutes'));
app.use('/api/admin/payout-withdrawals', require('./routes/adminWithdrawalRoutes'));
// Debug: log incoming admin route requests to help diagnose 404/401 issues (development only)
if (process.env.NODE_ENV === 'development') {
  app.use('/api/admin', (req, res, next) => {
    try {
      const authPresent = !!(req.headers && req.headers.authorization);
      console.log(`[ADMIN DEBUG] ${new Date().toISOString()} ${req.method} ${req.originalUrl} auth:${authPresent}`);
    } catch (e) {
      // ignore logging errors
    }
    next();
  });
}
// Admin Partner Routes
app.use('/api/v1/admin/partners', adminPartnerRoutes);

// Admin AI Routes (More specific paths first)
app.use('/api/admin/ai', require('./routes/adminAIRoutes'));
app.use('/api/v1/admin/ai', require('./routes/adminAIRoutes'));

// Main Admin Routes
app.use('/api/admin', adminRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin/health', require('./routes/adminHealthRoutes'));

// Bank Account Routes
app.use('/api/v1/manager/bank-account', require('./routes/managerBankAccountRoutes'));
app.use('/api/v1/admin/manager-bank-accounts', require('./routes/adminBankAccountRoutes'));


// Debug ping for admin routing checks (development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/admin/debug-ping', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));
}
app.use('/api/faq', require('./routes/faqRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/jobs', jobRoutes);
app.use('/api/v1/external-jobs', require('./modules/externalJobs/externalJob.routes'));
app.use('/api/v1/admin/job-sources', require('./modules/jobSources/jobSource.routes'));
app.use('/api/v1/admin/company-sources', require('./modules/companySources/companySource.routes'));
app.use('/api/v1/admin/sync', require('./modules/syncEngine/syncLogs.routes'));
app.use('/api/v1/admin/recruiter-leads', require('./modules/recruiterIntelligence/recruiterLeads.routes'));
app.use('/api/search', searchRoutes);
app.use('/api/wage-estimator', require('./routes/wageEstimatorRoutes'));
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/vision', require('./routes/googleVisionRoutes'));
app.use('/api/translate', require('./routes/translateRoutes'));
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/refunds', require('./routes/refundRoutes'));
app.use('/api/plans', planRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/job-roles', jobRoleRoutes);
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/v1/support', require('./routes/supportRoutes'));
app.use('/api/v1/unlock-profile', require('./routes/unlockProfileRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/location', require('./routes/locationRoutes'));
app.use('/api/location', require('./routes/autocompleteRoutes'));
app.use('/api/candidate', require('./routes/candidateReportRoutes'));
app.use('/api/candidate-matching', require('./modules/jobMatching/matching.routes'));
app.use('/api/recruiter/ai', require('./routes/recruiterAiRoutes'));
app.use('/api/recruiter-copilot', require('./routes/recruiterCopilot.routes'));
app.use('/api/profile-share', require('./routes/profileShareRoutes'));
app.use('/api/candidates', require('./routes/resumeRoutes'));
app.use('/api', require('./routes/homepageMetricsRoutes'));
if (process.env.NODE_ENV === 'development') {
  app.use('/api', require('./routes/testAI'));
}
app.use('/api/v1/partner', partnerRoutes);
app.use('/api/referrals', require('./routes/referralRoutes'));
app.use('/api/enquiry', require('./routes/enquiryRoutes'));
app.use('/api/otp', otpRoutes);

// Automated Job Pipeline & Freelancer Core
app.use('/api/v1/admin/pipeline', require('./routes/pipeline.routes'));
app.use('/api/freelancer', require('./routes/freelancer.routes'));

// Sitemap XML routes
const sitemapController = require('./controllers/sitemapController');
app.get('/sitemap.xml', sitemapController.getSitemap);
app.get('/api/sitemap.xml', sitemapController.getSitemap);

// SEO dynamic routes
app.use('/jobs', require('./routes/seoRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});



// Localization: detect country from request
app.get('/api/locale/detect', async (req, res) => {
  const fallback = { country: 'US', currency: 'USD', locale: 'en' };

  try {
    const detected = await detectLocaleFromRequest(req);
    const jwt = require('jsonwebtoken');
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
        if (decoded?.id) {
          const user = await prisma.user.findUnique({
            where: { id: String(decoded.id) },
            select: { id: true, country: true, currency: true, locale: true, preferredLanguage: true },
          });
          if (user) {
            const userCountry = user.country || '';
            const userCurrency = user.currency || '';
            const userLocale = user.preferredLanguage || user.locale || '';

            // If the user's location is geolocated to a specific country (not loopback fallback),
            // and their DB profile country or currency differs from the actual physical location,
            // we update the DB profile to match the physical location.
            if (detected.country && (userCountry !== detected.country || userCurrency !== (detected.currency || COUNTRY_CURRENCY_FALLBACK[detected.country]))) {
              user.country = detected.country;
              user.currency = detected.currency || COUNTRY_CURRENCY_FALLBACK[detected.country] || 'USD';
              user.locale = user.locale || detected.locale || 'en';
              user.preferredLanguage = user.preferredLanguage || user.locale;
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  country: user.country,
                  currency: user.currency,
                  locale: user.locale,
                  preferredLanguage: user.preferredLanguage,
                },
              });
              return res.json({
                country: user.country,
                currency: user.currency,
                locale: user.preferredLanguage || user.locale,
                source: 'detected-and-updated',
              });
            }

            if (userCountry && userCurrency && userLocale) {
              return res.json({ country: userCountry, currency: userCurrency, locale: userLocale, source: 'user' });
            }

            user.country = user.country || detected.country;
            user.currency = user.currency || COUNTRY_CURRENCY_FALLBACK[user.country] || detected.currency;
            user.locale = user.locale || detected.locale;
            user.preferredLanguage = user.preferredLanguage || user.locale;
            await prisma.user.update({
              where: { id: user.id },
              data: {
                country: user.country,
                currency: user.currency,
                locale: user.locale,
                preferredLanguage: user.preferredLanguage,
              },
            });

            return res.json({
              country: user.country,
              currency: user.currency,
              locale: user.preferredLanguage || user.locale,
              source: 'detected-and-synced',
            });
          }
        }
      } catch (_) {
        // Ignore token decode errors for public fallback behavior.
      }
    }

    return res.json({
      country: detected.country || fallback.country,
      currency: detected.currency || fallback.currency,
      locale: detected.locale || fallback.locale,
      source: detected.source || 'detected',
    });
  } catch (_) {
    return res.json(fallback);
  }
});

// Reverse geocoding (free): lat/lng -> nearest city/state/country
app.get('/api/locale/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ message: 'lat and lng query params are required' });
  }

  const result = await reverseGeocodeCoordinates(lat, lng);
  if (!result) {
    return res.status(400).json({ message: 'Unable to resolve nearest location for provided coordinates' });
  }

  return res.json(result);
});

// Currency config (public)
app.get('/api/locale/currencies', async (req, res) => {
  try {
    const settings = await prisma.adminSetting.findMany({ where: { category: 'currency' } });
    const config = {};
    settings.forEach(s => { config[s.key] = s.value; });

    const fallbackInrAed = parseFloat(config.exchange_rate_INR_AED) || 0.044;
    const fallbackInrUsd = parseFloat(config.exchange_rate_INR_USD) || 0.012;
    const exchangeRates = await getExchangeRates({
      fallbackInrAed,
      fallbackInrUsd,
    });

    res.json({
      INR: { symbol: '₹', code: 'INR', locale: 'en-IN' },
      AED: { symbol: 'AED', code: 'AED', locale: 'en-AE' },
      USD: { symbol: '$', code: 'USD', locale: 'en-US' },
      exchangeRates: {
        INR_AED: exchangeRates.INR_AED,
        INR_USD: exchangeRates.INR_USD,
      },
      exchangeSource: exchangeRates.source,
      exchangeFetchedAt: exchangeRates.fetchedAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/', (req, res)=>{
    res.send('Welcome to the Job Portal API');
})

// 404 handler
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const { execSync } = require('child_process');

function killProcessOnPort(port) {
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set();
      output.split(/\r?\n/).filter(Boolean).forEach(line => {
        if (/\sLISTENING\s/i.test(line)) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (/^\d+$/.test(pid)) pids.add(pid);
        }
      });
      for (const pid of pids) {
        console.log(`[AutoPortFree] Killing PID ${pid} on port ${port}...`);
        try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' }); } catch (_) {}
      }
    } else {
      const output = execSync(`lsof -t -i tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' });
      output.split(/\r?\n/).filter(Boolean).forEach(pid => {
        console.log(`[AutoPortFree] Killing PID ${pid} on port ${port}...`);
        try { process.kill(Number(pid), 'SIGKILL'); } catch (_) {}
      });
    }
    return true;
  } catch (_) {
    return false;
  }
}

let listenAttempts = 0;
const MAX_LISTEN_ATTEMPTS = 3;

function startOptionalBackgroundServices() {
  const workersEnabled = isEnabled('ENABLE_WORKERS');
  const cronEnabled = isEnabled('ENABLE_CRON');
  const crawlersEnabled = isEnabled('ENABLE_CRAWLERS');
  const outreachEnabled = isEnabled('ENABLE_OUTREACH');
  const communicationProvidersEnabled = isEnabled('ENABLE_COMMUNICATION_PROVIDERS');
  const aiEnabled = isEnabled('AI_FEATURES_ENABLED');
  const embeddingsEnabled = isEnabled('AI_EMBEDDINGS_ENABLED');
  const matchingEnabled = isEnabled('ENABLE_RECRUITER_MATCHING') || isEnabled('ENABLE_JOB_AI_MATCHING');
  const pipelineJobsEnabled = isEnabled('ENABLE_PIPELINE_JOBS');
  const connectorsEnabled = isEnabled('ENABLE_CONNECTORS');

  if (workersEnabled) {
    const { registerQueueHandlers } = require('./services/queueHandlers');
    const { startHomepageMetricsWorker } = require('./workers/homepageMetrics.worker');
    registerQueueHandlers();
    startHomepageMetricsWorker();
  }

  if (workersEnabled && matchingEnabled && communicationProvidersEnabled) {
    const { startCandidateDigestWorker } = require('./workers/candidateDigest.worker');
    startCandidateDigestWorker();
  }

  if (workersEnabled && aiEnabled && embeddingsEnabled) {
    require('./workers/candidateRescan.worker');
  }

  if (cronEnabled) {
    const { startCronJobs } = require('./utils/cronJobs');
    const { startHomepageMetricsCron } = require('./jobs/homepageMetrics.cron');
    const { initSubscriptionCron } = require('./cron/subscriptionCron');
    const { initRecruiterUsageCron } = require('./cron/recruiterUsageCron');

    startCronJobs();
    startHomepageMetricsCron();
    initSubscriptionCron();
    initRecruiterUsageCron();
  }

  if (cronEnabled && matchingEnabled && communicationProvidersEnabled) {
    const { startCandidateDigestCron } = require('./jobs/candidateDigest.cron');
    startCandidateDigestCron();
  }

  if (crawlersEnabled && workersEnabled) {
    const { startCrawlerWorker } = require('./workers/crawlerWorker');
    require('./workers/nightlyScraper.worker');
    startCrawlerWorker();
  }

  if (crawlersEnabled && cronEnabled) {
    const { startBatchScraperCron } = require('./jobs/batchScraper.cron');
    const { startJobScraperCron } = require('./workers/jobScraper');
    require('./jobs/nightlyScraper.cron');
    startBatchScraperCron();
    startJobScraperCron();
  }

  if (pipelineJobsEnabled && connectorsEnabled && cronEnabled) {
    const { initPipelineCron } = require('./cron/pipelineCron');
    const pipelineCronService = require('./services/pipelineCron.service');
    initPipelineCron();
    pipelineCronService.init();
  }

  if (outreachEnabled && communicationProvidersEnabled && workersEnabled) {
    require('./workers/outreach.worker');
  }

  if (outreachEnabled && communicationProvidersEnabled && cronEnabled) {
    const { startOutreachCron } = require('./jobs/outreach.cron');
    startOutreachCron();
  }
}

function startServer() {
  listenAttempts++;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startOptionalBackgroundServices();
  });
}

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    if (listenAttempts >= MAX_LISTEN_ATTEMPTS) {
      console.error(`Port ${PORT} is still in use after ${MAX_LISTEN_ATTEMPTS} attempts. Giving up.`);
      console.error('Run "npm run port:kill" to stop that process, then restart backend.');
      process.exit(1);
    }
    console.warn(`[AutoPortFree] Port ${PORT} is in use. Attempting to free it (attempt ${listenAttempts}/${MAX_LISTEN_ATTEMPTS})...`);
    killProcessOnPort(PORT);
    // Close the current server handle so we can re-listen
    server.close(() => {});
    setTimeout(() => {
      startServer();
    }, 1500);
    return;
  }

  console.error('Server startup failed:', error);
  process.exit(1);
});

startServer();





// trigger restart
