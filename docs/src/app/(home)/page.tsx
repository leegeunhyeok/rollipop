import { Feature } from '@/components/feature';
import cn from 'classnames';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import Link from 'next/link';
import type { PropsWithChildren } from 'react';

export default function HomePage() {
  return (
    <div className="flex max-w-[1200px] flex-1 flex-col gap-4 p-4 xs:p-8 pt-16 xs:pt-20 text-center">
      <section className="flex items-center justify-center flex-col gap-4 mt-8 mb-0 md:mb-16">
        <div className="flex w-full max-w-[600px] drop-shadow-[0_0_16px_rgba(66,165,245,0.5)] xs:drop-shadow-[0_0_25px_rgba(66,165,245,0.5)] max-[1100px]:pl-0 justify-center items-center">
          <img
            alt="Rollipop"
            src="/logo.svg"
            className="w-36 h-36 sm:w-42 sm:h-42 md:w-54 md:h-54"
          />
        </div>
        <div className="flex max-w-[600px] flex-col justify-center whitespace-pre-wrap text-left items-center">
          <p className="w-fit bg-[linear-gradient(120deg,#42a5f5_5%,#96ccf9)] bg-clip-text font-bold text-4xl text-transparent leading-12 tracking-tight antialiased text-center sm:text-5xl sm:leading-15 md:text-6xl md:leading-18">
            Rollipop
          </p>
          <p className="leading:10 sm:leading:12 font-bold text-3xl text-fd-foreground-secondary tracking-tight antialiased text-center sm:text-4xl md:text-5xl md:leading-15">
            Modern build toolkit for React Native
          </p>
          <p className="mt-2 text-fd-muted-foreground text-lg text-center md:mt-4 md:text-2xl">
            Powered by Rolldown & Oxc
          </p>
          <div className="mt-6 flex flex-row gap-4">
            <Link
              href="/docs/get-started/create-project"
              type="button"
              className={cn(
                buttonVariants({ variant: 'primary' }),
                'cursor-pointer rounded-full px-4 text-md',
              )}
            >
              Get Started
            </Link>
            <Link
              href="/docs/get-started/introduction"
              type="button"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'cursor-pointer rounded-full px-4 text-md',
              )}
            >
              Introduction
            </Link>
          </div>
        </div>
      </section>
      <section className="mt-16 max-[1100px]:mt-12">
        <div className="mx-auto grid grid-cols-3 gap-4 max-[1100px]:max-w-[600px] max-[1100px]:grid-cols-1 max-[1100px]:gap-8">
          <Feature title="Powered by Rolldown" emoji="🔥">
            Fully compatible with the Rollup/Rolldown ecosystem, enabling seamless plugin
            integration and easy extensibility.
          </Feature>
          <Feature title="Frontend Ecosystem First" emoji="🌱">
            Adopts standard Node module resolution—no Haste. Includes Yarn PnP support for seamless
            integration with modern tooling.
          </Feature>
          <Feature title="Full-Featured Dev Server" emoji="⭐️">
            Native HMR, Fast Refresh, error symbolication, and source maps—everything you need out
            of the box.
          </Feature>
          <Feature title="Optimized Bundles" emoji="🪽">
            Tree-shaking reduces bundle size for faster app startup and improved initial load times.
          </Feature>
          <Feature title="Built-in Caching System" emoji="💾">
            File system and in-memory caching for faster iteration cycles without compromising
            accuracy.
          </Feature>
          <Feature title="Drop-in Metro Replacement" emoji="🚀">
            Compatible build and dev server APIs to replace Metro. Fully typed in TypeScript with no
            Flow dependencies.
          </Feature>
        </div>
      </section>
      <section className="mt-20 mb-16 max-[1100px]:mt-4 max-[1100px]:mb-12">
        <div className="mx-auto max-w-[800px] rounded-2xl border border-fd-border bg-fd-card p-4 max-[1100px]:max-w-[600px] sm:p-8 md:p-12">
          <h2 className="font-bold text-fd-foreground text-xl tracking-tight sm:text-3xl md:text-4xl">
            Modern Tooling, Standards-First
          </h2>
          <p className="mt-4 text-center text-base text-gray-500 leading-relaxed sm:mt-6 sm:text-lg md:text-xl">
            <b className="font-semibold text-fd-primary">Rollipop</b> is a Rolldown-powered bundler
            built for React Native developers. Embracing frontend ecosystem standards with
            extensible plugin architecture and fully-typed APIs—bringing modern web tooling
            excellence to development.
          </p>
        </div>
      </section>
      <footer className="mt-auto border-fd-border border-t bg-fd-background pt-8">
        <div className="mx-auto max-[1100px]:max-w-[600px]">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-fd-foreground text-sm">Documentation</p>
              <FooterLink href="/docs/get-started/introduction">Introduction</FooterLink>
              <FooterLink href="/docs/get-started/create-project">Get Started</FooterLink>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-fd-foreground text-sm">Community</p>
              <FooterLink
                href="https://github.com/leegeunhyeok/rollipop"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </FooterLink>
              <FooterLink
                href="https://github.com/leegeunhyeok/rollipop/discussions"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discussions
              </FooterLink>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-fd-foreground text-sm">Resources</p>
              <FooterLink
                href="https://github.com/leegeunhyeok/rollipop/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
              >
                License
              </FooterLink>
              <FooterLink
                href="https://github.com/leegeunhyeok/rollipop/releases"
                target="_blank"
                rel="noopener noreferrer"
              >
                Releases
              </FooterLink>
            </div>
          </div>
          <div className="mt-8 pt-4 text-center">
            <p className="text-fd-muted-foreground text-sm">
              Copyright © {new Date().getFullYear()}{' '}
              <Link
                href="https://github.com/leegeunhyeok"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fd-accent-foreground"
              >
                Geunhyeok LEE
              </Link>
              . All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterLink({
  href,
  children,
  target,
  rel,
}: PropsWithChildren<{ href: string; target?: string; rel?: string }>) {
  return (
    <Link
      className="text-fd-muted-foreground text-sm hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
      href={href}
      target={target}
      rel={rel}
    >
      {children}
    </Link>
  );
}
