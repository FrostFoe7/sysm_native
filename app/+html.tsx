// app/+html.tsx
import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

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
          Comprehensive CSP Meta Tag.
          - script-src-elem: allows Cloudflare/GoDaddy scripts.
          - connect-src: allows Supabase AND blob: (needed to fetch local files for upload).
          - img-src: allows remote images + blob (local picker previews).
          - media-src: allows remote media + blob (local picker previews).
        */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://img1.wsimg.com; script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://img1.wsimg.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co blob:; img-src 'self' data: https: blob:; media-src 'self' https: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
        />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
