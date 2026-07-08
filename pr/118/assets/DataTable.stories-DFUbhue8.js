import{i as e,s as t}from"./preload-helper-BkxogPRx.js";import{t as n}from"./react-D6MCWlFg.js";import{t as r}from"./jsx-runtime-RLvUuy-X.js";import{n as i,t as a}from"./DataTable-BjI3ZAoi.js";var o,s,c,l,u,d,f,p,m,h,g,_;e((()=>{o=t(n(),1),i(),s=r(),c=[{id:`1`,title:`Billie Jean`,level:3,bpm:117},{id:`2`,title:`Seven Nation Army`,level:1,bpm:124},{id:`3`,title:`Rosanna`,level:8,bpm:132},{id:`4`,title:`Take Five`,level:6,bpm:174}],l=[{accessorKey:`title`,header:`Name`,cell:({getValue:e})=>e()},{accessorKey:`level`,header:`Level`,meta:{align:`center`},cell:({getValue:e})=>e()},{accessorKey:`bpm`,header:`BPM`,meta:{align:`right`},cell:({getValue:e})=>e()}],u={title:`UI/DataTable`,component:a,parameters:{layout:`padded`},tags:[`autodocs`]},d={args:{data:c,columns:l,appearance:`cards`,onRowClick:()=>{}}},f={args:{data:c,columns:l,appearance:`rows`,onRowClick:()=>{}}},p={args:{data:c,columns:[{accessorKey:`title`,header:`Name`,cell:({getValue:e})=>e()},{accessorKey:`level`,header:`Level`,meta:{align:`center`},cell:({getValue:e})=>e()},{accessorKey:`bpm`,header:`BPM`,meta:{align:`right`},sortDescFirst:!0,cell:({getValue:e})=>e()}],appearance:`cards`,defaultSorting:[{id:`title`,desc:!1}]}},m={render:()=>{let[e,t]=(0,o.useState)({});return(0,s.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,s.jsx)(`div`,{className:`flex gap-2`,children:[`level`,`bpm`].map(e=>(0,s.jsxs)(`button`,{type:`button`,className:`rounded border border-border px-2 py-1 text-xs`,onClick:()=>t(t=>({...t,[e]:t[e]===!1})),children:[`Toggle `,e]},e))}),(0,s.jsx)(a,{data:c,columns:l,columnVisibility:e,onColumnVisibilityChange:t})]})}},h={args:{data:[],columns:l,emptyState:`No pieces found — adjust your filters`}},g={args:{data:c,columns:l,isLoading:!0}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    data: demo,
    columns,
    appearance: 'cards',
    onRowClick: () => {}
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    data: demo,
    columns,
    appearance: 'rows',
    onRowClick: () => {}
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    data: demo,
    columns: [{
      accessorKey: 'title',
      header: 'Name',
      cell: ({
        getValue
      }) => getValue<string>()
    }, {
      accessorKey: 'level',
      header: 'Level',
      meta: {
        align: 'center'
      },
      cell: ({
        getValue
      }) => getValue<number>()
    }, {
      accessorKey: 'bpm',
      header: 'BPM',
      meta: {
        align: 'right'
      },
      sortDescFirst: true,
      cell: ({
        getValue
      }) => getValue<number>()
    }],
    appearance: 'cards',
    defaultSorting: [{
      id: 'title',
      desc: false
    }]
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [visibility, setVisibility] = useState<VisibilityState>({});
    return <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {(['level', 'bpm'] as const).map(id => <button key={id} type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => setVisibility(v => ({
          ...v,
          [id]: v[id] === false
        }))}>
              Toggle {id}
            </button>)}
        </div>
        <DataTable data={demo} columns={columns} columnVisibility={visibility} onColumnVisibilityChange={setVisibility} />
      </div>;
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    data: [],
    columns,
    emptyState: 'No pieces found — adjust your filters'
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    data: demo,
    columns,
    isLoading: true
  }
}`,...g.parameters?.docs?.source}}},_=[`Default`,`Rows`,`SortableHeaders`,`ColumnVisibilityToggle`,`Empty`,`Loading`]}))();export{m as ColumnVisibilityToggle,d as Default,h as Empty,g as Loading,f as Rows,p as SortableHeaders,_ as __namedExportsOrder,u as default};