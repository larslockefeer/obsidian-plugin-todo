export enum Icon {
  Inbox,
  Reveal,
  Scheduled,
  Someday,
  Today,
}

export const RenderIcon = (icon: Icon, title = '', description = ''): HTMLElement => {
  const svg = svgForIcon(icon)(title, description);
  return parser.parseFromString(svg, 'text/xml').documentElement;
};

const parser = new DOMParser();

const svgForIcon = (icon: Icon): ((arg0: string, arg1: string) => string) => {
  switch (icon) {
    case Icon.Inbox:
      return inboxIcon;
    case Icon.Reveal:
      return revealIcon;
    case Icon.Scheduled:
      return scheduledIcon;
    case Icon.Someday:
      return somedayIcon;
    case Icon.Today:
      return todayIcon;
  }
};

const inboxIcon = (title: string, description: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" aria-label="${title + description}">
  <title>${title}</title>
  <description>${description}</description>
  <path d="M0 0h24v24H0V0z" fill="none"/>
  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.56c.69 1.19 1.97 2 3.45 2s2.75-.81 3.45-2H19v3zm0-5h-4.99c0 1.1-.9 2-2 2s-2-.9-2-2H5V5h14v9z"/>
</svg>
`;

const revealIcon = (title: string, description: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" role="img" aria-label="${
  title + description
}">
  <title>${title}</title>
  <description>${description}</description>
  <rect fill="none" height="24" width="24"/><path d="M9,5v2h6.59L4,18.59L5.41,20L17,8.41V15h2V5H9z"/>
</svg>
`;

const scheduledIcon = (title: string, description: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" aria-label="${title + description}">
  <title>${title}</title>
  <description>${description}</description>
  <path d="M0 0h24v24H0V0z" fill="none"/>
  <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V10h16v11zm0-13H4V5h16v3z"/>
</svg>
`;

const somedayIcon = (title: string, description: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" aria-label="${
  title + description
}">
  <title>${title}</title>
  <description>${description}</description>
  <g><rect fill="none" height="24" width="24"/></g>
  <g><g><path d="M20,2H4C3,2,2,2.9,2,4v3.01C2,7.73,2.43,8.35,3,8.7V20c0,1.1,1.1,2,2,2h14c0.9,0,2-0.9,2-2V8.7c0.57-0.35,1-0.97,1-1.69V4 C22,2.9,21,2,20,2z M19,20H5V9h14V20z M20,7H4V4h16V7z"/><rect height="2" width="6" x="9" y="12"/></g></g>
</svg>
`;

const todayIcon = (title: string, description: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" aria-label="${title + description}">
  <title>${title}</title>
  <description>${description}</description>
  <path d="M0 0h24v24H0V0z" fill="none"/>
  <path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/>
</svg>
`;
