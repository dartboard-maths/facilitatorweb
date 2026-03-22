import type { CmsRenderContext, CmsSupportedComponent } from "../../lib/cms/contentful";
import PageRenderer from "./PageRenderer";

type CmsPageRendererProps = {
  components: CmsSupportedComponent[];
  useFallback?: boolean;
  renderContext?: CmsRenderContext;
};

export function CmsPageRenderer({ components, useFallback = true, renderContext }: CmsPageRendererProps) {
  return <PageRenderer components={components} useFallback={useFallback} renderContext={renderContext} />;
}
