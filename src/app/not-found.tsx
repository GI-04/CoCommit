import Link from "next/link";

// Unknown address: say so and give a way back (the navigation is still around it).
export default function NotFound() {
  return (
    <div className="block-pink mx-auto mt-6 max-w-md p-8 text-center">
      <h1 className="text-[40px] font-semibold leading-tight">Page not found</h1>
      <p className="mt-2 text-sm">That page doesn&apos;t exist or has moved. Check the address, or go back to Home.</p>
      <Link href="/home" className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90">
        Back to Home
      </Link>
    </div>
  );
}
