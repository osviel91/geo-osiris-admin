import { createLayerAction } from "@/app/actions";
import { LayerForm } from "@/components/LayerForm";

export default function NewLayerPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">New managed layer</h1>
      <LayerForm action={createLayerAction} />
    </section>
  );
}
