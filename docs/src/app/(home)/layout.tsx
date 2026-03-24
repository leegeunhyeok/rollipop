import { HomeNavBar } from '@/components/navbar';
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{ component: <HomeNavBar /> }}
      sidebar={{
        collapsible: false,
        className: '!ps-0',
      }}
      containerProps={{
        className:
          'pt-4 md:pt-[42px] lg:pt-[56px] lg:items-center !block [&_[data-sidebar-placeholder]]:!hidden [&_[data-sidebar-panel]]:!hidden',
      }}
      searchToggle={{ enabled: false }}
      themeSwitch={{ enabled: false }}
    >
      {children}
    </DocsLayout>
  );
}
