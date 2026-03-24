import { DocsNavBar } from '@/components/navbar';
import { SidebarStyles } from '@/components/sidebar';
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { GitHubIcon } from '@/components/icons/github';
import cn from 'classnames';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import Link from 'next/link';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        component: (
          <>
            <DocsNavBar />
            <div className="h-14" />
          </>
        ),
      }}
      sidebar={{
        collapsible: false,
        className: 'bg-fd-background [&>div:first-child]:!p-0',
        footer: (
          <Link
            href="https://github.com/leegeunhyeok/rollipop"
            target="_blank"
            className={cn(buttonVariants({ size: 'icon', color: 'ghost' }))}
            aria-label="GitHub"
          >
            <GitHubIcon fill="currentColor" />
          </Link>
        ),
      }}
      containerProps={{
        className: 'h-dvh overflow-y-auto',
        style: {
          '--fd-docs-row-1': '56px',
        } as React.CSSProperties,
      }}
      searchToggle={{ enabled: false }}
      themeSwitch={{ mode: 'light-dark' }}
    >
      <SidebarStyles />
      {children}
    </DocsLayout>
  );
}
