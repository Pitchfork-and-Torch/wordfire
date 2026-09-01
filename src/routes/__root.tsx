import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { AccessibilityShell } from "@/components/accessibility-shell";
import { AtmosphereShell } from "@/components/atmosphere/atmosphere-shell";
import { InstallHint } from "@/components/pwa/install-hint";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { APP_VERSION } from "@/lib/version";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const SITE_URL = "https://wordfire.jonbailey.xyz";
const OG_IMAGE = `${SITE_URL}/og.jpg?v=${APP_VERSION}`;
const META_DESCRIPTION =
  "Peer-to-peer campfire storytelling. One word at a time. Pass-and-play on one device, or a remote WebRTC circle.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "description",
        content: META_DESCRIPTION,
      },
      { title: "Wordfire — Campfire storytelling" },
      { name: "theme-color", content: "#0c0a09" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "Wordfire" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:site_name", content: "Wordfire" },
      { property: "og:locale", content: "en_US" },
      { property: "og:title", content: "Wordfire — Campfire storytelling" },
      {
        property: "og:description",
        content: META_DESCRIPTION,
      },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:secure_url", content: OG_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Wordfire — peer-to-peer campfire storytelling",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@suddenlyjon" },
      { name: "twitter:creator", content: "@suddenlyjon" },
      { name: "twitter:title", content: "Wordfire — Campfire storytelling" },
      {
        name: "twitter:description",
        content: META_DESCRIPTION,
      },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: "Wordfire — peer-to-peer campfire storytelling" },
    ],
    links: [
      { rel: "canonical", href: `${SITE_URL}/` },
      { rel: "alternate", type: "text/plain", href: `${SITE_URL}/llms.txt`, title: "llms.txt" },
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Source+Sans+3:wght@400;500;600&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icons/icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" data-theme="night" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <AuthProvider>
          <AccessibilityShell>
            <AtmosphereShell>
              <Outlet />
              <InstallHint />
              <RegisterServiceWorker />
            </AtmosphereShell>
          </AccessibilityShell>
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              className: "!bg-bg-elevated !text-fg !border-border",
            }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
