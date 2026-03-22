import type { ComponentType } from "react";
import ComponentHeroBanner from "./organisms/componentHeroBanner/ComponentHeroBanner";
import ComponentBodyCopy from "./organisms/componentBodyCopy/ComponentBodyCopy";
import ComponentCardGrid from "./organisms/componentCardGrid/ComponentCardGrid";
import ComponentTitleBodyCta from "./organisms/componentTitleBodyCta/ComponentTitleBodyCta";
import ComponentListBlock from "./organisms/componentListBlock/ComponentListBlock";
import type { CmsRenderContext } from "../../lib/cms/contentful";

type RegistryComponent = ComponentType<{ data: any; renderContext?: CmsRenderContext }>;

const componentRegistry: Record<string, RegistryComponent> = {
  componentHeroBanner: ComponentHeroBanner as RegistryComponent,
  componentBodyCopy: ComponentBodyCopy as RegistryComponent,
  componentCardGrid: ComponentCardGrid as RegistryComponent,
  componentTitleBodyCta: ComponentTitleBodyCta as RegistryComponent,
  componentListBlock: ComponentListBlock as RegistryComponent,
};

export function getComponent(componentType: string, useFallback = true): RegistryComponent | null {
  void useFallback;
  if (componentType in componentRegistry) {
    return componentRegistry[componentType];
  }

  return null;
}

export default componentRegistry;
