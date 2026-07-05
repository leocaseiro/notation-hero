import{i as e}from"./preload-helper-BIzSwyKJ.js";import{t}from"./jsx-runtime-BpVX6yV-.js";import{a as n,i as r,n as i,t as a}from"./Tooltip-iFKpXXH_.js";var o,s,c,l,u;e((()=>{n(),o=t(),s={title:`UI/Tooltip`,component:a,parameters:{layout:`centered`,docs:{description:{component:[`Tooltip — a faithful shadcn/ui port over Radix. Compose it as`,"`Tooltip > TooltipTrigger + TooltipContent`. The `Tooltip` wraps its own","`TooltipProvider`, so a single tooltip works standalone.",``,`It is dumb/presentational: normally it opens on hover/focus of the trigger. These`,"stories force `open` so the content is always visible for documentation and visual",`regression. The content is portalled, positioned by Radix, and themed via the`,"`bg-primary` / `text-primary-foreground` tokens in light and dark."].join(`
`)}}},tags:[`autodocs`]},c={render:()=>(0,o.jsxs)(a,{open:!0,children:[(0,o.jsx)(r,{className:`rounded-md border border-border bg-background px-3 py-1.5 text-sm`,children:`Hover me`}),(0,o.jsx)(i,{children:`Add to practice`})]})},l={render:()=>(0,o.jsxs)(a,{open:!0,children:[(0,o.jsx)(r,{className:`rounded-md border border-border bg-background px-3 py-1.5 text-sm`,children:`Details`}),(0,o.jsx)(i,{className:`max-w-56`,children:`Play the full song at your best tempo, then drill the tricky bars in Practice mode.`})]})},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <Tooltip open>
      <TooltipTrigger className="rounded-md border border-border bg-background px-3 py-1.5 text-sm">
        Hover me
      </TooltipTrigger>
      <TooltipContent>Add to practice</TooltipContent>
    </Tooltip>
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <Tooltip open>
      <TooltipTrigger className="rounded-md border border-border bg-background px-3 py-1.5 text-sm">
        Details
      </TooltipTrigger>
      <TooltipContent className="max-w-56">
        Play the full song at your best tempo, then drill the tricky bars in Practice mode.
      </TooltipContent>
    </Tooltip>
}`,...l.parameters?.docs?.source}}},u=[`Default`,`LongText`]}))();export{c as Default,l as LongText,u as __namedExportsOrder,s as default};