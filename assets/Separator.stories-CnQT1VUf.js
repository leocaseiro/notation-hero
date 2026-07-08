import{i as e}from"./preload-helper-ATQIgOUJ.js";import{t}from"./jsx-runtime-D6I6jW42.js";import{n,t as r}from"./Separator-B7o-zBia.js";var i,a,o,s,c,l;e((()=>{n(),i=t(),a={title:`UI/Separator`,component:r,parameters:{layout:`padded`,docs:{description:{component:[`Separator — a shadcn/ui port over Base UI. A thin divider that renders as a`,"full-width horizontal rule (default) or a full-height vertical rule via `orientation`.",``,'It is dumb/presentational but always semantic: Base UI renders `role="separator"` with',"`aria-orientation` (there is no Radix-style `decorative` mode). The `bg-border`",`token themes it in light and dark.`].join(`
`)}}},tags:[`autodocs`],argTypes:{orientation:{control:`inline-radio`,options:[`horizontal`,`vertical`],description:`Rule axis — the story container adapts to match.`}}},o=({orientation:e=`horizontal`})=>e===`vertical`?(0,i.jsxs)(`div`,{className:`flex h-5 items-center gap-3 text-sm`,children:[(0,i.jsx)(`span`,{children:`Songs`}),(0,i.jsx)(r,{orientation:`vertical`}),(0,i.jsx)(`span`,{children:`Lessons`}),(0,i.jsx)(r,{orientation:`vertical`}),(0,i.jsx)(`span`,{children:`Player`})]}):(0,i.jsxs)(`div`,{className:`w-64 text-sm`,children:[(0,i.jsx)(`div`,{className:`pb-2`,children:`Catalog`}),(0,i.jsx)(r,{}),(0,i.jsx)(`div`,{className:`pt-2 text-muted-foreground`,children:`Browse songs and lessons`})]}),s={args:{orientation:`horizontal`},render:e=>(0,i.jsx)(o,{orientation:e.orientation??`horizontal`})},c={args:{orientation:`vertical`},render:e=>(0,i.jsx)(o,{orientation:e.orientation??`vertical`})},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    orientation: 'horizontal'
  },
  render: args => <AdaptiveDemo orientation={args.orientation ?? 'horizontal'} />
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    orientation: 'vertical'
  },
  render: args => <AdaptiveDemo orientation={args.orientation ?? 'vertical'} />
}`,...c.parameters?.docs?.source}}},l=[`Horizontal`,`Vertical`]}))();export{s as Horizontal,c as Vertical,l as __namedExportsOrder,a as default};