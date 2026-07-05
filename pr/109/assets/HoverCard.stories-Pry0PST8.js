import{i as e}from"./preload-helper-SX2l6aD-.js";import{t}from"./jsx-runtime-pgTrX6HN.js";import{w as n}from"./iframe-DMkBqSh9.js";import{n as r,t as i}from"./utils-CB2qYu_J.js";import{D as a,E as o,O as s,k as c,t as l}from"./dist-CphMjw-f.js";var u,d,f,p,m,h=e((()=>{u=n(),l(),r(),d=t(),f=e=>{let t=(0,u.c)(2),n;return t[0]===e?n=t[1]:(n=(0,d.jsx)(s,{"data-slot":`hover-card`,...e}),t[0]=e,t[1]=n),n},p=e=>{let t=(0,u.c)(2),n;return t[0]===e?n=t[1]:(n=(0,d.jsx)(c,{"data-slot":`hover-card-trigger`,...e}),t[0]=e,t[1]=n),n},m=({className:e,align:t=`center`,sideOffset:n=4,...r})=>(0,d.jsx)(a,{"data-slot":`hover-card-portal`,children:(0,d.jsx)(o,{"data-slot":`hover-card-content`,align:t,sideOffset:n,className:i(`bg-popover text-popover-foreground z-50 w-64 rounded-md border p-4 shadow-md outline-hidden`,e),...r})}),f.__docgenInfo={description:``,methods:[],displayName:`HoverCard`},p.__docgenInfo={description:``,methods:[],displayName:`HoverCardTrigger`},m.__docgenInfo={description:``,methods:[],displayName:`HoverCardContent`,props:{align:{defaultValue:{value:`'center'`,computed:!1},required:!1},sideOffset:{defaultValue:{value:`4`,computed:!1},required:!1}}}})),g,_,v,y;e((()=>{h(),g=t(),_={title:`UI/HoverCard`,component:f,parameters:{layout:`centered`,docs:{description:{component:[`HoverCard — a faithful shadcn/ui port over Radix. Compose it as`,"`HoverCard > HoverCardTrigger + HoverCardContent`. It shows a rich preview when the",`user hovers or focuses the trigger.`,``,`It is dumb/presentational — a container decides what preview to render; the card holds`,"only its own open state. This story forces `open` so the content is always visible for",`docs and visual regression. The content is portalled, positioned by Radix, and themed`,"via the `bg-popover` / `text-popover-foreground` tokens. shadcn's enter/exit animations",`are omitted (the repo has no animation plugin).`].join(`
`)}}},tags:[`autodocs`]},v={render:()=>(0,g.jsxs)(f,{open:!0,children:[(0,g.jsx)(p,{className:`rounded-md border border-border bg-background px-3 py-1.5 text-sm`,children:`Yellow`}),(0,g.jsxs)(m,{align:`start`,children:[(0,g.jsx)(`p`,{className:`text-sm font-medium`,children:`Yellow`}),(0,g.jsx)(`p`,{className:`text-muted-foreground mt-1 text-xs`,children:`Coldplay · Beginner 2`}),(0,g.jsxs)(`dl`,{className:`mt-3 flex gap-4 text-xs`,children:[(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`dt`,{className:`text-muted-foreground`,children:`Tempo`}),(0,g.jsx)(`dd`,{className:`font-medium`,children:`89 BPM`})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`dt`,{className:`text-muted-foreground`,children:`Sections`}),(0,g.jsx)(`dd`,{className:`font-medium`,children:`4`})]})]})]})]})},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <HoverCard open>
      <HoverCardTrigger className="rounded-md border border-border bg-background px-3 py-1.5 text-sm">
        Yellow
      </HoverCardTrigger>
      <HoverCardContent align="start">
        <p className="text-sm font-medium">Yellow</p>
        <p className="text-muted-foreground mt-1 text-xs">Coldplay · Beginner 2</p>
        <dl className="mt-3 flex gap-4 text-xs">
          <div>
            <dt className="text-muted-foreground">Tempo</dt>
            <dd className="font-medium">89 BPM</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sections</dt>
            <dd className="font-medium">4</dd>
          </div>
        </dl>
      </HoverCardContent>
    </HoverCard>
}`,...v.parameters?.docs?.source}}},y=[`Open`]}))();export{v as Open,y as __namedExportsOrder,_ as default};