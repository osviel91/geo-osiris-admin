import Link from "next/link";

import { createFeatureAction } from "@/app/actions";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FeatureForm } from "@/components/FeatureForm";
import { describeError } from "@/lib/errors";
import { getLayer, listFeatures } from "@/lib/geo-api";
import { isManaged, type AdminFeature, type AdminLayer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewFeaturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let layer: AdminLayer;
  let siblings: AdminFeature[];
  try {
    layer = await getLayer(id);
    siblings = (await listFeatures(id, { limit: 200 })).items;
  } catch (error) {
    return (
      <section className="space-y-4">
        <ErrorBanner error={describeError(error)} />
      </section>
    );
  }

  if (!isManaged(layer)) {
    return (
      <section className="space-y-4">
        <Link className="text-sm text-blue-700 hover:underline" href={`/layers/${layer.id}`}>
          ← {layer.name}
        </Link>
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          External layers are read-only. Features are created by source syncs.
        </p>
      </section>
    );
  }

  const labelProperty =
    typeof layer.style?.label_property === "string" ? layer.style.label_property : undefined;

  return (
    <section className="space-y-4">
      <div>
        <Link className="text-sm text-blue-700 hover:underline" href={`/layers/${layer.id}`}>
          ← {layer.name}
        </Link>
        <h1 className="text-xl font-semibold">Add point</h1>
      </div>
      <FeatureForm
        action={createFeatureAction}
        layerId={layer.id}
        siblingFeatures={siblings}
        labelProperty={labelProperty}
      />
    </section>
  );
}
