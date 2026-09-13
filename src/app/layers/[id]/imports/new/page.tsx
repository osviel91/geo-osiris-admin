import Link from "next/link";

import { ErrorBanner } from "@/components/ErrorBanner";
import { ImportUploadForm } from "@/components/ImportUploadForm";
import { describeError } from "@/lib/errors";
import { getLayer } from "@/lib/geo-api";
import { isManaged, type AdminLayer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let layer: AdminLayer;
  try {
    layer = await getLayer(id);
  } catch (error) {
    return (
      <section className="space-y-4">
        <Link className="text-sm text-blue-700 hover:underline" href="/layers">
          ← Layers
        </Link>
        <ErrorBanner error={describeError(error)} />
      </section>
    );
  }

  if (!isManaged(layer)) {
    return (
      <section className="space-y-4">
        <Link className="text-sm text-blue-700 hover:underline" href={`/layers/${id}`}>
          ← {layer.name}
        </Link>
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          External layers are read-only. Imports are only available for managed layers.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-blue-700 hover:underline" href={`/layers/${id}/imports`}>
          ← Imports
        </Link>
        <h1 className="text-xl font-semibold">New import</h1>
        <p className="text-sm text-gray-600">
          {layer.name} · {layer.slug}
        </p>
      </div>
      <ImportUploadForm layerId={layer.id} />
    </section>
  );
}
