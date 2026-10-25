# Close decisions
- /admin signed-out goes to /login instead of showing "Access denied": not one of the rollback pages, so no rollback; recorded as HUMAN-REVIEW.
- OTP send check needed the site Origin header (403 forbidden_origin without it); re-ran with it, got 400 invalid_phone.
