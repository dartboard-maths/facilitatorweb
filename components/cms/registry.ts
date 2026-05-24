import type { ComponentType } from "react";
import ComponentHeroBanner from "./organisms/componentHeroBanner/ComponentHeroBanner";
import ComponentHeader from "./organisms/componentHeader/ComponentHeader";
import ComponentBodyCopy from "./organisms/componentBodyCopy/ComponentBodyCopy";
import ComponentCardGrid from "./organisms/componentCardGrid/ComponentCardGrid";
import ComponentTitleBodyCta from "./organisms/componentTitleBodyCta/ComponentTitleBodyCta";
import ComponentListBlock from "./organisms/componentListBlock/ComponentListBlock";
import ComponentTwoColumnTextImage from "./organisms/componentTwoColumnTextImage/ComponentTwoColumnTextImage";
import ComponentTwoColumnImageCopyList from "./organisms/componentTwoColumnImageCopyList/ComponentTwoColumnImageCopyList";
import type { CmsRenderContext } from "../../lib/cms/contentful";

type RegistryComponent = ComponentType<{ data: any; renderContext?: CmsRenderContext }>;

const componentRegistry: Record<string, RegistryComponent> = {
  componentHeroBanner: ComponentHeroBanner as RegistryComponent,
  componentHeader: ComponentHeader as RegistryComponent,
  componentBodyCopy: ComponentBodyCopy as RegistryComponent,
  componentCardGrid: ComponentCardGrid as RegistryComponent,
  componentTitleBodyCta: ComponentTitleBodyCta as RegistryComponent,
  componentListBlock: ComponentListBlock as RegistryComponent,
  componentTwoColumnTextImage: ComponentTwoColumnTextImage as RegistryComponent,
  componentTwoColumnImageCopyList: ComponentTwoColumnImageCopyList as RegistryComponent,
};

export function getComponent(componentType: string, useFallback = true): RegistryComponent | null {
  void useFallback;
  if (componentType in componentRegistry) {
    return componentRegistry[componentType];
  }

  return null;
}

export default componentRegistry;
