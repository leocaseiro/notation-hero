import{i as e}from"./preload-helper-UTqDGU-u.js";import{t}from"./jsx-runtime-DALSLDfO.js";import{a as n,i as r,n as i,o as a,r as o,t as s}from"./Command-sHYXLc1n.js";var c,l,u,d,f;e((()=>{a(),c=t(),l={title:`UI/Command`,component:s,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,c.jsx)(`div`,{className:`w-80`,children:(0,c.jsx)(e,{})})]},u={render:()=>(0,c.jsxs)(s,{"aria-label":`Commands`,className:`rounded-md border border-border`,children:[(0,c.jsx)(o,{"aria-label":`Search commands`,placeholder:`Type a command…`}),(0,c.jsxs)(n,{children:[(0,c.jsx)(i,{children:`No results.`}),(0,c.jsxs)(r,{onSelect:()=>{},children:[(0,c.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem]`,"aria-hidden":`true`,children:`search`}),`Search the catalog`]}),(0,c.jsxs)(r,{onSelect:()=>{},children:[(0,c.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem]`,"aria-hidden":`true`,children:`play_arrow`}),`Play a random piece`]}),(0,c.jsxs)(r,{onSelect:()=>{},children:[(0,c.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem]`,"aria-hidden":`true`,children:`school`}),`Open lessons`]})]})]})},d={render:()=>(0,c.jsxs)(s,{"aria-label":`Pieces`,className:`rounded-md border border-border`,children:[(0,c.jsx)(o,{"aria-label":`Search pieces`,placeholder:`Search pieces…`}),(0,c.jsxs)(n,{children:[(0,c.jsx)(i,{children:`No results.`}),(0,c.jsx)(r,{onSelect:()=>{},children:`Bohemian Rhapsody`}),(0,c.jsx)(r,{onSelect:()=>{},children:`Yellow`}),(0,c.jsx)(r,{onSelect:()=>{},children:`Single stroke roll`}),(0,c.jsx)(r,{onSelect:()=>{},children:`Paradiddle`})]})]})},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <Command aria-label="Commands" className="rounded-md border border-border">
      <CommandInput aria-label="Search commands" placeholder="Type a command…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandItem onSelect={() => {}}>
          <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
            search
          </span>
          Search the catalog
        </CommandItem>
        <CommandItem onSelect={() => {}}>
          <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
            play_arrow
          </span>
          Play a random piece
        </CommandItem>
        <CommandItem onSelect={() => {}}>
          <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
            school
          </span>
          Open lessons
        </CommandItem>
      </CommandList>
    </Command>
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <Command aria-label="Pieces" className="rounded-md border border-border">
      <CommandInput aria-label="Search pieces" placeholder="Search pieces…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandItem onSelect={() => {}}>Bohemian Rhapsody</CommandItem>
        <CommandItem onSelect={() => {}}>Yellow</CommandItem>
        <CommandItem onSelect={() => {}}>Single stroke roll</CommandItem>
        <CommandItem onSelect={() => {}}>Paradiddle</CommandItem>
      </CommandList>
    </Command>
}`,...d.parameters?.docs?.source}}},f=[`Default`,`Plain`]}))();export{u as Default,d as Plain,f as __namedExportsOrder,l as default};