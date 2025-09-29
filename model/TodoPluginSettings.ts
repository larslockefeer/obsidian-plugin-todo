export interface TodoPluginSettings {
  dateFormat: string;
  dateTagFormat: string;
  openFilesInNewLeaf: boolean;
  /**
     * RegExp pattern or array of RegExp patterns that will classify a todo as a 'someday'
     */
  somedayPatterns: string | string[];
  /**
   * RegExp pattern or array of RegExp patterns that prevent the todo from being indexed
   */
  hidePatterns: string | string[];
  /**
   * Only files matching these pattern(s) will be indexed
   */
  includeFolderPatterns: string | string[];
}

export const DEFAULT_SETTINGS: TodoPluginSettings = {
  dateFormat: 'yyyy-MM-dd',
  openFilesInNewLeaf: true,
  dateTagFormat: '#%date%',
  somedayPatterns: '#someday',
  hidePatterns: ['#never', '#surpress'],
  includeFolderPatterns: '.*'
};
