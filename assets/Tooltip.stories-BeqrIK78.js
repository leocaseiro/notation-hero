import{i as e}from"./preload-helper-ATQIgOUJ.js";import{t}from"./jsx-runtime-D6I6jW42.js";import{w as n}from"./iframe-DC3M9tIq.js";import{r,t as i}from"./Button-CfkqtdUE.js";import{i as a,n as o,r as s,t as c}from"./Tooltip-B6aaQiSJ.js";var l,u,d,f,p,m,h,g;e((()=>{l=n(),a(),r(),u=t(),{useArgs:d}=__STORYBOOK_MODULE_PREVIEW_API__,f={title:`UI/Tooltip`,component:c,parameters:{layout:`centered`,docs:{description:{component:[`Tooltip — a shadcn/ui port over Base UI. Compose it as`,"`Tooltip > TooltipTrigger + TooltipContent`. The `Tooltip` wraps its own","`TooltipProvider`, so a single tooltip works standalone.",``,`It is dumb/presentational: it opens on hover/focus of the trigger. These stories are`,"interactive — hover or focus the trigger to open it, or flip the **`open`** control to",`pin it open (that same control is what the visual-regression suite drives). The trigger`,"is whatever you pass to `render` — pick a Button variant with the **`triggerVariant`**",`control here. The content is portalled, positioned by Base UI, and themed via the`,"`bg-primary` / `text-primary-foreground` tokens in light and dark."].join(`
`)}}},tags:[`autodocs`],args:{open:!1,delay:0,closeDelay:0,triggerVariant:`secondary`},argTypes:{open:{control:`boolean`,description:`Controlled open state. Flip it here, or hover/focus the trigger.`},delay:{control:`number`,description:`Milliseconds to wait before opening on hover.`},closeDelay:{control:`number`,description:`Milliseconds to wait before closing after the pointer leaves.`},triggerVariant:{control:`select`,options:[`default`,`outline`,`secondary`,`ghost`,`destructive`,`link`],description:`Button variant rendered as the trigger (any render-able element works).`}}},p=(e,t)=>()=>{let n=(0,l.c)(12),[r,a]=d(),{open:o,delay:f,closeDelay:p,triggerVariant:m}=r,h;n[0]===a?h=n[1]:(h=e=>a({open:e}),n[0]=a,n[1]=h);let g;n[2]===m?g=n[3]:(g=(0,u.jsx)(i,{variant:m,children:e}),n[2]=m,n[3]=g);let _;n[4]!==p||n[5]!==f||n[6]!==g?(_=(0,u.jsx)(s,{delay:f,closeDelay:p,render:g}),n[4]=p,n[5]=f,n[6]=g,n[7]=_):_=n[7];let v;return n[8]!==o||n[9]!==h||n[10]!==_?(v=(0,u.jsxs)(c,{open:o,onOpenChange:h,children:[_,t]}),n[8]=o,n[9]=h,n[10]=_,n[11]=v):v=n[11],v},m={render:p(`Hover me`,(0,u.jsx)(o,{children:`Add to practice`})),parameters:{docs:{source:{code:`<Tooltip>
  <TooltipTrigger render={<Button variant="secondary">Hover me</Button>} />
  <TooltipContent>Add to practice</TooltipContent>
</Tooltip>`}}}},h={render:p(`Details`,(0,u.jsx)(o,{className:`max-w-56`,children:`Play the full song at your best tempo, then drill the tricky bars in Practice mode.`})),parameters:{docs:{source:{code:`<Tooltip>
  <TooltipTrigger render={<Button variant="secondary">Details</Button>} />
  <TooltipContent className="max-w-56">
    Play the full song at your best tempo, then drill the tricky bars in Practice mode.
  </TooltipContent>
</Tooltip>`}}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: controlledRender('Hover me', <TooltipContent>Add to practice</TooltipContent>),
  parameters: {
    // The render factory makes autodocs' inferred snippet useless — show real usage instead.
    docs: {
      source: {
        code: \`<Tooltip>
  <TooltipTrigger render={<Button variant="secondary">Hover me</Button>} />
  <TooltipContent>Add to practice</TooltipContent>
</Tooltip>\`
      }
    }
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: controlledRender('Details', <TooltipContent className="max-w-56">
      Play the full song at your best tempo, then drill the tricky bars in Practice mode.
    </TooltipContent>),
  parameters: {
    docs: {
      source: {
        code: \`<Tooltip>
  <TooltipTrigger render={<Button variant="secondary">Details</Button>} />
  <TooltipContent className="max-w-56">
    Play the full song at your best tempo, then drill the tricky bars in Practice mode.
  </TooltipContent>
</Tooltip>\`
      }
    }
  }
}`,...h.parameters?.docs?.source}}},g=[`Default`,`LongText`]}))();export{m as Default,h as LongText,g as __namedExportsOrder,f as default};