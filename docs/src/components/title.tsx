import Image from 'next/image';
import Link from 'next/link';

const LOGO_SIZE = 40;

export function Title() {
  return (
    <Link href="/" className="mr-5 flex flex-row items-center justify-center gap-2">
      <Image src="/logo.svg" alt="Rollipop" width={LOGO_SIZE} height={LOGO_SIZE} />
      <p className="font-medium text-md">Rollipop</p>
    </Link>
  );
}
