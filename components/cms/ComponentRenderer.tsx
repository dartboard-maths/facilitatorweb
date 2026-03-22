import { getComponent } from "./registry";
import FallbackComponent from "./blocks/FallbackComponent";
import type { CmsRenderContext } from "../../lib/cms/contentful";

type CmsComponentRecord = {
  type: string;
  id?: string;
  data: unknown;
};

type ComponentRendererProps = {
  component: CmsComponentRecord;
  useFallback?: boolean;
  renderContext?: CmsRenderContext;
};

export default function ComponentRenderer({ component, useFallback = true, renderContext }: ComponentRendererProps) {
  if (!component?.type) {
    return null;
  }

  const Component = getComponent(component.type, useFallback);
  if (!Component) {
    return useFallback ? <FallbackComponent componentType={component.type} /> : null;
  }

  return <Component data={component.data} renderContext={renderContext} />;
}
