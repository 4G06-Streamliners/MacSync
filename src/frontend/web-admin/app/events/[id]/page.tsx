import Link from "next/link";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return (
    <div className="max-w-xl">
      <Link
        href="/events"
        className="text-sm font-medium text-maroon hover:text-maroon-dark"
      >
        ← Back to events
      </Link>
      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-600 font-medium">Event detail</p>
        <p className="text-sm text-gray-500 mt-1">
          Full event editing and management coming soon.
        </p>
      </div>
    </div>
  );
}
