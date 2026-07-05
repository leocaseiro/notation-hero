import{i as e}from"./preload-helper-BIzSwyKJ.js";import{t}from"./jsx-runtime-BpVX6yV-.js";import{a as n,c as r,i,l as a,n as o,o as s,r as c,s as l,t as u}from"./Sheet-DFxwFLGm.js";var d,f,p,m;e((()=>{a(),d=t(),f={title:`UI/Sheet`,component:u,parameters:{layout:`fullscreen`,docs:{description:{component:[`Sheet — a faithful shadcn/ui port over Radix Dialog. An off-canvas panel that slides in`,'from an edge (`side="right"` by default). Compose it from the parts: `Sheet >',"SheetTrigger + SheetContent`, with `SheetHeader`/`SheetFooter`, `SheetTitle`,","`SheetDescription`, and `SheetClose`.",``,"It is dumb/presentational — a container owns the open state. This story forces it `open`","with `modal={false}` (so the isolated Storybook page is not `aria-hidden` around the",`portalled panel) for docs and visual regression; the X close uses a Material Symbols`,"`close` glyph. A Radix Dialog needs a title for a11y, so `SheetTitle` is always present.",`shadcn's enter/exit animations are omitted (the repo has no animation plugin).`].join(`
`)}}},tags:[`autodocs`]},p={render:()=>(0,d.jsxs)(u,{open:!0,modal:!1,children:[(0,d.jsx)(r,{className:`border-input m-4 inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium`,children:`Open sections`}),(0,d.jsxs)(c,{side:`right`,children:[(0,d.jsxs)(s,{children:[(0,d.jsx)(l,{children:`Sections`}),(0,d.jsx)(i,{children:`Jump to a section of this song.`})]}),(0,d.jsxs)(`nav`,{className:`flex flex-col gap-1 px-4 text-sm`,children:[(0,d.jsx)(`a`,{href:`#intro`,className:`hover:text-primary rounded-md py-1.5 transition-colors`,children:`Intro`}),(0,d.jsx)(`a`,{href:`#verse-1`,className:`hover:text-primary rounded-md py-1.5 transition-colors`,children:`Verse 1`}),(0,d.jsx)(`a`,{href:`#chorus`,className:`hover:text-primary rounded-md py-1.5 transition-colors`,children:`Chorus`})]}),(0,d.jsx)(n,{children:(0,d.jsx)(o,{className:`border-input hover:bg-muted inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium`,children:`Close`})})]})]})},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <Sheet open modal={false}>
      {/* The trigger keeps #storybook-root non-empty (the panel itself is portalled); with the
          Sheet controlled-open it's inert, but it anchors the isolated story. */}
      <SheetTrigger className="border-input m-4 inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium">
        Open sections
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Sections</SheetTitle>
          <SheetDescription>Jump to a section of this song.</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 text-sm">
          <a href="#intro" className="hover:text-primary rounded-md py-1.5 transition-colors">
            Intro
          </a>
          <a href="#verse-1" className="hover:text-primary rounded-md py-1.5 transition-colors">
            Verse 1
          </a>
          <a href="#chorus" className="hover:text-primary rounded-md py-1.5 transition-colors">
            Chorus
          </a>
        </nav>
        <SheetFooter>
          <SheetClose className="border-input hover:bg-muted inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium">
            Close
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
}`,...p.parameters?.docs?.source}}},m=[`Open`]}))();export{p as Open,m as __namedExportsOrder,f as default};