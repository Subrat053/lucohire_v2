# Authentication Context & Implementation Log

This file records the active developer context, system definitions, business rules, and planned solutions for **Topic 3: Multi-User Registration & Authentication Gaps** in the ServiceHub repository.

---

## 1. System Context & Active Roles
The application defines exactly **4 roles**:
1. **Admin**: Manages all roles and panels. (Excluded from public signups).
2. **Partner**: Referral logic. (Uses a separate or admin-controlled registration flow).
3. **Recruiter**: Recruits providers, posts jobs, manages applications.
4. **Provider**: Searches recruiters, posts, applies to jobs.

There is **no normal "User" role** in the Mongoose database schema or routing system.

---

## 2. Multi-Profile Account Rules
- Recruiter and Provider profiles can belong to the **same login account** (identified by email).
- A common account can have one provider profile, one recruiter profile, or both profiles.
- **Duplicate Prevention**: Signing up with an already registered email must never create a separate account record in the database.
  - If signup role profile **already exists**: Return `ROLE_PROFILE_ALREADY_EXISTS`.
  - If signup role profile **does not exist**: Return `EMAIL_ALREADY_EXISTS` with an instruction to login and activate the missing profile from the dashboard.
- **Profile Switching**:
  - If switching panels to a role and the profile exists: allow direct panel routing.
  - If switching panels to a role and the profile is missing: show the `RoleCompletionModal` to complete missing role fields. Once submitted, update the Mongoose user's `roles` array and `activeRole`.

---

## 3. Problem Statements & Resolving Tactics

### Problem 3.1: Dynamic Role Signup
- **Tactic**: Refactor frontend `AuthPage.jsx` signup state to support a single controlled state including dynamic child objects: `providerProfile` (for `skills`, `location`, `experience`) and `recruiterProfile` (for `companyName`, `gstNumber`, `companyLocation`).
- Update fields in real-time when `selectedRole` changes between `"provider"` and `"recruiter"`, preserving common details (name, email, phone, password).
- Implement dynamic validations (GST number format check `gstRegex`, provider skills check).
- Apply duplicate checks on the backend `registerEmail` controller.

### Problem 3.2: Email format Validation
- **Tactic**: Integrate real-time email verification check using regex `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` on keyup/typing.
- Show an inline error warning under the input box, disable the submit button, and block form posts.
- Mirror verification regex inside the backend controllers.

### Problem 3.3: Blank Item
- **Tactic**: Kept blank as requested, with a TODO comment to prevent unrequested scope additions.

### Problem 3.4: Password Visibility Toggle
- **Tactic**: Create a reusable `PasswordInput.jsx` component that maps eye toggling icons with high accessibility (`aria-label`) and class styling, replacing all manual password inputs in `AuthPage.jsx`.

### Problem 3.5: Erased Form Recovery
- **Tactic**: Strip state clearing triggers inside `.catch()` blocks when captcha or server validations fail, keeping user text preserved.

### Problem 3.6: Structured Backend Auth Error Codes
- **Tactic**: Implement explicit error responses containing `{ success: false, code: "...", message: "..." }` for structured mapping:
  - `USER_NOT_FOUND`
  - `WRONG_PASSWORD`
  - `ACCOUNT_DISABLED`
  - `EMAIL_NOT_VERIFIED`
  - `INVALID_EMAIL`
  - `EMAIL_ALREADY_EXISTS`
  - `ROLE_PROFILE_ALREADY_EXISTS`
  - `ROLE_PROFILE_MISSING`
  - `PROFILE_INCOMPLETE`
  - `CAPTCHA_FAILED`
  - `SERVER_ERROR`

---

## 4. Modified Files Mapping
1. **`backend/models/RecruiterProfile.js`**: Insert `gstNumber` schema entry.
2. **`backend/controllers/authController.js`**: Integrate same-email duplicate consolidated checks, role-specific validation, structured error logins, and profile switch verification.
3. **`frontend/src/components/common/PasswordInput.jsx`**: [NEW] Reusable accessibility-compliant password field.
4. **`frontend/src/pages/AuthPage.jsx`**: Controlled signup state, dynamic fields rendering, real-time email format verification, data retention on catches, and PasswordInput migration.
