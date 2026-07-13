import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#F7F4EF" />
        <meta
          name="description"
          content="Black Rabbit Services — book local lawn and outdoor work in Yelm, Rainier, and Olympia, WA."
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body,#root{background:#F7F4EF;min-height:100%}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
