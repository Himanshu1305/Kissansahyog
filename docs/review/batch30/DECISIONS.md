# Batch 30 - decisions

Founder's rule (28 Nov 2026): anyone can register with e-mail or with a mobile number; only an e-mail login can be an admin; an admin can make another admin.

1. E-mail registration is a second, separate page (/signup-email): name, e-mail, password, village, the same visibility choice and acknowledgment. No mobile number is asked or stored (profiles.phone stays empty). Any e-mail provider works. The farmer sign-up (name + mobile) is unchanged.
2. Admin rights need an e-mail login at three levels: a profile can only be marked admin if it has an e-mail login (database trigger); an admin must present a live session opened by an e-mail sign-in (sessions now remember how they were opened); the older admin check, which looked only at the flag, now uses the same rule.
3. Who can make an admin: any admin can make an "editor"; only a super admin can make a "super". Reason: it follows the founder's words ("I or any admin") while keeping the highest role with super admins. The person must already have an e-mail account, must not be blocked or already an admin. Every grant is written to the admin log.
4. Existing mobile-number registrations (for example Abhinandan Dixit's) cannot be linked to an e-mail afterwards: the person registers once more with an e-mail and is made admin. The old mobile profile can stay or be blocked. Linking would need a code sent to the mobile to be safe, and that was judged not worth the complexity.
5. The migration refuses to run (changing nothing) if any current admin has no e-mail login, so nobody is locked out. After it runs, every admin signs in once with e-mail and password (their old sessions no longer count as admin sessions).
6. Not changed: the OTP switches, the farmer login, the Supabase Auth settings (sign-ups must already be allowed there, as they were for the earlier e-mail sign-up).
