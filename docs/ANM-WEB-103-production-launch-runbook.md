# ANM-WEB-103 Production Launch Runbook

1. Confirm launch scope and release ID.
2. Confirm ANM-WEB-102 security decision.
3. Confirm legal/content readiness.
4. Confirm backup and restore evidence.
5. Confirm rollback target.
6. Confirm provider health.
7. Confirm DNS and TLS.
8. Confirm migration plan.
9. Build and verify artifact.
10. Deploy API.
11. Verify `/health/ready`.
12. Deploy workers.
13. Verify worker health and queues.
14. Deploy client.
15. Verify public site and APIs.
16. Verify media, CDN, and audio range requests.
17. Verify forms/email.
18. Verify analytics/consent.
19. Verify admin login and dashboard.
20. Run full-song/private-media checks.
21. Run `npm run deployment:launch-check -- --environment=production`.
22. Record launch decision.
23. Monitor intensified launch window.
24. Close launch or roll back.
