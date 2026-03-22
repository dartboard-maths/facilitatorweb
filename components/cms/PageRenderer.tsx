import type { CmsRenderContext, CmsSupportedComponent } from "../../lib/cms/contentful";
import ComponentRenderer from "./ComponentRenderer";

type PageRendererProps = {
  components: CmsSupportedComponent[];
  useFallback?: boolean;
  renderContext?: CmsRenderContext;
};

export default function PageRenderer({ components, useFallback = true, renderContext }: PageRendererProps) {
  if (!components.length) {
    return null;
  }

  return (
    <div className="cms-page-content">
      {components.map((component) => (
        <ComponentRenderer key={component.id} component={component} useFallback={useFallback} renderContext={renderContext} />
      ))}
    </div>
  );
}
