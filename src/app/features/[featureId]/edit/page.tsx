import Link from "next/link";

import { updateFeatureAction } from "@/app/actions";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FeatureForm } from "@/components/FeatureForm";
import { describeError } from "@/lib/errors";
import { getFeature, getLayer, listFeatures } from "@/lib/geo-api";
import { isManaged, type AdminFeature, type AdminLayer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditFeaturePage({
  params,
}: {
  params: Promise<{ featureId: string }>;
}) {
  const { featureId } = await params;
  let feature: AdminFeature;
  let layer: AdminLayer;
  let siblings: AdminFeature[];
  try {
    feature = await getFeature(featureId);
    layer = await getLayer(feature.layer_id);
    siblings = (await listFeatures(layer.id, { limit: 200 })).items;
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
        <Link className="text-sm text-blue-700 hover:underline" href={`/features/${feature.id}`}>
          ← Feature
        </Link>
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          External layers are read-only.
        </p>
      </section>
    );
  }

  const labelProperty =
    typeof layer.style?.label_property === "string" ? layer.style.label_property : undefined;

  return (
    <section className="space-y-4">
      <div>
        <Link className="text-sm text-blue-700 hover:underline" href={`/features/${feature.id}`}>
          ← Feature
        </Link>
        <h1 className="text-xl font-semibold">Edit feature</h1>
        <p className="text-sm text-gray-600">
          Saving appends a provenance record. PATCH replaces geometry and properties.
        </p>
      </div>
      <FeatureForm
        action={updateFeatureAction}
        layerId={layer.id}
        feature={feature}
        siblingFeatures={siblings}
        labelProperty={labelProperty}
      />
    </section>
  );
}
