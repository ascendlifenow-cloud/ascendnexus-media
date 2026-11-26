import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createMemoryRouter, matchRoutes, type RouteObject } from "react-router-dom";
import { memberReturnPath } from "../src/utils/memberReturnPath";

// Extract actual route declarations so matching tests cannot drift to a copied route map.
const source = ts.createSourceFile("AppRouter.tsx", readFileSync(new URL("../src/routes/AppRouter.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const adminSource = ts.createSourceFile("AdminAppRoutes.tsx", readFileSync(new URL("../src/routes/AdminAppRoutes.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const groups: RouteObject[][] = [];
const tag = (node: ts.JsxElement | ts.JsxSelfClosingElement) => ts.isJsxElement(node) ? node.openingElement : node;
const attribute = (node: ts.JsxElement | ts.JsxSelfClosingElement, name: string) => tag(node).attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText() === name) as ts.JsxAttribute | undefined;
const literal = (node: ts.JsxElement | ts.JsxSelfClosingElement, name: string) => {
  const value = attribute(node, name)?.initializer;
  return value && ts.isStringLiteral(value) ? value.text : undefined;
};
const childRoutes = (node: ts.JsxElement): RouteObject[] => node.children.flatMap(child => {
  if ((!ts.isJsxElement(child) && !ts.isJsxSelfClosingElement(child)) || tag(child).tagName.getText() !== "Route") return [];
  const path = literal(child, "path");
  const element = attribute(child, "element")?.initializer?.getText() ?? "";
  const handle = { element, redirect: /<Navigate\s+to="([^"]+)"/.exec(element)?.[1] };
  return [attribute(child, "index") ? { index: true, handle } : { path, handle, children: ts.isJsxElement(child) ? childRoutes(child) : undefined }];
});
const visit = (node: ts.Node) => {
  if (ts.isJsxElement(node) && tag(node).tagName.getText() === "Routes") groups.push(childRoutes(node));
  ts.forEachChild(node, visit);
};
visit(adminSource);
visit(source);
assert.equal(groups.length, 2, "Review extraction when routing structure changes");
const routesFor = (path: string) => groups[path.startsWith("/admin") ? 0 : 1];
const leaf = (path: string) => matchRoutes(routesFor(path), path)?.at(-1)?.route;
for (const [path, component] of [
  ["/", "LandingPage"], ["/songs", "ReleasesCatalogPage"], ["/songs/example", "SongDetailPage"],
  ["/releases/example", "SongDetailPage"], ["/artists/example", "ArtistDetailPage"], ["/artwork", "ArtworkCollagePage"],
  ["/login", "PublicMemberLoginPage"], ["/verify-email", "VerifyEmailPage"], ["/reset-password", "ResetPasswordPage"],
  ["/member", "MemberDashboardPage"], ["/member/songs/example", "SongDetailPage"], ["/member/profile", "MemberProfilePage"],
  ["/member/sessions", "MemberSessionsPage"], ["/admin/login", "AdminLoginPage"], ["/admin/dashboard", "AdminDashboardPage"],
  ["/admin/releases/new", "AdminReleaseFormPage"], ["/admin/releases/example/edit", "AdminReleaseFormPage"],
  ["/admin/artists/example/edit", "AdminArtistFormPage"], ["/admin/media/review", "AdminMediaReviewQueuePage"],
  ["/admin/media/processing", "AdminMediaProcessingPage"], ["/not-a-route", "PublicNotFoundPage"],
]) assert.ok(leaf(path)?.handle.element.includes(component), `Incorrect route for ${path}`);
assert.equal(leaf("/account/profile")?.handle.redirect, "/member/profile");
assert.equal(leaf("/account")?.handle.redirect, "/member");
assert.equal(leaf("/admin/unknown")?.handle.redirect, "/admin/dashboard");
assert.ok(matchRoutes(groups[1], "/member/songs/example")?.some(match => match.route.handle.element.includes("MemberRouteGuard")));
assert.ok(matchRoutes(groups[0], "/admin/releases/new")?.some(match => match.route.handle.element.includes("AdminProtectedRoute")));
const router = createMemoryRouter(groups[1], { initialEntries: ["/songs"] });
try {
  await router.navigate("/songs/example?source=catalog");
  assert.equal(router.state.location.pathname, "/songs/example");
  assert.equal(router.state.location.search, "?source=catalog");
  await router.navigate("/member/sessions", { replace: true });
  assert.equal(router.state.location.pathname, "/member/sessions");
} finally { router.dispose(); }
for (const path of ["/member", "/member/songs/example", "/member/profile?tab=details#name"]) assert.equal(memberReturnPath(path), path);
for (const path of [null, "", "https://example.com/member", "//example.com/member", "/membership", "/admin", "/member\\evil", "/member/%5cevil", "/member/%2fexample.com", "/member/../../admin", "/member/\nhello", "/member/%", "/member/%255cfoo"]) assert.equal(memberReturnPath(path), null, `Unsafe return path accepted: ${path}`);
console.log("Router migration passed: actual route matching, aliases, guard placement, memory navigation and safe member return paths. No authenticated browser acceptance claimed.");
