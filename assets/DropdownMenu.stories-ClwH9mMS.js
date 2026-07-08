import{i as e}from"./preload-helper-ATQIgOUJ.js";import{t}from"./jsx-runtime-D6I6jW42.js";import{w as n}from"./iframe-DN85zJuU.js";import{r,t as i}from"./Button-YVVg14eA.js";import{a,c as o,d as s,f as c,i as l,l as u,m as d,n as f,o as p,p as m,r as h,s as g,t as _,u as v}from"./DropdownMenu-BX209LLn.js";var y,b,x,S,C,w,T,E,D;e((()=>{y=n(),d(),r(),b=t(),{useArgs:x}=__STORYBOOK_MODULE_PREVIEW_API__,S={title:`UI/DropdownMenu`,component:_,parameters:{layout:`centered`,docs:{description:{component:[`DropdownMenu — a shadcn/ui port over Base UI (migrated from Radix). Compose it from the`,"parts: `DropdownMenu > DropdownMenuTrigger + DropdownMenuContent`, with `DropdownMenuItem`,","`DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`/`RadioItem`, `DropdownMenuLabel`,","`DropdownMenuSeparator`, `DropdownMenuShortcut`, and `DropdownMenuSub` for submenus.",``,`It is dumb/presentational — a container decides the items and wires the callbacks; the`,`menu holds only its own open/checked state. These stories are interactive: click the`,"trigger to open the menu, or flip the **`open`** control to pin it open (that same control","is what the visual-regression suite drives). `modal={false}` keeps the isolated Storybook",`page from being locked around the portalled panel. The content is portalled and themed`,"via the `bg-popover` / `focus:bg-accent` tokens. shadcn's enter/exit animations are",`omitted (the repo has no animation plugin).`].join(`
`)}}},tags:[`autodocs`],args:{open:!1,modal:!1,loopFocus:!0,orientation:`vertical`,triggerVariant:`secondary`},argTypes:{open:{control:`boolean`,description:`Controlled open state. Flip it here, or click the trigger.`},modal:{control:`boolean`,description:`When true, interaction outside the open menu is disabled and page scroll is locked.`},loopFocus:{control:`boolean`,description:`Whether arrow-key focus loops back to the first item after the last.`},orientation:{control:`inline-radio`,options:[`vertical`,`horizontal`],description:`Roving-focus axis: vertical uses up/down arrows, horizontal left/right.`},triggerVariant:{control:`select`,options:[`default`,`outline`,`secondary`,`ghost`,`destructive`,`link`],description:`Button variant rendered as the trigger (any render-able element works).`}}},C=(e,t)=>()=>{let n=(0,y.c)(11),[r,a]=x(),{open:o,modal:s,loopFocus:c,orientation:l,triggerVariant:u}=r,d;n[0]===a?d=n[1]:(d=e=>a({open:e}),n[0]=a,n[1]=d);let f;n[2]===u?f=n[3]:(f=(0,b.jsx)(m,{render:(0,b.jsx)(i,{variant:u,children:e})}),n[2]=u,n[3]=f);let p;return n[4]!==c||n[5]!==s||n[6]!==o||n[7]!==l||n[8]!==d||n[9]!==f?(p=(0,b.jsxs)(_,{open:o,onOpenChange:d,modal:s,loopFocus:c,orientation:l,children:[f,t]}),n[4]=c,n[5]=s,n[6]=o,n[7]=l,n[8]=d,n[9]=f,n[10]=p):p=n[10],p},w={render:C(`Actions`,(0,b.jsx)(h,{align:`start`,children:(0,b.jsxs)(l,{children:[(0,b.jsx)(p,{children:`Yellow`}),(0,b.jsx)(u,{}),(0,b.jsx)(a,{children:`Play`}),(0,b.jsx)(a,{children:`Add to practice`}),(0,b.jsxs)(a,{children:[`Open score`,(0,b.jsx)(v,{children:`⌘O`})]})]})})),parameters:{docs:{source:{code:`<DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="secondary">Actions</Button>} />
  <DropdownMenuContent align="start">
    <DropdownMenuGroup>
      <DropdownMenuLabel>Yellow</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>Play</DropdownMenuItem>
      <DropdownMenuItem>Add to practice</DropdownMenuItem>
      <DropdownMenuItem>
        Open score
        <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>`}}}},T={render:C(`View`,(0,b.jsxs)(h,{align:`start`,children:[(0,b.jsx)(f,{checked:!0,children:`Show completed`}),(0,b.jsx)(u,{}),(0,b.jsxs)(g,{value:`title`,children:[(0,b.jsx)(p,{children:`Sort by`}),(0,b.jsx)(o,{value:`title`,children:`Title`}),(0,b.jsx)(o,{value:`level`,children:`Level`})]})]}))},E={render:C(`Actions`,(0,b.jsxs)(h,{align:`start`,children:[(0,b.jsx)(a,{children:`Play`}),(0,b.jsx)(s,{children:(0,b.jsx)(c,{children:`Add to lesson`})}),(0,b.jsx)(u,{}),(0,b.jsx)(a,{variant:`destructive`,children:`Remove`})]}))},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: controlledRender('Actions', <DropdownMenuContent align="start">
      <DropdownMenuGroup>
        <DropdownMenuLabel>Yellow</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Play</DropdownMenuItem>
        <DropdownMenuItem>Add to practice</DropdownMenuItem>
        <DropdownMenuItem>
          Open score
          <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>),
  parameters: {
    // The render factory makes autodocs' inferred snippet useless — show real usage instead.
    docs: {
      source: {
        code: \`<DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="secondary">Actions</Button>} />
  <DropdownMenuContent align="start">
    <DropdownMenuGroup>
      <DropdownMenuLabel>Yellow</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>Play</DropdownMenuItem>
      <DropdownMenuItem>Add to practice</DropdownMenuItem>
      <DropdownMenuItem>
        Open score
        <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>\`
      }
    }
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: controlledRender('View', <DropdownMenuContent align="start">
      <DropdownMenuCheckboxItem checked>Show completed</DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      {/* The "Sort by" label sits INSIDE the RadioGroup: Base UI's GroupLabel needs a
          Group/RadioGroup context and labels the group it lives in. */}
      <DropdownMenuRadioGroup value="title">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="level">Level</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>)
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: controlledRender('Actions', <DropdownMenuContent align="start">
      <DropdownMenuItem>Play</DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Add to lesson</DropdownMenuSubTrigger>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>
    </DropdownMenuContent>)
}`,...E.parameters?.docs?.source}}},D=[`Open`,`WithCheckboxRadio`,`WithSubmenu`]}))();export{w as Open,T as WithCheckboxRadio,E as WithSubmenu,D as __namedExportsOrder,S as default};