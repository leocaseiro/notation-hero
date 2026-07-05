import{i as e}from"./preload-helper-BIzSwyKJ.js";import{t}from"./jsx-runtime-BpVX6yV-.js";import{n,t as r}from"./Separator-LnHglqMr.js";var i,a,o,s,c;e((()=>{n(),i=t(),a={title:`UI/Separator`,component:r,parameters:{layout:`padded`,docs:{description:{component:[`Separator — a faithful shadcn/ui port over Radix. A thin divider that renders as a`,"full-width horizontal rule (default) or a full-height vertical rule via `orientation`.",``,'It is dumb/presentational and decorative by default (`role="none"`), so screen readers','skip it; pass `decorative={false}` for a semantic `role="separator"`. The `bg-border`',`token themes it in light and dark.`].join(`
`)}}},tags:[`autodocs`]},o={render:()=>(0,i.jsxs)(`div`,{className:`w-64 text-sm`,children:[(0,i.jsx)(`div`,{className:`pb-2`,children:`Catalog`}),(0,i.jsx)(r,{}),(0,i.jsx)(`div`,{className:`pt-2 text-muted-foreground`,children:`Browse songs and lessons`})]})},s={render:()=>(0,i.jsxs)(`div`,{className:`flex h-5 items-center gap-3 text-sm`,children:[(0,i.jsx)(`span`,{children:`Songs`}),(0,i.jsx)(r,{orientation:`vertical`}),(0,i.jsx)(`span`,{children:`Lessons`}),(0,i.jsx)(r,{orientation:`vertical`}),(0,i.jsx)(`span`,{children:`Player`})]})},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-64 text-sm">
      <div className="pb-2">Catalog</div>
      <Separator />
      <div className="pt-2 text-muted-foreground">Browse songs and lessons</div>
    </div>
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex h-5 items-center gap-3 text-sm">
      <span>Songs</span>
      <Separator orientation="vertical" />
      <span>Lessons</span>
      <Separator orientation="vertical" />
      <span>Player</span>
    </div>
}`,...s.parameters?.docs?.source}}},c=[`Horizontal`,`Vertical`]}))();export{o as Horizontal,s as Vertical,c as __namedExportsOrder,a as default};