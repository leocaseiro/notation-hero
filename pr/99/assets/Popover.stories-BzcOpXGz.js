import{i as e}from"./preload-helper-UTqDGU-u.js";import{t}from"./jsx-runtime-DALSLDfO.js";import{w as n}from"./iframe-B6pN_4oZ.js";import{i as r,n as i,r as a,t as o}from"./Popover-C-j8yj2F.js";var s,c,l,u,d,f,p,m;e((()=>{s=n(),r(),c=t(),l={title:`UI/Popover`,component:o,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,c.jsx)(`div`,{className:`relative min-h-56 w-72`,children:(0,c.jsx)(e,{})})]},u=`inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm shadow-xs hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`,d=()=>{let e=(0,s.c)(1),t;return e[0]===Symbol.for(`react.memo_cache_sentinel`)?(t=(0,c.jsxs)(i,{children:[(0,c.jsx)(`p`,{className:`text-sm font-medium`,children:`Popover title`}),(0,c.jsx)(`p`,{className:`text-sm text-muted-foreground`,children:`Floating panel content, anchored to the trigger.`})]}),e[0]=t):t=e[0],t},f={render:()=>(0,c.jsxs)(o,{children:[(0,c.jsx)(a,{className:u,children:`Open popover`}),(0,c.jsx)(d,{})]})},p={render:()=>(0,c.jsxs)(o,{defaultOpen:!0,children:[(0,c.jsx)(a,{className:u,children:`Open popover`}),(0,c.jsx)(d,{})]})},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <Popover>
      <PopoverTrigger className={TRIGGER_CLASS}>Open popover</PopoverTrigger>
      <Panel />
    </Popover>
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <Popover defaultOpen>
      <PopoverTrigger className={TRIGGER_CLASS}>Open popover</PopoverTrigger>
      <Panel />
    </Popover>
}`,...p.parameters?.docs?.source}}},m=[`Closed`,`Open`]}))();export{f as Closed,p as Open,m as __namedExportsOrder,l as default};