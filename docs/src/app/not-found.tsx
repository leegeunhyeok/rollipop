import { HomeNavBar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { source } from '@/lib/source';
import cn from 'classnames';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{ component: <HomeNavBar /> }}
      sidebar={{
        collapsible: false,
        className: '!ps-0',
        component: <Sidebar mobileOnly />,
      }}
      containerProps={{
        className: '!px-4 pt-4 md:!px-12 md:pt-[42px] lg:pt-[56px] lg:items-center',
      }}
      searchToggle={{ enabled: false }}
      themeSwitch={{ enabled: false }}
    >
      <div className="flex max-w-[1200px] flex-1 flex-col justify-center gap-4 px-8 pb-[100px] text-center">
        <h1 className="mx-auto w-full font-bold text-3xl sm:text-4xl">404</h1>
        <p>Oops! This page seems to have wandered off</p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'mx-auto rounded-full px-4 font-medium text-sm sm:text-base',
          )}
        >
          Return to Home
        </Link>
      </div>
    </DocsLayout>
  );
}
