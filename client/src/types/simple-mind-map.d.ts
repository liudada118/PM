declare module "simple-mind-map" {
  interface MindMapOptions {
    el: HTMLElement;
    data?: any;
    layout?: string;
    theme?: string;
    themeConfig?: any;
    readonly?: boolean;
    textAutoWrapWidth?: number;
    defaultInsertSecondLevelNodeText?: string;
    defaultInsertBelowSecondLevelNodeText?: string;
    expandBtnStyle?: any;
    enableAutoEnterTextEditWhenInsertNode?: boolean;
    minZoomRatio?: number;
    maxZoomRatio?: number;
    scaleRatio?: number;
    mousewheelAction?: string;
    mousewheelZoomActionReverse?: boolean;
    initRootNodePosition?: [string, string];
    [key: string]: any;
  }

  class MindMap {
    constructor(options: MindMapOptions);
    static usePlugin(plugin: any, opt?: any): typeof MindMap;
    static hasPlugin(plugin: any): number;
    static pluginList: any[];
    static defineTheme(name: string, config?: any): void;
    static removeTheme(name: string): void;

    renderer: any;
    view: any;
    command: any;
    keyCommand: any;

    on(event: string, fn: (...args: any[]) => void): void;
    off(event: string, fn: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
    execCommand(...args: any[]): void;
    setData(data: any): void;
    getData(withConfig?: boolean): any;
    updateData(data: any): void;
    setFullData(data: any): void;
    setTheme(theme: string): void;
    getTheme(): string;
    setLayout(layout: string): void;
    getLayout(): string;
    render(): void;
    reRender(): void;
    destroy(): void;
    addPlugin(plugin: any, opt?: any): void;
    setThemeConfig(config: any): void;
    getCustomThemeConfig(): any;
  }

  export default MindMap;
}

declare module "simple-mind-map/src/plugins/Drag.js" {
  const Drag: any;
  export default Drag;
}

declare module "simple-mind-map/src/plugins/Select.js" {
  const Select: any;
  export default Select;
}

declare module "simple-mind-map/src/plugins/KeyboardNavigation.js" {
  const KeyboardNavigation: any;
  export default KeyboardNavigation;
}

declare module "simple-mind-map/src/plugins/Export.js" {
  const Export: any;
  export default Export;
}

declare module "simple-mind-map/src/plugins/MiniMap.js" {
  const MiniMap: any;
  export default MiniMap;
}

declare module "simple-mind-map/src/plugins/RichText.js" {
  const RichText: any;
  export default RichText;
}

declare module "simple-mind-map/src/parse/markdown.js" {
  export const transformToMarkdown: (root: any) => string;
  export const transformMarkdownTo: (md: string) => any;
}
