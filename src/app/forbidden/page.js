import Link from "next/link";

export const metadata = { title: "Access denied" };

export default function Forbidden() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="mt-2 text-slate-600">Your role does not allow you to open this page.</p>
      <Link href="/dashboard" className="btn btn-primary mt-6">
        Back to dashboard
      </Link>
    </main>
  );
}
