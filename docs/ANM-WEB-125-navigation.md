# ANM-WEB-125 Navigation

The shared header now uses an upper-left dropdown menu instead of a wide horizontal navigation. The upper-right area reflects identity state:

- Guest: `Guest Access` badge plus Join CTA.
- Member: member display name and membership tier chips.

Authenticated navigation removes Join and Login and adds Dashboard and Logout. Logout revokes the member session, announces an auth-shell state change, clears member shell state on refresh, and restores the Guest shell.
