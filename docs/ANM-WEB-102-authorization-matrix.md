# ANM-WEB-102 Authorization Matrix

| Area | Read | Create | Update | Publish/High Risk | Delete/Recovery |
|---|---|---|---|---|---|
| Users/Roles | `users.read`, `roles.read` | `users.create` | `users.update`, `users.assign_roles` | `users.disable`, `users.reset_password` | `users.restore` |
| Artists | `artists.read` | `artists.create` | `artists.update` | `artists.publish`, `artists.unpublish`, `artists.archive`, `artists.restore` | `artists.delete` |
| Releases | `releases.read` | `releases.create` | `releases.update` | `releases.publish`, `releases.unpublish`, `releases.archive`, `releases.restore` | `releases.delete` |
| Gallery | `gallery.read` | `gallery.create` | `gallery.update` | `gallery.publish`, `gallery.unpublish`, `gallery.archive`, `gallery.restore` | `gallery.delete` |
| Media | `media.read` | `media.upload` | `media.update`, `media.edit`, `media.link` | `media.replace`, `media.generate_signed_url`, `media.processing.*` | `media.delete`, rollback/version actions |
| Homepage/Site | `homepage.read`, `site_settings.read` | N/A | `homepage.update`, `site_settings.update` | `homepage.publish`, `site_settings.publish` | rollback/archive via service |
| Metadata | `metadata.read` | `metadata.update` | `metadata.update` | `metadata.publish` | archive/restore via service |
| Publication | `publication.read` | N/A | N/A | `publication.publish`, `publication.unpublish`, `publication.retry`, `publication.cancel` | `publication.rollback` |
| Forms | `contact.read`, `newsletter.read` | N/A | `contact.update`, `newsletter.manage` | export/delete requires high-risk permission | `contact.delete` |
| Analytics/Privacy | `analytics.read`, `privacy_settings.read` readiness | N/A | privacy settings readiness | privacy publish readiness | export requires dedicated permission readiness |
| Security | `security.read` | N/A | `security.manage` | `security.scan`, `security.launch.review` | `security.exception.approve` |

Rule: frontend visibility is not authorization. Every admin route must authenticate and call `requirePermission` or an equivalent service authorization guard.
