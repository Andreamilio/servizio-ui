import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Servizio UI",
  description: "Servizio UI - Gestione accessi e controllo porte",
  other: {
    "color-scheme": "light dark",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                const viewportMeta = document.querySelector('meta[name="viewport"]');
                const viewportContent = viewportMeta?.getAttribute('content') || '';
                const hasViewportFit = viewportContent.includes('viewport-fit=cover');
                const isStandalone = (window.navigator.standalone === true) || window.matchMedia('(display-mode: standalone)').matches;
                const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0px';
                
                fetch('http://127.0.0.1:7242/ingest/3df387f4-627b-438e-a378-69576d8b319f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:script',message:'Viewport and PWA check',data:{hasViewportFit,isStandalone,safeAreaBottom,viewportContent,userAgent:navigator.userAgent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[SW] Service Worker registrato con successo:', registration.scope);
                    })
                    .catch(function(error) {
                      console.error('[SW] Errore registrazione Service Worker:', error);
                    });
                });
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                
                // Listener per messaggi dal service worker (solo per logging/debug)
                // Il service worker mostra già la notifica automaticamente, non serve duplicarla
                function setupPushListener() {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(function(registration) {
                      // Listener per messaggi dal service worker (solo logging)
                      navigator.serviceWorker.addEventListener('message', function(event) {
                        if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
                          console.log('[Client] Notifica push ricevuta dal service worker:', event.data.data);
                          // Non mostriamo la notifica qui perché il service worker la mostra già
                          // Questo evita notifiche duplicate
                        }
                      });
                    });
                  }
                }
                
                // Setup quando DOM è pronto
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', setupPushListener);
                } else {
                  setupPushListener();
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
