# Codex Comprehensive Production Audit Prompt

Use this prompt with Codex CLI to perform a complete audit of the GIVRwrld platform.

## Command

```bash
codex exec --full-auto "PROMPT_BELOW"
```

## Full Prompt

```
Perform a comprehensive production audit of the GIVRwrld game server hosting platform. Review all aspects systematically and provide actionable findings with priorities.

## Audit Scope

### 1. SUPABASE EDGE FUNCTIONS
Review all Edge Functions in `supabase/functions/` for:
- Security: JWT verification, authentication flows, authorization checks, CORS configuration
- Error handling: Try-catch blocks, error messages, logging, error recovery
- Best practices: Code quality, type safety, response formats, input validation
- Environment variables: Usage, fallbacks, consistency, missing secrets
- Critical functions to focus on:
  - stripe-webhook (payment processing, order creation, provisioning trigger)
  - create-checkout-session (Stripe integration, metadata handling)
  - servers-provision (Pterodactyl integration, server creation, capacity tracking)
  - create-pterodactyl-user (user creation, password handling, account linking)
  - start-server / stop-server (power control, user ownership verification)
  - get-server-status (authentication, data access)

### 2. PTERODACTYL INTEGRATION
Review Pterodactyl API integration:
- API endpoint usage: Verify correct endpoints (application API vs client API)
- User creation flow: Auto-creation, linking, password encryption, error handling
- Server provisioning: Node selection, capacity tracking, allocation management
- Environment variables: PANEL_URL vs PTERODACTYL_URL consistency
- Error handling: API failures, retry logic, fallback mechanisms
- Files to review:
  - supabase/functions/servers-provision/index.ts
  - supabase/functions/create-pterodactyl-user/index.ts
  - supabase/functions/start-server/index.ts
  - supabase/functions/stop-server/index.ts

### 3. STRIPE INTEGRATION
Review Stripe payment processing:
- Checkout session creation: Validation, metadata, URL handling, error cases
- Webhook processing: Signature verification, event handling, error recovery
- Payment flow: Order creation, subscription management, status updates
- Configuration: Webhook endpoint setup, secret management, LIVE vs TEST mode
- Error handling: Payment failures, webhook retries, order reconciliation
- Files to review:
  - supabase/functions/stripe-webhook/index.ts
  - supabase/functions/create-checkout-session/index.ts
  - src/services/stripeService.ts

### 4. FRONTEND (REACT/TYPESCRIPT)
Review frontend application:
- Environment variables: Usage, hardcoded values, fallbacks, production vs dev
- API integration: Supabase client usage, Edge Function calls, error handling
- Error handling: User-friendly messages, error boundaries, error recovery
- Code quality: TODOs, bundle size, type safety, unused code
- Security: API key exposure, sensitive data handling, XSS vulnerabilities
- Files to review:
  - src/integrations/supabase/client.ts
  - src/config/environment.ts
  - src/config/env.ts
  - src/services/stripeService.ts
  - src/hooks/useServerStats.ts

### 5. DATABASE SCHEMA & MIGRATIONS
Review database structure:
- Migration syntax: Check for SQL errors, syntax issues, conflicts
- Schema design: Relationships, indexes, constraints, foreign keys
- Data integrity: RLS policies, data validation, referential integrity
- Performance: Missing indexes, query optimization opportunities
- Files to review:
  - supabase/migrations/*.sql
  - Check for migration conflicts or errors

### 6. ENVIRONMENT CONFIGURATION
Review configuration management:
- Supabase secrets: Required vs optional, naming consistency, missing values
- Frontend env vars: VITE_* variables, production vs dev, fallbacks
- VPS configuration: Nginx, SSL, security headers (if applicable)
- Documentation: Environment variable documentation, setup guides
- Files to review:
  - .env.example
  - REQUIRED_SECRETS_DOCUMENTATION.md
  - supabase/config.toml

### 7. SECURITY AUDIT
Comprehensive security review:
- Authentication: JWT verification, session management, token expiration
- Authorization: User ownership checks, RLS policies, function-level security
- Data protection: Password encryption, sensitive data handling, PII protection
- CORS: Origin validation, allowed methods, header configuration
- API security: Rate limiting, input validation, SQL injection prevention
- Secrets management: Hardcoded secrets, exposed keys, secret rotation

### 8. ERROR HANDLING & LOGGING
Review error handling patterns:
- Consistency: Error response formats, error codes, error messages
- Logging: Log levels, log content, sensitive data in logs
- Recovery: Retry logic, fallback mechanisms, graceful degradation
- User experience: User-friendly error messages, error boundaries
- Monitoring: Error tracking, alerting, observability

### 9. CODE QUALITY & BEST PRACTICES
Review code quality:
- Type safety: TypeScript usage, any types, type definitions
- Code organization: File structure, code duplication, modularity
- Documentation: Code comments, README files, API documentation
- Testing: Test coverage, test quality, missing tests
- Performance: Bundle size, lazy loading, code splitting, optimization

### 10. OPERATIONAL READINESS
Review operational aspects:
- Monitoring: Logging, metrics, alerting, health checks
- Backup & recovery: Backup strategies, recovery procedures
- Deployment: CI/CD, deployment procedures, rollback plans
- Documentation: Runbooks, troubleshooting guides, setup instructions
- Scalability: Performance bottlenecks, resource usage, scaling strategies

## Output Format

Provide your audit in the following structured format:

### Executive Summary
- Overall production readiness score (0-10)
- Critical issues count
- High priority issues count
- Medium priority issues count
- Go/No-Go recommendation

### Critical Issues (Blocking Launch)
For each critical issue:
- **Issue:** Brief description
- **Location:** File path and line numbers
- **Impact:** What breaks or is at risk
- **Fix:** Specific code changes or configuration updates
- **Priority:** CRITICAL

### High Priority Issues (Should Fix Soon)
For each high priority issue:
- **Issue:** Brief description
- **Location:** File path and line numbers
- **Impact:** What's affected
- **Fix:** Specific recommendations
- **Priority:** HIGH

### Medium Priority Issues (Nice to Have)
For each medium priority issue:
- **Issue:** Brief description
- **Location:** File path and line numbers
- **Impact:** Minor issues or improvements
- **Fix:** Recommendations
- **Priority:** MEDIUM

### Detailed Findings by Category

#### 1. Security Issues
[List all security findings with file references]

#### 2. Bugs & Errors
[List all bugs with file references and fixes]

#### 3. Code Quality Issues
[List code quality issues with improvements]

#### 4. Missing Error Handling
[List missing error handling with fixes]

#### 5. Configuration Issues
[List configuration problems with fixes]

#### 6. Performance Issues
[List performance concerns with optimizations]

#### 7. Documentation Gaps
[List missing or incomplete documentation]

### Recommendations

#### Immediate Actions (Before Launch)
1. [Action item with file references]
2. [Action item with file references]

#### Short-Term Improvements (1-2 Weeks)
1. [Action item]
2. [Action item]

#### Long-Term Enhancements (1-3 Months)
1. [Action item]
2. [Action item]

### Files Requiring Immediate Attention
- [File path] - [Reason]
- [File path] - [Reason]

## Specific Areas to Focus On

1. **Auto-Provisioning Flow:** Verify the complete flow from purchase → webhook → order creation → provisioning → server creation
2. **Error Recovery:** Check if failures are handled gracefully and can be recovered
3. **Security:** Verify all authentication and authorization checks are in place
4. **Configuration:** Verify all required secrets and environment variables are documented
5. **Integration:** Verify Stripe, Pterodactyl, and Supabase integrations are correct

## Important Notes

- Be thorough but practical - focus on what matters for production
- Provide specific file paths and line numbers for all findings
- Include code snippets for fixes when helpful
- Prioritize security and functionality issues
- Consider the impact on users and operations
- Verify backward compatibility when suggesting changes

## Deliverables

1. Comprehensive audit report with all findings
2. Prioritized list of fixes
3. Specific code changes for critical issues
4. Configuration recommendations
5. Security assessment
6. Production readiness score and recommendation
```

## Usage

1. **Save this prompt** to a file (e.g., `codex-audit-prompt.txt`)

2. **Run Codex audit:**
   ```bash
   codex exec --full-auto "$(cat CODEX_AUDIT_PROMPT.md | sed -n '/## Full Prompt/,/```/p' | sed '1d;$d')"
   ```

   Or copy the prompt content and run:
   ```bash
   codex exec --full-auto "PASTE_PROMPT_HERE"
   ```

3. **Review the output** and prioritize fixes based on the audit results

## Expected Output

Codex should provide:
- Comprehensive audit report
- Prioritized list of issues
- Specific file references and line numbers
- Code fixes for critical issues
- Production readiness assessment
- Go/No-Go recommendation

## Notes

- Ensure Codex is authenticated: `codex login` or set `OPENAI_API_KEY`
- The audit may take several minutes depending on codebase size
- Review all findings carefully before implementing fixes
- Test all fixes in a staging environment first

