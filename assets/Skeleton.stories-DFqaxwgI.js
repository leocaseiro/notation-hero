import{i as e}from"./preload-helper-ATQIgOUJ.js";import{t}from"./jsx-runtime-D6I6jW42.js";import{i as n,n as r,r as i,t as a}from"./Skeleton-CGPYWUhF.js";var o,s,c,l,u,d;e((()=>{n(),o=t(),s={title:`UI/Skeleton`,component:a,parameters:{layout:`padded`,docs:{description:{component:["Pulsing loading placeholder — a faithful shadcn/ui port. The base `Skeleton` is a","`div` sized entirely by `className` (`h-*`, `w-*`, `rounded-*`); the pulse cycles","between the `--skeleton` and `--skeleton-pulse` tokens in light and dark automatically.",``,"`SkeletonTable` and `SkeletonForm` are dumb/presentational presets composed from the","base block — pass counts (`rows`/`columns`, `fields`) and drop them into any table or",`form view while data loads. They hold no state and fetch nothing, so a container decides`,`when to swap them for real content.`,``,"Tune the pulse speed per instance with the **`duration`** prop (one full cycle in",`milliseconds; defaults to 2000).`].join(`
`)}}},tags:[`autodocs`],argTypes:{duration:{control:`number`,description:`One pulse cycle in milliseconds. Defaults to 2000.`}}},c={args:{className:`h-6 w-64`,duration:2e3}},l={render:()=>(0,o.jsx)(`div`,{className:`w-[32rem] max-w-full`,children:(0,o.jsx)(i,{rows:5})})},u={render:()=>(0,o.jsx)(`div`,{className:`w-80 max-w-full`,children:(0,o.jsx)(r,{fields:3})})},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    className: 'h-6 w-64',
    duration: 2000
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-[32rem] max-w-full">
      <SkeletonTable rows={5} />
    </div>
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-80 max-w-full">
      <SkeletonForm fields={3} />
    </div>
}`,...u.parameters?.docs?.source}}},d=[`Default`,`Table`,`Form`]}))();export{c as Default,u as Form,l as Table,d as __namedExportsOrder,s as default};