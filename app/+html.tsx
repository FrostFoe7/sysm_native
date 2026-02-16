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
          We use script-src-elem and connect-src explicitly to satisfy modern browsers.
        */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://img1.wsimg.com; script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://img1.wsimg.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
        />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
