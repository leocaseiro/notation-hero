import{i as e,s as t}from"./preload-helper-UTqDGU-u.js";import{t as n}from"./react-BiVEdM8e.js";import{t as r}from"./jsx-runtime-DALSLDfO.js";import{r as i,t as a}from"./utils-DvOUAHQN.js";function o(e,t,n,r){return e===0||e===n||Math.abs(e-t)<=r}function s(e,t,n){let r=t-1,i=[],a=-1;for(let t=0;t<=r;t+=1){if(!o(t,e,r,n))continue;let s=t-a;s===2?i.push(a+1):s>2&&i.push(`ellipsis`),i.push(t),a=t}return i}var c,l,u,d,f,p=e((()=>{i(),c=r(),l=[10,25,50,100],u=a(`inline-flex size-9 items-center justify-center rounded-md border border-border bg-background text-sm`,`shadow-xs hover:bg-muted hover:text-foreground`,`dark:border-input dark:bg-input/30 dark:hover:bg-input/50`,`focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`,`disabled:pointer-events-none disabled:opacity-50`),d=a(`inline-flex size-9 items-center justify-center rounded-md border border-transparent text-sm font-medium`,`bg-primary text-primary-foreground`,`focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`),f=({pageIndex:e,pageCount:t,onPageChange:n,siblingCount:r=1,pageSize:i,onPageSizeChange:o,pageSizeOptions:f=l,disabled:p=!1,className:m})=>{let h=Math.max(t-1,0),g=p||t<=1,_=g||e<=0,v=g||e>=h,y=s(e,Math.max(t,1),r);return(0,c.jsxs)(`nav`,{"data-slot":`pagination`,"aria-label":`Pagination`,className:a(`flex items-center gap-1.5 text-sm`,m),children:[(0,c.jsx)(`button`,{type:`button`,"data-slot":`pagination-previous`,"aria-label":`Previous page`,disabled:_,onClick:()=>n(e-1),className:u,children:(0,c.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem]`,"aria-hidden":`true`,children:`chevron_left`})}),y.map((t,r)=>t===`ellipsis`?(0,c.jsxs)(`span`,{"data-slot":`pagination-ellipsis`,role:`presentation`,className:`inline-flex size-9 items-center justify-center text-muted-foreground`,children:[(0,c.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem]`,"aria-hidden":`true`,children:`more_horiz`}),(0,c.jsx)(`span`,{className:`sr-only`,children:`More pages`})]},`ellipsis-${r}`):(0,c.jsx)(`button`,{type:`button`,"data-slot":`pagination-page`,"aria-label":`Go to page ${t+1}`,"aria-current":t===e?`page`:void 0,disabled:p,onClick:()=>n(t),className:t===e?d:u,children:t+1},t)),(0,c.jsx)(`button`,{type:`button`,"data-slot":`pagination-next`,"aria-label":`Next page`,disabled:v,onClick:()=>n(e+1),className:u,children:(0,c.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem]`,"aria-hidden":`true`,children:`chevron_right`})}),o&&(0,c.jsxs)(`label`,{className:`ml-2 flex items-center gap-1.5 text-muted-foreground`,children:[(0,c.jsx)(`span`,{className:`sr-only`,children:`Rows per page`}),(0,c.jsx)(`select`,{"data-slot":`pagination-page-size`,value:i,disabled:p,onChange:e=>o(Number(e.target.value)),className:a(`h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground`,`shadow-xs hover:bg-muted`,`dark:border-input dark:bg-input/30 dark:hover:bg-input/50`,`focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`,`disabled:pointer-events-none disabled:opacity-50`),children:f.map(e=>(0,c.jsx)(`option`,{value:e,children:e},e))})]})]})},f.__docgenInfo={description:``,methods:[],displayName:`Pagination`,props:{pageIndex:{required:!0,tsType:{name:`number`},description:`Zero-based current page.`},pageCount:{required:!0,tsType:{name:`number`},description:`Total number of pages.`},onPageChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(pageIndex: number) => void`,signature:{arguments:[{type:{name:`number`},name:`pageIndex`}],return:{name:`void`}}},description:``},siblingCount:{required:!1,tsType:{name:`number`},description:`Pages shown on each side of the current page.`,defaultValue:{value:`1`,computed:!1}},pageSize:{required:!1,tsType:{name:`number`},description:`Current page size; required to show the page-size selector.`},onPageSizeChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(size: number) => void`,signature:{arguments:[{type:{name:`number`},name:`size`}],return:{name:`void`}}},description:`Fires with the chosen size. Omit to hide the page-size selector.`},pageSizeOptions:{required:!1,tsType:{name:`unknown`},description:`Options for the page-size selector.`,defaultValue:{value:`[10, 25, 50, 100]`,computed:!1}},disabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``}}}})),m,h,g,_,v,y,b,x,S,C,w;e((()=>{m=t(n(),1),p(),h=r(),{fn:g}=__STORYBOOK_MODULE_TEST__,_={title:`UI/Pagination`,component:f,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,h.jsx)(`div`,{className:`w-fit`,children:(0,h.jsx)(e,{})})],args:{pageIndex:0,pageCount:10,onPageChange:g()},argTypes:{disabled:{control:`boolean`}}},v={render:e=>{let[t,n]=(0,m.useState)(0);return(0,h.jsx)(f,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)}})}},y={args:{pageCount:20},render:e=>{let[t,n]=(0,m.useState)(5);return(0,h.jsx)(f,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)}})}},b={render:e=>{let[t,n]=(0,m.useState)(9);return(0,h.jsx)(f,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)}})}},x={args:{pageCount:3},render:e=>{let[t,n]=(0,m.useState)(0);return(0,h.jsx)(f,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)}})}},S={args:{pageCount:40},render:e=>{let[t,n]=(0,m.useState)(11);return(0,h.jsx)(f,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)}})}},C={args:{pageCount:20,onPageSizeChange:g()},render:e=>{let[t,n]=(0,m.useState)(5),[r,i]=(0,m.useState)(25);return(0,h.jsx)(f,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)},pageSize:r,onPageSizeChange:t=>{i(t),e.onPageSizeChange?.(t)}})}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [pageIndex, setPageIndex] = useState(0);
    return <Pagination {...args} pageIndex={pageIndex} onPageChange={page => {
      setPageIndex(page);
      args.onPageChange(page);
    }} />;
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    pageCount: 20
  },
  render: args => {
    const [pageIndex, setPageIndex] = useState(5);
    return <Pagination {...args} pageIndex={pageIndex} onPageChange={page => {
      setPageIndex(page);
      args.onPageChange(page);
    }} />;
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [pageIndex, setPageIndex] = useState(9);
    return <Pagination {...args} pageIndex={pageIndex} onPageChange={page => {
      setPageIndex(page);
      args.onPageChange(page);
    }} />;
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    pageCount: 3
  },
  render: args => {
    const [pageIndex, setPageIndex] = useState(0);
    return <Pagination {...args} pageIndex={pageIndex} onPageChange={page => {
      setPageIndex(page);
      args.onPageChange(page);
    }} />;
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    pageCount: 40
  },
  render: args => {
    const [pageIndex, setPageIndex] = useState(11);
    return <Pagination {...args} pageIndex={pageIndex} onPageChange={page => {
      setPageIndex(page);
      args.onPageChange(page);
    }} />;
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    pageCount: 20,
    onPageSizeChange: fn()
  },
  render: args => {
    const [pageIndex, setPageIndex] = useState(5);
    const [pageSize, setPageSize] = useState(25);
    return <Pagination {...args} pageIndex={pageIndex} onPageChange={page => {
      setPageIndex(page);
      args.onPageChange(page);
    }} pageSize={pageSize} onPageSizeChange={size => {
      setPageSize(size);
      args.onPageSizeChange?.(size);
    }} />;
  }
}`,...C.parameters?.docs?.source}}},w=[`FirstPage`,`Middle`,`LastPage`,`FewPages`,`ManyPages`,`WithPageSize`]}))();export{x as FewPages,v as FirstPage,b as LastPage,S as ManyPages,y as Middle,C as WithPageSize,w as __namedExportsOrder,_ as default};