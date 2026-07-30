import{i as e,s as t}from"./preload-helper-V1OjyNFM.js";import{t as n}from"./react-DkG2ESoW.js";import{t as r}from"./jsx-runtime-DyTW4DCU.js";import{r as i,t as a}from"./utils-B_hWdS4M.js";import{n as o,r as s}from"./Button-Dgu9icOm.js";function c(e,t,n,r){return e===0||e===n||Math.abs(e-t)<=r}function l(e,t,n){let r=t-1,i=[],a=-1;for(let t=0;t<=r;t+=1){if(!c(t,e,r,n))continue;let o=t-a;o===2?i.push(a+1):o>2&&i.push(`ellipsis`),i.push(t),a=t}return i}var u,d,f,p,m,h=e((()=>{s(),i(),u=r(),d=[10,25,50,100],f=o({variant:`outline`,size:`icon`}),p=a(o({variant:`default`,size:`icon`}),`hover:bg-primary`),m=({pageIndex:e,pageCount:t,onPageChange:n,siblingCount:r=1,pageSize:i,onPageSizeChange:o,pageSizeOptions:s=d,disabled:c=!1,className:m})=>{let h=Math.max(t-1,0),g=c||t<=1,_=g||e<=0,v=g||e>=h,y=l(e,Math.max(t,1),r);return(0,u.jsxs)(`nav`,{"data-slot":`pagination`,"aria-label":`Pagination`,className:a(`flex items-center gap-1.5 text-sm`,m),children:[(0,u.jsx)(`button`,{type:`button`,"data-slot":`pagination-previous`,"aria-label":`Previous page`,disabled:_,onClick:()=>n(e-1),className:f,children:(0,u.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem]`,"aria-hidden":`true`,children:`chevron_left`})}),y.map((t,r)=>t===`ellipsis`?(0,u.jsxs)(`span`,{"data-slot":`pagination-ellipsis`,role:`presentation`,className:`inline-flex size-9 items-center justify-center text-muted-foreground`,children:[(0,u.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem]`,"aria-hidden":`true`,children:`more_horiz`}),(0,u.jsx)(`span`,{className:`sr-only`,children:`More pages`})]},`ellipsis-${r}`):(0,u.jsx)(`button`,{type:`button`,"data-slot":`pagination-page`,"aria-label":`Go to page ${t+1}`,"aria-current":t===e?`page`:void 0,disabled:c,onClick:()=>n(t),className:t===e?p:f,children:t+1},t)),(0,u.jsx)(`button`,{type:`button`,"data-slot":`pagination-next`,"aria-label":`Next page`,disabled:v,onClick:()=>n(e+1),className:f,children:(0,u.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem]`,"aria-hidden":`true`,children:`chevron_right`})}),o&&(0,u.jsxs)(`label`,{className:`ml-2 flex items-center gap-1.5 text-muted-foreground`,children:[(0,u.jsx)(`span`,{className:`sr-only`,children:`Rows per page`}),(0,u.jsx)(`select`,{"data-slot":`pagination-page-size`,value:i,disabled:c,onChange:e=>o(Number(e.target.value)),className:a(`rounded-md border border-border bg-background dark:border-input dark:bg-input/30`,`h-9 px-2 text-sm text-foreground shadow-xs hover:bg-muted dark:hover:bg-input/50`,`focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`,`disabled:pointer-events-none disabled:opacity-50`),children:s.map(e=>(0,u.jsx)(`option`,{value:e,children:e},e))})]})]})},m.__docgenInfo={description:``,methods:[],displayName:`Pagination`,props:{pageIndex:{required:!0,tsType:{name:`number`},description:`Zero-based current page.`},pageCount:{required:!0,tsType:{name:`number`},description:`Total number of pages.`},onPageChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(pageIndex: number) => void`,signature:{arguments:[{type:{name:`number`},name:`pageIndex`}],return:{name:`void`}}},description:``},siblingCount:{required:!1,tsType:{name:`number`},description:`Pages shown on each side of the current page.`,defaultValue:{value:`1`,computed:!1}},pageSize:{required:!1,tsType:{name:`number`},description:`Current page size; required to show the page-size selector.`},onPageSizeChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(size: number) => void`,signature:{arguments:[{type:{name:`number`},name:`size`}],return:{name:`void`}}},description:`Fires with the chosen size. Omit to hide the page-size selector.`},pageSizeOptions:{required:!1,tsType:{name:`unknown`},description:`Options for the page-size selector.`,defaultValue:{value:`[10, 25, 50, 100]`,computed:!1}},disabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``}}}})),g,_,v,y,b,x,S,C,w,T,E;e((()=>{g=t(n(),1),h(),_=r(),{fn:v}=__STORYBOOK_MODULE_TEST__,y={title:`UI/Pagination`,component:m,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,_.jsx)(`div`,{className:`w-fit`,children:(0,_.jsx)(e,{})})],args:{pageIndex:0,pageCount:10,onPageChange:v()},argTypes:{disabled:{control:`boolean`}}},b={render:e=>{let[t,n]=(0,g.useState)(0);return(0,_.jsx)(m,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)}})}},x={args:{pageCount:20},render:e=>{let[t,n]=(0,g.useState)(5);return(0,_.jsx)(m,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)}})}},S={render:e=>{let[t,n]=(0,g.useState)(9);return(0,_.jsx)(m,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)}})}},C={args:{pageCount:3},render:e=>{let[t,n]=(0,g.useState)(0);return(0,_.jsx)(m,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)}})}},w={args:{pageCount:40},render:e=>{let[t,n]=(0,g.useState)(11);return(0,_.jsx)(m,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)}})}},T={args:{pageCount:20,onPageSizeChange:v()},render:e=>{let[t,n]=(0,g.useState)(5),[r,i]=(0,g.useState)(25);return(0,_.jsx)(m,{...e,pageIndex:t,onPageChange:t=>{n(t),e.onPageChange(t)},pageSize:r,onPageSizeChange:t=>{i(t),e.onPageSizeChange?.(t)}})}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [pageIndex, setPageIndex] = useState(0);
    return <Pagination {...args} pageIndex={pageIndex} onPageChange={page => {
      setPageIndex(page);
      args.onPageChange(page);
    }} />;
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
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
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [pageIndex, setPageIndex] = useState(9);
    return <Pagination {...args} pageIndex={pageIndex} onPageChange={page => {
      setPageIndex(page);
      args.onPageChange(page);
    }} />;
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
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
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
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
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
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
}`,...T.parameters?.docs?.source}}},E=[`FirstPage`,`Middle`,`LastPage`,`FewPages`,`ManyPages`,`WithPageSize`]}))();export{C as FewPages,b as FirstPage,S as LastPage,w as ManyPages,x as Middle,T as WithPageSize,E as __namedExportsOrder,y as default};