import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { getAdminNavigationGroups, adminNavigationEntries } from "../src/admin/navigation/AdminNavigationRegistry";
import { AdminSidebarGroup } from "../src/admin/components/navigation/AdminSidebarGroup";

Object.assign(globalThis, { React });
const all = getAdminNavigationGroups(() => true);
assert.deepEqual(all.map((group) => group.label), ["Overview", "Create & Edit", "Prepare Media", "Review & Publish", "Members & Access", "System & Settings"]);
assert.equal(all.flatMap((group) => group.entries).length, adminNavigationEntries.length);
assert.equal(new Set(adminNavigationEntries.map((entry) => entry.navigationKey)).size, adminNavigationEntries.length);
assert.equal(all.find((group) => group.groupKey === "content")!.entries[0].navigationKey, "production_workspace");
const limited = getAdminNavigationGroups((permission) => permission === "releases.read");
assert.ok(limited.flatMap((group) => group.entries).every((entry) => !entry.requiredPermission || entry.requiredPermission === "releases.read"));
assert.ok(!limited.some((group) => group.groupKey === "system"));
const system = all.find((group) => group.groupKey === "system")!;
const render = (path: string, mode: "expanded" | "collapsed", forceExpanded = false) => renderToStaticMarkup(
  React.createElement(StaticRouter, { location: path },
    React.createElement(AdminSidebarGroup, { group: system, mode, badges: {}, forceExpanded })),
);
assert.match(render("/admin/releases", "expanded"), /aria-expanded="false"/);
assert.match(render("/admin/settings", "expanded"), /aria-expanded="true"/);
assert.match(render("/admin/releases", "expanded", true), /aria-expanded="true"/);
assert.ok(!render("/admin/releases", "collapsed").includes('class="hidden"'));
console.log("Admin workflow navigation passed: ordering, complete route retention, permission filtering, active group expansion, search expansion and collapsed navigation.");
