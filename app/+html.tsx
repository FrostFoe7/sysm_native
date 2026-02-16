// app/+html.tsx
import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

/**
 * This file is web-only and used to configure the root HTML for every page.
 * It's equivalent to `index.html` in a standard React project.
 */
export default function HTML({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* 
          Explicitly allow Supabase connections and common external scripts/assets.
          - connect-src: allows talking to Supabase.
          - script-src: allows self scripts and potentially necessary analytics.
          - img-src: allows images from any source (common for avatars/media).
        */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://img1.wsimg.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
        />

        <ScrollViewStyleReset />

        {/* Add any additional <head> elements here */}
      </head>
      <body>{children}</body>
    </html>
  );
}
