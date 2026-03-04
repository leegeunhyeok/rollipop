export type Query = Record<string, string>;

export function parseUrl(value: string) {
  if (value.startsWith('/')) {
    const [pathname, query] = value.split('?');
    return {
      pathname,
      query: query ? toQueryObject(new URLSearchParams(query)) : {},
    };
  }

  const url = new URL(value);

  return {
    pathname: url.pathname,
    query: toQueryObject(url.searchParams),
  };
}

export function toQueryObject(searchParams: URLSearchParams): Query {
  return searchParams.entries().reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: value,
    }),
    {} as Query,
  );
}
