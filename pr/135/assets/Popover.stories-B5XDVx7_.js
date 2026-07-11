import{i as e}from"./preload-helper-D0cd7zMF.js";import{t}from"./jsx-runtime-DRPbBoLi.js";import{n,r}from"./Button-B1911US6.js";import{i,n as a,r as o,t as s}from"./Popover-C4BIdn3q.js";var c,l,u,d,f,p,m,h;e((()=>{i(),r(),c=t(),{fn:l}=__STORYBOOK_MODULE_TEST__,u={title:`UI/Popover`,component:s,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,c.jsx)(`div`,{className:`relative min-h-56 w-72`,children:(0,c.jsx)(e,{})})],args:{modal:!1,side:`bottom`,align:`start`,sideOffset:6,onOpenChange:l()},argTypes:{defaultOpen:{control:`boolean`},modal:{control:`boolean`},side:{control:`radio`,options:[`top`,`right`,`bottom`,`left`]},align:{control:`radio`,options:[`start`,`center`,`end`]},sideOffset:{control:{type:`number`,min:0,max:24,step:1}}}},d=n({variant:`outline`}),f=e=>(0,c.jsxs)(s,{defaultOpen:e.defaultOpen,modal:e.modal,onOpenChange:e.onOpenChange,children:[(0,c.jsx)(o,{className:d,children:`Open popover`}),(0,c.jsxs)(a,{align:e.align,side:e.side,sideOffset:e.sideOffset,children:[(0,c.jsx)(`p`,{className:`text-sm font-medium`,children:`Popover title`}),(0,c.jsx)(`p`,{className:`text-sm text-muted-foreground`,children:`Floating panel content, anchored to the trigger.`})]})]}),p={args:{defaultOpen:!1},render:f},m={args:{defaultOpen:!0},render:f},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    defaultOpen: false
  },
  render: renderPopover
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    defaultOpen: true
  },
  render: renderPopover
}`,...m.parameters?.docs?.source}}},h=[`Closed`,`Open`]}))();export{p as Closed,m as Open,h as __namedExportsOrder,u as default};