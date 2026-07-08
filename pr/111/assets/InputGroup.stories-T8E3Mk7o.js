import{i as e}from"./preload-helper-D_j0eZSB.js";import{t}from"./jsx-runtime-BSqP04oH.js";import{w as n}from"./iframe-B6moNCu_.js";import{n as r,t as i}from"./utils-DiL01Lu5.js";import{n as a,t as o}from"./dist-DNuoAP34.js";var s,c,l,u,d,f,p,m,h=e((()=>{s=n(),a(),r(),c=t(),l=e=>{let t=(0,s.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let a;t[3]===n?a=t[4]:(a=i(`group/input-group relative flex w-full items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30`,`has-[[data-slot=input-group-input]:focus-visible]:border-ring has-[[data-slot=input-group-input]:focus-visible]:ring-[3px] has-[[data-slot=input-group-input]:focus-visible]:ring-ring/50`,`has-[[data-slot=input-group-input][aria-invalid=true]]:border-destructive has-[[data-slot=input-group-input][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot=input-group-input][aria-invalid=true]]:ring-destructive/40`,n),t[3]=n,t[4]=a);let o;return t[5]!==r||t[6]!==a?(o=(0,c.jsx)(`div`,{"data-slot":`input-group`,role:`group`,className:a,...r}),t[5]=r,t[6]=a,t[7]=o):o=t[7],o},u=o(`pointer-events-none flex items-center gap-2 text-muted-foreground select-none [&>svg:not([class*='size-'])]:size-4`,{variants:{align:{"inline-start":`order-first pl-3`,"inline-end":`order-last pr-3`}},defaultVariants:{align:`inline-start`}}),d=({className:e,align:t=`inline-start`,...n})=>(0,c.jsx)(`div`,{"data-slot":`input-group-addon`,"data-align":t,className:i(u({align:t}),e),...n}),f=e=>{let t=(0,s.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let a;t[3]===n?a=t[4]:(a=i(`flex-1 border-0 bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50`,n),t[3]=n,t[4]=a);let o;return t[5]!==r||t[6]!==a?(o=(0,c.jsx)(`input`,{"data-slot":`input-group-input`,className:a,...r}),t[5]=r,t[6]=a,t[7]=o):o=t[7],o},p=e=>{let t=(0,s.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let a;t[3]===n?a=t[4]:(a=i(`flex items-center gap-2 text-sm text-muted-foreground [&>svg:not([class*='size-'])]:size-4`,n),t[3]=n,t[4]=a);let o;return t[5]!==r||t[6]!==a?(o=(0,c.jsx)(`span`,{"data-slot":`input-group-text`,className:a,...r}),t[5]=r,t[6]=a,t[7]=o):o=t[7],o},m=({className:e,type:t=`button`,...n})=>(0,c.jsx)(`button`,{type:t,"data-slot":`input-group-button`,className:i(`pointer-events-auto inline-flex h-6 items-center justify-center gap-1 rounded-sm border border-transparent px-2 text-sm font-medium whitespace-nowrap outline-none transition-all hover:bg-muted hover:text-foreground active:translate-y-px focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&>svg:not([class*='size-'])]:size-3.5`,e),...n}),l.__docgenInfo={description:"Composable text field that wraps an input with prefix/suffix addons — an icon,\na unit label, or a trailing action button — inside one bordered container.\nCompose it from `InputGroupInput` (the field) plus `InputGroupAddon` slots that\nhold `InputGroupText`, a Material Symbols glyph, or an `InputGroupButton`. The\ncontainer owns the border, shadow, and focus ring: it lights the ring when the\ninner input is focus-visible (`has-[input:focus-visible]`) and turns the border\ndestructive when the input is `aria-invalid`, so the group reads as one control.\nSelf-contained by design — `InputGroupInput` is its own borderless `<input>` and\n`InputGroupButton` its own ghost `<button>`, so the group needs no sibling UI\ncomponents.",methods:[],displayName:`InputGroup`},d.__docgenInfo={description:``,methods:[],displayName:`InputGroupAddon`,props:{align:{defaultValue:{value:`'inline-start'`,computed:!1},required:!1}}},f.__docgenInfo={description:``,methods:[],displayName:`InputGroupInput`},p.__docgenInfo={description:``,methods:[],displayName:`InputGroupText`},m.__docgenInfo={description:``,methods:[],displayName:`InputGroupButton`,props:{type:{defaultValue:{value:`'button'`,computed:!1},required:!1}}}})),g,_,v,y,b,x,S,C,w,T,E;e((()=>{h(),g=t(),{fn:_}=__STORYBOOK_MODULE_TEST__,v={title:`UI/InputGroup`,component:l,parameters:{layout:`centered`},tags:[`autodocs`]},y=_(),b=_(),x={args:{className:`w-72`},argTypes:{className:{control:`text`}},render:e=>(0,g.jsxs)(l,{...e,children:[(0,g.jsx)(d,{children:(0,g.jsx)(p,{children:`https://`})}),(0,g.jsx)(f,{"aria-label":`Website URL`,placeholder:`example.com`,onChange:b})]})},S={render:()=>(0,g.jsxs)(l,{className:`w-72`,children:[(0,g.jsx)(f,{"aria-label":`Search catalog`,placeholder:`Search…`}),(0,g.jsx)(d,{align:`inline-end`,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,children:`search`})})]})},C={render:()=>(0,g.jsxs)(l,{className:`w-72`,children:[(0,g.jsx)(f,{"aria-label":`Password`,type:`password`,placeholder:`Password`}),(0,g.jsx)(d,{align:`inline-end`,children:(0,g.jsx)(m,{"aria-label":`Show password`,onClick:y,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,children:`visibility`})})})]})},w={render:()=>(0,g.jsxs)(l,{className:`w-72`,children:[(0,g.jsx)(d,{children:(0,g.jsx)(p,{children:`@`})}),(0,g.jsx)(f,{"aria-label":`Username`,"aria-invalid":!0,defaultValue:`bad user`})]})},T={render:()=>(0,g.jsxs)(l,{className:`w-72`,children:[(0,g.jsx)(f,{"aria-label":`Password`,type:`password`,placeholder:`Password`,disabled:!0}),(0,g.jsx)(d,{align:`inline-end`,children:(0,g.jsx)(m,{"aria-label":`Show password`,disabled:!0,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,children:`visibility`})})})]})},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    className: 'w-72'
  },
  argTypes: {
    className: {
      control: 'text'
    }
  },
  render: args => <InputGroup {...args}>
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-label="Website URL" placeholder="example.com" onChange={handleChange} />
    </InputGroup>
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => <InputGroup className="w-72">
      <InputGroupInput aria-label="Search catalog" placeholder="Search…" />
      <InputGroupAddon align="inline-end">
        <span className="material-symbols-outlined" aria-hidden="true">
          search
        </span>
      </InputGroupAddon>
    </InputGroup>
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => <InputGroup className="w-72">
      <InputGroupInput aria-label="Password" type="password" placeholder="Password" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton aria-label="Show password" onClick={handleToggleVisibility}>
          <span className="material-symbols-outlined" aria-hidden="true">
            visibility
          </span>
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => <InputGroup className="w-72">
      <InputGroupAddon>
        <InputGroupText>@</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-label="Username" aria-invalid defaultValue="bad user" />
    </InputGroup>
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: () => <InputGroup className="w-72">
      <InputGroupInput aria-label="Password" type="password" placeholder="Password" disabled />
      <InputGroupAddon align="inline-end">
        <InputGroupButton aria-label="Show password" disabled>
          <span className="material-symbols-outlined" aria-hidden="true">
            visibility
          </span>
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
}`,...T.parameters?.docs?.source}}},E=[`WithPrefixText`,`WithSuffixIcon`,`WithButton`,`Invalid`,`Disabled`]}))();export{T as Disabled,w as Invalid,C as WithButton,x as WithPrefixText,S as WithSuffixIcon,E as __namedExportsOrder,v as default};