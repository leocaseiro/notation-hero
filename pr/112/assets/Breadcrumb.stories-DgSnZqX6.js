import{i as e}from"./preload-helper-BIzSwyKJ.js";import{t}from"./jsx-runtime-BpVX6yV-.js";import{w as n}from"./iframe-YfqLOy2g.js";import{n as r,t as i}from"./utils-DyCBf-rq.js";import{t as a,ut as o}from"./dist-CfjvN9ST.js";var s,c,l,u,d,f,p,m,h,g=e((()=>{s=n(),a(),r(),c=t(),l=e=>{let t=(0,s.c)(2),n;return t[0]===e?n=t[1]:(n=(0,c.jsx)(`nav`,{"aria-label":`breadcrumb`,"data-slot":`breadcrumb`,...e}),t[0]=e,t[1]=n),n},u=e=>{let t=(0,s.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let a;t[3]===n?a=t[4]:(a=i(`text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5`,n),t[3]=n,t[4]=a);let o;return t[5]!==r||t[6]!==a?(o=(0,c.jsx)(`ol`,{"data-slot":`breadcrumb-list`,className:a,...r}),t[5]=r,t[6]=a,t[7]=o):o=t[7],o},d=e=>{let t=(0,s.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let a;t[3]===n?a=t[4]:(a=i(`inline-flex items-center gap-1.5`,n),t[3]=n,t[4]=a);let o;return t[5]!==r||t[6]!==a?(o=(0,c.jsx)(`li`,{"data-slot":`breadcrumb-item`,className:a,...r}),t[5]=r,t[6]=a,t[7]=o):o=t[7],o},f=e=>{let t=(0,s.c)(10),n,r,a;t[0]===e?(n=t[1],r=t[2],a=t[3]):({asChild:n,className:r,...a}=e,t[0]=e,t[1]=n,t[2]=r,t[3]=a);let l=n?o:`a`,u;t[4]===r?u=t[5]:(u=i(`transition-colors hover:text-primary dark:hover:text-brand-600`,r),t[4]=r,t[5]=u);let d;return t[6]!==l||t[7]!==a||t[8]!==u?(d=(0,c.jsx)(l,{"data-slot":`breadcrumb-link`,className:u,...a}),t[6]=l,t[7]=a,t[8]=u,t[9]=d):d=t[9],d},p=e=>{let t=(0,s.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let a;t[3]===n?a=t[4]:(a=i(`text-foreground font-normal`,n),t[3]=n,t[4]=a);let o;return t[5]!==r||t[6]!==a?(o=(0,c.jsx)(`span`,{"data-slot":`breadcrumb-page`,role:`link`,"aria-disabled":`true`,"aria-current":`page`,className:a,...r}),t[5]=r,t[6]=a,t[7]=o):o=t[7],o},m=e=>{let t=(0,s.c)(12),n,r,a;t[0]===e?(n=t[1],r=t[2],a=t[3]):({children:n,className:r,...a}=e,t[0]=e,t[1]=n,t[2]=r,t[3]=a);let o;t[4]===r?o=t[5]:(o=i(`inline-flex items-center`,r),t[4]=r,t[5]=o);let l;t[6]===n?l=t[7]:(l=n??(0,c.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,style:{fontSize:16},children:`chevron_right`}),t[6]=n,t[7]=l);let u;return t[8]!==a||t[9]!==o||t[10]!==l?(u=(0,c.jsx)(`li`,{"data-slot":`breadcrumb-separator`,role:`presentation`,"aria-hidden":`true`,className:o,...a,children:l}),t[8]=a,t[9]=o,t[10]=l,t[11]=u):u=t[11],u},h=e=>{let t=(0,s.c)(10),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let a;t[3]===n?a=t[4]:(a=i(`flex size-9 items-center justify-center`,n),t[3]=n,t[4]=a);let o,l;t[5]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,c.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,style:{fontSize:16},children:`more_horiz`}),l=(0,c.jsx)(`span`,{className:`sr-only`,children:`More`}),t[5]=o,t[6]=l):(o=t[5],l=t[6]);let u;return t[7]!==r||t[8]!==a?(u=(0,c.jsxs)(`span`,{"data-slot":`breadcrumb-ellipsis`,role:`presentation`,"aria-hidden":`true`,className:a,...r,children:[o,l]}),t[7]=r,t[8]=a,t[9]=u):u=t[9],u},l.__docgenInfo={description:``,methods:[],displayName:`Breadcrumb`},u.__docgenInfo={description:``,methods:[],displayName:`BreadcrumbList`},d.__docgenInfo={description:``,methods:[],displayName:`BreadcrumbItem`},f.__docgenInfo={description:``,methods:[],displayName:`BreadcrumbLink`,props:{asChild:{required:!1,tsType:{name:`boolean`},description:``}}},p.__docgenInfo={description:``,methods:[],displayName:`BreadcrumbPage`},m.__docgenInfo={description:``,methods:[],displayName:`BreadcrumbSeparator`},h.__docgenInfo={description:``,methods:[],displayName:`BreadcrumbEllipsis`}})),_,v,y,b,x,S;e((()=>{g(),_=t(),v={title:`UI/Breadcrumb`,component:l,parameters:{layout:`padded`,docs:{description:{component:[`Breadcrumb trail — a faithful shadcn/ui port. Compose it from the parts:`,"`Breadcrumb > BreadcrumbList > BreadcrumbItem`, with `BreadcrumbLink` for","navigable ancestors, `BreadcrumbPage` for the current (non-link) leaf, and","`BreadcrumbSeparator` between items.",``,`It is dumb/presentational — it renders whatever items you give it and holds no state.`,"Pass `asChild` to `BreadcrumbLink` to render a router `<Link>` instead of a bare `<a>`.","The separator defaults to a Material Symbols `chevron_right`; pass children to override","(e.g. a `/`). Use `BreadcrumbEllipsis` to collapse a long trail."].join(`
`)}}},tags:[`autodocs`]},y={render:()=>(0,_.jsx)(l,{children:(0,_.jsxs)(u,{children:[(0,_.jsx)(d,{children:(0,_.jsx)(f,{href:`#`,children:`Catalog`})}),(0,_.jsx)(m,{}),(0,_.jsx)(d,{children:(0,_.jsx)(f,{href:`#`,children:`Yellow`})}),(0,_.jsx)(m,{}),(0,_.jsx)(d,{children:(0,_.jsx)(p,{children:`Section 2`})})]})})},b={render:()=>(0,_.jsx)(l,{children:(0,_.jsxs)(u,{children:[(0,_.jsx)(d,{children:(0,_.jsx)(f,{href:`#`,children:`Catalog`})}),(0,_.jsx)(m,{}),(0,_.jsx)(d,{children:(0,_.jsx)(h,{})}),(0,_.jsx)(m,{}),(0,_.jsx)(d,{children:(0,_.jsx)(f,{href:`#`,children:`Yellow`})}),(0,_.jsx)(m,{}),(0,_.jsx)(d,{children:(0,_.jsx)(p,{children:`Section 2`})})]})})},x={render:()=>(0,_.jsx)(l,{children:(0,_.jsxs)(u,{children:[(0,_.jsx)(d,{children:(0,_.jsx)(f,{href:`#`,children:`Catalog`})}),(0,_.jsx)(m,{children:`/`}),(0,_.jsx)(d,{children:(0,_.jsx)(f,{href:`#`,children:`Lessons`})}),(0,_.jsx)(m,{children:`/`}),(0,_.jsx)(d,{children:(0,_.jsx)(p,{children:`Learn Yellow`})})]})})},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Catalog</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Yellow</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Section 2</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Catalog</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Yellow</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Section 2</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Catalog</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Lessons</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>Learn Yellow</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
}`,...x.parameters?.docs?.source}}},S=[`Default`,`Collapsed`,`CustomSeparator`]}))();export{b as Collapsed,x as CustomSeparator,y as Default,S as __namedExportsOrder,v as default};