# IP Restriction Fix - Multiple IPs in x-forwarded-for Header

## Problem
The IP restriction feature for Manager/Employee roles only checked the first IP in the `x-forwarded-for` header. When multiple IPs were present (e.g., `"183.80.131.93,127.0.0.1"`), the system only validated the first IP and ignored subsequent ones, causing legitimate access to be blocked.

## Root Cause
In `backend/src/auth/auth.controller.ts`, the code was using:
```typescript
const clientIp = (forwarded.split(',')[0] || '').trim() || req.ip || req.socket?.remoteAddress || '';
```

This only extracted the first IP from a comma-separated list, ignoring any additional IPs that might be allowed.

## Solution
Modified both `auth.controller.ts` and `auth.service.ts` to:

1. **Extract all IPs from x-forwarded-for header**:
   ```typescript
   // In auth.controller.ts
   const forwardedIps = forwarded ? forwarded.split(',').map(ip => ip.trim()).filter(ip => ip) : [];
   const clientIp = forwardedIps[0] || req.ip || req.socket?.remoteAddress || '';
   
   // Pass all possible IPs to AuthService
   return this.authService.login(loginDto, clientIp, forwardedIps);
   ```

2. **Check all possible IPs in AuthService**:
   ```typescript
   // In auth.service.ts - Updated login method
   async login(loginDto: LoginDto, clientIp?: string, forwardedIps?: string[]) {
     // ... existing code ...
     
     // Check all possible IPs (clientIp and all forwarded IPs)
     const allPossibleIps = [clientIp];
     if (forwardedIps && forwardedIps.length > 0) {
       allPossibleIps.push(...forwardedIps);
     }
     
     const normalizedIps = allPossibleIps.map(ip => this.normalizeClientIp(ip)).filter(ip => ip);
     const isAllowed = normalizedIps.some(ip => allowedNormalized.includes(ip));
   }
   ```

## Testing Results
✅ **PASS**: `x-forwarded-for: '183.80.131.93,127.0.0.1'` - Login successful (127.0.0.1 found in position 2)
✅ **PASS**: `x-forwarded-for: '192.168.1.100,10.0.0.1'` - Login blocked (no allowed IPs found)

## Files Modified
- `backend/src/auth/auth.controller.ts` - Updated IP extraction logic
- `backend/src/auth/auth.service.ts` - Updated IP validation to check all possible IPs

## Impact
- Fixes issue where legitimate users were blocked when their allowed IP appeared in any position other than first in x-forwarded-for
- Maintains security by still blocking unauthorized IPs
- Improves logging to show all IPs being checked
- Backward compatible with existing single IP configurations

## User Validation
User `dieulinh@gmail.com` with `allowedLoginIps: ["183.80.131.93", "127.0.0.1"]` can now successfully login with:
- Direct IP access
- Proxy scenarios where localhost appears in any position of the forwarded header chain
