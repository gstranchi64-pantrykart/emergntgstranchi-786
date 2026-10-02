# Test Credentials - PantryKart Live (PantryMaster ERP)

Auth: Mobile OTP login. Demo mode bypass OTP: **123456** (or 1234, or the otpHint returned by verify-mobile API).

| Role | Mobile | Name |
|------|--------|------|
| ADMIN | 9876543210 | System Administrator |
| CUSTOMER | 9123456780 | Ramesh Kumar (Parent, CUS-000001) |
| CUSTOMER (child) | 9123456781 | Sunita Kumar (CUS-000001-01) |
| CUSTOMER | 9835012345 | Priya Sharma (CUS-000002) |
| CUSTOMER | 9431198765 | Amit Verma (CUS-000003) |
| DELIVERY_BOY | 9988776655 | Rajesh Delivery Boy (DEL-001) |
| DELIVERY_BOY | 9988776656 | Vikram Singh (DEL-002) |
| AUDITOR | 9876500001 | Suresh Field Auditor (AUD-001) |
| AUDITOR | 9876500002 | Anjali Verma (AUD-002) |

API login flow:
1. POST /api/auth/verify-mobile {"mobile":"<10-digit>"} -> returns otpHint
2. POST /api/auth/verify-otp {"mobile":"...","otp":"123456"} -> returns session token
