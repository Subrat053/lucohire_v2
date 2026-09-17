# Lucohire — Portfolio Approval Workflow & Image Upload Optimization Context

This document explains the technical implementation of Issue 7.6 (Portfolio Link Approval Workflow) and Issue 7.7 (Automatic File & Image Compression Before Upload) in the ServiceHub / Lucohire application.

---

## 1. Issue 7.6 — Portfolio Link Approval Workflow

### What Was Fixed
We successfully brought all user-provided portfolio links under the standard administrative profile moderation workflow. Now, whenever a provider adds new portfolio links (or edits an existing approved link), those links are submitted for admin approval before appearing on the public profile page. 

### Why the Fix Was Needed
Previously, users could directly publish arbitrary URLs (e.g. Website, Behance, GitHub, LinkedIn, Dribbble) without any oversight. This created significant security risks (including XSS, phishing redirects, `javascript:` or `data:` script injections, and generic spam content). Furthermore, if a provider wanted to edit an already approved link, there was no way to keep their profile clean while moderating the change.

### Backend Design
- **Extended Database Schema**: The provider profile model (`ProviderProfile.js`) has been refactored to support a structured array mapping out platform links with metadata (`platform`, `url`, `status`, `rejectionReason`, `submittedAt`, `reviewedAt`, `reviewedBy`).
- **Backward Compatibility**: A Mongoose `post('init')` middleware automatically migrates old flat string portfolio links to the new structured format as `status: 'approved'` on-the-fly, preventing database errors or empty profiles.
- **XSS & Protocol Protection**: A dedicated service wrapper `urlSafetyService.js` was introduced to enforce allowlisted domains (`linkedin.com`, `github.com`, `behance.net`, `dribbble.com`, `instagram.com`, `youtube.com`) and block high-risk protocols/scripts.
- **Pending-Live Separation**: If a user edits a previously approved link, the old approved link remains live on their public profile while the edited one is sent as pending.
- **Admin Moderation**: New endpoints were registered in `adminRoutes.js` (`getPortfolioApprovals`, `approvePortfolioLink`, `rejectPortfolioLink`) to allow admins to easily approve or reject links with clear justifications.

### Frontend Integration
- **`PortfolioLinksManager`**: A beautiful, premium component integrated on the provider edit profile form. Shows badge states (Approved, Pending Review, Rejected with reason popover) and runs client-side allowlist validations.
- **`SafeExternalLink`**: Outbound links open in a new tab securely using XSS sanitizers and `rel="noopener noreferrer"`.
- **`PortfolioApprovalPanel`**: An administrative control board that allows moderators to inspect, safely open, and approve/reject pending links.

---

## 2. Issue 7.7 — Automatic File & Image Compression Before Upload

### What Was Fixed
We implemented client-side image compression and document validation before files are sent to the server. Images are compressed to optimized, low-footprint format (prioritizing WebP where browser supports it) and double-validated on the server to prevent huge payloads and malicious uploads.

### Why the Fix Was Needed
Profile photos, documents, and other media were uploaded in original sizes, which resulted in:
- Slow upload speeds and poor user experience.
- Skyrocketing bandwidth and cloud storage costs (Cloudinary).
- Page lag on public listings because images were unoptimized.
- Security vulnerabilities from missing server-side MIME-type verification (e.g., uploading executable `.exe` or `.js` script scripts renamed as images).

### Core Optimization Features
- **Frontend WebP Compression (`fileCompressionService.js`)**: Converts images (JPG, PNG, WebP) to highly optimized WebP format at `0.8` quality, resizing profile photos to max 300KB and portfolio assets to max 500KB. 
- **Strict Document Validation (`fileValidationService.js`)**: Blocks dangerous formats (`.exe`, `.js`, `.sh`, `.bat`, `.php`, `.html`, etc.) and enforces file limits between 2-5MB.
- **Real-Time UX Alerts**: Integrates loader overlays and messages ("Optimizing image...", "Uploading...") while disabling action buttons to prevent duplicate network calls.
- **Cache-Busted URLs**: Newly uploaded photos are fetched with `?v=timestamp` query versioning, instantly refreshing headers/navbars without manual hard refreshes.
- **Server Metadata Records**: Server validates size and MIME types, storing optimized metadata (`originalName`, `mimeType`, `finalSize`, `uploadedBy`, `uploadedAt`) under `profile.uploadedAssets`.

---

## 3. Files Modified and Created

### Backend
* **[NEW]** `backend/utils/urlSafetyService.js` — Domain checking, URL validation, and protocol sanitation.
* **[MODIFY]** `backend/models/ProviderProfile.js` — Extended schema fields and Mongoose post-init migration hooks.
* **[MODIFY]** `backend/controllers/providerController.js` — Moderated portfolio edits, MIME validations, and uploadedAssets tracking.
* **[MODIFY]** `backend/controllers/adminController.js` — Standard endpoints for listing pending links and reviewing (approve/reject).
* **[MODIFY]** `backend/routes/adminRoutes.js` — Admin-only endpoints for link moderation.
* **[MODIFY]** `backend/controllers/recruiterController.js` — File validation checks on photo upload.

### Frontend
* **[NEW]** `frontend/src/utils/fileCompressionService.js` — Canvas image optimization, scaling, and WebP converter.
* **[NEW]** `frontend/src/utils/fileValidationService.js` — Extension and format constraints.
* **[NEW]** `frontend/src/components/common/SafeExternalLink.jsx` — Secure outbound links.
* **[NEW]** `frontend/src/components/common/PortfolioLinksManager.jsx` — Provider links edit module.
* **[NEW]** `frontend/src/components/admin/PortfolioApprovalPanel.jsx` — Moderator board.
* **[NEW]** `frontend/src/pages/admin/PortfolioApprovals.jsx` — Route container page for panel.
* **[MODIFY]** `frontend/src/pages/provider/Profile.jsx` — Embedded PortfolioLinksManager and compression layers.
* **[MODIFY]** `frontend/src/pages/recruiter/Profile.jsx` — Integrated photo compression on upload.
* **[MODIFY]** `frontend/src/pages/ProviderPublicProfile.jsx` — Show only approved portfolio links safely.
* **[MODIFY]** `frontend/src/routes/AdminRoutes.jsx` — Added lazy loaded route for portfolio-approvals.
* **[MODIFY]** `frontend/src/components/admin/AdminLayout.jsx` — Mounted sidebar navigation item.

---

## 4. Testing Checklist

Use the following sequence to verify features manually:

### Portfolio Links Workflow
- [ ] **Valid Domain Add**: Add a valid GitHub or Behance URL. Confirm it shows a "Pending Review" badge.
- [ ] **Invalid Domain Block**: Try adding a non-allowlist domain to GitHub platform (e.g. facebook.com). Verify client-side rejection.
- [ ] **Dangerous URL Check**: Add `javascript:alert('xss')` link. Verify it is blocked immediately.
- [ ] **Link Edit Live Check**: Update an already approved GitHub link. Verify that public profile still renders the old link, while user profile shows the new link as "Pending Review".
- [ ] **Admin Approval**: Open Admin page → Portfolio Approvals → Click "Approve". Verify user badge changes to "Approved" and appears on public profile.
- [ ] **Admin Rejection**: Admin clicks "Reject" → supplies justification message. Verify user sees red "Rejected" status badge with the tooltip showing the reason.

### File Optimization & Uploads
- [ ] **Image Compression**: Upload a large (>2MB) high-res JPEG photo. Verify toast shows "Optimizing image...", compresses the file under 300KB, and uploads successfully.
- [ ] **Validation Limits**: Try uploading a 12MB document. Verify it is rejected.
- [ ] **Format Whitelist**: Try uploading an `.exe` or `.html` script. Verify it is rejected immediately by security layers.
- [ ] **Progress locks**: Confirm submit button locks and loaders display during compression.
- [ ] **No Refresh Update**: Confirm profile photo immediately changes in headers without hard refresh.

---

## 5. Rollback Notes
- Reverting the file changes in `ProviderProfile.js`, `providerController.js`, `adminController.js`, and `adminRoutes.js` is safe and won't affect existing database records.
- All new files are modular and can be deleted if a rollback is triggered.
