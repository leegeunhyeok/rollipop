import { source } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const baseUrl = 'https://rollipop.dev';
  const pages = source.getPages();

  const lines = [
    '# Rollipop',
    '',
    '> A modern build toolkit for React Native, powered by Rolldown.',
    '',
    '## Docs',
    '',
    ...pages.map((page) => `- [${page.data.title}](${baseUrl}${page.url}.md)`),
  ];

  return new Response(lines.join('\n'));
}
