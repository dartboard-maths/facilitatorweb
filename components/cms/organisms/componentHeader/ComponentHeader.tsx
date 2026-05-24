import type { CmsHeader, CmsRenderContext } from "../../../../lib/cms/contentful";
import { CmsSiteHeader } from "../../CmsSiteChrome";

type ComponentHeaderProps = {
  data: CmsHeader;
  renderContext?: CmsRenderContext;
};

export default function ComponentHeader({ data, renderContext }: ComponentHeaderProps) {
  if (!data) {
    return null;
  }

  return <CmsSiteHeader header={data} renderContext={renderContext} />;
}
