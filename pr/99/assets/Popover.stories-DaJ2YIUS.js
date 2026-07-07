import{i as e}from"./preload-helper-UTqDGU-u.js";import{t}from"./jsx-runtime-DALSLDfO.js";import{i as n,n as r,r as i,t as a}from"./Popover-DK0diBs4.js";var o,s,c,l,u,d,f,p;e((()=>{n(),o=t(),{fn:s}=__STORYBOOK_MODULE_TEST__,c={title:`UI/Popover`,component:a,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,o.jsx)(`div`,{className:`relative min-h-56 w-72`,children:(0,o.jsx)(e,{})})],args:{modal:!1,side:`bottom`,align:`start`,sideOffset:6,onOpenChange:s()},argTypes:{defaultOpen:{control:`boolean`},modal:{control:`boolean`},side:{control:`radio`,options:[`top`,`right`,`bottom`,`left`]},align:{control:`radio`,options:[`start`,`center`,`end`]},sideOffset:{control:{type:`number`,min:0,max:24,step:1}}}},l=`inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm shadow-xs hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`,u=e=>(0,o.jsxs)(a,{defaultOpen:e.defaultOpen,modal:e.modal,onOpenChange:e.onOpenChange,children:[(0,o.jsx)(i,{className:l,children:`Open popover`}),(0,o.jsxs)(r,{align:e.align,side:e.side,sideOffset:e.sideOffset,children:[(0,o.jsx)(`p`,{className:`text-sm font-medium`,children:`Popover title`}),(0,o.jsx)(`p`,{className:`text-sm text-muted-foreground`,children:`Floating panel content, anchored to the trigger.`})]})]}),d={args:{defaultOpen:!1},render:u},f={args:{defaultOpen:!0},render:u},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    defaultOpen: false
  },
  render: renderPopover
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    defaultOpen: true
  },
  render: renderPopover
}`,...f.parameters?.docs?.source}}},p=[`Closed`,`Open`]}))();export{d as Closed,f as Open,p as __namedExportsOrder,c as default};