import * as React from "react";
import { Folder, FileText, ChevronRight, Home, FolderPlus, Trash2, Pencil, Download, Save, X, Loader2, ArrowLeft, RefreshCcw } from "lucide-react";
import { panelFetch } from "@/lib/panelApi";
import { toast } from "@/components/ui/use-toast";

interface Props { orderId: string; }

function fmtSize(b: number) {
  if (b === 0) return "0 B";
  const u = ["B","KB","MB","GB"];
  const i = Math.min(Math.floor(Math.log(b)/Math.log(1024)), u.length-1);
  return `${(b/Math.pow(1024,i)).toFixed(i===0?0:1)} ${u[i]}`;
}
function fmtDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}

export default function FilesTab({ orderId }: Props) {
  const [path, setPath] = React.useState("/");
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string|null>(null);
  const [editFile, setEditFile] = React.useState<string|null>(null);
  const [content, setContent] = React.useState("");
  const [fileLoading, setFileLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [newFolder, setNewFolder] = React.useState(false);
  const [folderName, setFolderName] = React.useState("");
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [renameItem, setRenameItem] = React.useState<string|null>(null);
  const [renameVal, setRenameVal] = React.useState("");
  const [renaming, setRenaming] = React.useState(false);
  const [deleteItem, setDeleteItem] = React.useState<string|null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async (dir: string) => {
    setLoading(true); setError(null);
    try {
      const d = await panelFetch(orderId,"files/list",{query:{directory:dir}});
      const sorted = (d?.data||[]).sort((a:any,b:any) => {
        if(!a.attributes.is_file && b.attributes.is_file) return -1;
        if(a.attributes.is_file && !b.attributes.is_file) return 1;
        return a.attributes.name.localeCompare(b.attributes.name);
      });
      setItems(sorted);
    } catch(e:any) { setError(e?.message||"Failed to list files"); }
    finally { setLoading(false); }
  },[orderId]);

  React.useEffect(()=>{ load(path); },[path,load]);

  const segs = path.split("/").filter(Boolean);
  const nav = (d:string) => { setEditFile(null); setPath(d); };
  const into = (n:string) => nav(path==="/"?`/${n}`:`${path}/${n}`);
  const crumb = (i:number) => i<0 ? nav("/") : nav("/"+segs.slice(0,i+1).join("/"));

  async function openFile(name:string) {
    const fp = path==="/"?`/${name}`:`${path}/${name}`;
    setFileLoading(true); setEditFile(fp);
    try {
      const d = await panelFetch(orderId,"files/contents",{query:{file:fp}});
      setContent(typeof d==="string"?d:JSON.stringify(d,null,2));
    } catch(e:any) { toast({title:"Cannot open file",description:e?.message,variant:"destructive"}); setEditFile(null); }
    finally { setFileLoading(false); }
  }
  async function saveFile() {
    if(!editFile) return; setSaving(true);
    try { await panelFetch(orderId,"files/write",{method:"POST",query:{file:editFile},rawBody:content}); toast({title:"File saved",description:editFile}); }
    catch(e:any) { toast({title:"Save failed",description:e?.message,variant:"destructive"}); }
    finally { setSaving(false); }
  }
  async function createFolder() {
    if(!folderName.trim()) return; setCreatingFolder(true);
    try { await panelFetch(orderId,"files/create-folder",{method:"POST",body:{root:path,name:folderName.trim()}}); toast({title:"Folder created"}); setFolderName(""); setNewFolder(false); load(path); }
    catch(e:any) { toast({title:"Create failed",description:e?.message,variant:"destructive"}); }
    finally { setCreatingFolder(false); }
  }
  async function doRename() {
    if(!renameItem||!renameVal.trim()) return; setRenaming(true);
    try { await panelFetch(orderId,"files/rename",{method:"POST",body:{root:path,files:[{from:renameItem,to:renameVal.trim()}]}}); toast({title:"Renamed"}); setRenameItem(null); setRenameVal(""); load(path); }
    catch(e:any) { toast({title:"Rename failed",description:e?.message,variant:"destructive"}); }
    finally { setRenaming(false); }
  }
  async function doDelete() {
    if(!deleteItem) return; setDeleting(true);
    try { await panelFetch(orderId,"files/delete",{method:"POST",body:{root:path,files:[deleteItem]}}); toast({title:"Deleted"}); setDeleteItem(null); load(path); }
    catch(e:any) { toast({title:"Delete failed",description:e?.message,variant:"destructive"}); }
    finally { setDeleting(false); }
  }
  async function download(name:string) {
    const fp = path==="/"?`/${name}`:`${path}/${name}`;
    try {
      const d = await panelFetch(orderId,"files/download",{query:{file:fp}});
      const url = d?.attributes?.url||d?.url;
      if(url) window.open(url,"_blank");
      else toast({title:"Download failed",description:"No URL returned",variant:"destructive"});
    } catch(e:any) { toast({title:"Download failed",description:e?.message,variant:"destructive"}); }
  }

  if(editFile) return (
    <div className="bg-gray-900/90 border border-gray-600 rounded-xl shadow flex flex-col h-[600px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={()=>setEditFile(null)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"><ArrowLeft size={16}/></button>
          <FileText size={16} className="text-blue-400"/>
          <span className="font-mono text-gray-200">{editFile}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveFile} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50">
            {saving?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Save
          </button>
          <button onClick={()=>setEditFile(null)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white"><X size={16}/></button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {fileLoading ? <div className="flex items-center justify-center h-full text-gray-400"><Loader2 size={20} className="animate-spin mr-2"/> Loading...</div>
        : <textarea value={content} onChange={e=>setContent(e.target.value)} spellCheck={false} className="w-full h-full bg-gray-950 text-gray-100 font-mono text-sm p-4 resize-none focus:outline-none border-none"/>}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Files</h2>
        <div className="flex items-center gap-2">
          <button onClick={()=>setNewFolder(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-600 text-gray-200 hover:text-white hover:bg-gray-800 text-xs font-medium"><FolderPlus size={14}/> New Folder</button>
          <button onClick={()=>load(path)} className="p-1.5 rounded-md border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800"><RefreshCcw size={14}/></button>
        </div>
      </div>
      <div className="flex items-center gap-1 mb-4 text-sm flex-wrap">
        <button onClick={()=>crumb(-1)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-gray-300 hover:text-white hover:bg-gray-800"><Home size={14}/><span>/</span></button>
        {segs.map((s,i)=><React.Fragment key={i}><ChevronRight size={14} className="text-gray-500"/><button onClick={()=>crumb(i)} className={`px-2 py-1 rounded text-sm font-medium ${i===segs.length-1?"text-white bg-gray-800":"text-gray-300 hover:text-white hover:bg-gray-800"}`}>{s}</button></React.Fragment>)}
      </div>

      {newFolder && <div className="mb-4 flex items-center gap-2 p-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
        <FolderPlus size={16} className="text-emerald-400"/>
        <input type="text" value={folderName} onChange={e=>setFolderName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createFolder()} placeholder="Folder name" autoFocus className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
        <button onClick={createFolder} disabled={creatingFolder||!folderName.trim()} className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50">{creatingFolder?<Loader2 size={14} className="animate-spin"/>:"Create"}</button>
        <button onClick={()=>{setNewFolder(false);setFolderName("");}} className="p-1 rounded hover:bg-gray-700 text-gray-400"><X size={16}/></button>
      </div>}

      {renameItem && <div className="mb-4 flex items-center gap-2 p-3 bg-gray-800/60 rounded-lg border border-amber-700/50">
        <Pencil size={16} className="text-amber-400"/>
        <span className="text-sm text-gray-400 whitespace-nowrap">Rename {renameItem} to</span>
        <input type="text" value={renameVal} onChange={e=>setRenameVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doRename()} autoFocus className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"/>
        <button onClick={doRename} disabled={renaming||!renameVal.trim()} className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold disabled:opacity-50">{renaming?<Loader2 size={14} className="animate-spin"/>:"Rename"}</button>
        <button onClick={()=>{setRenameItem(null);setRenameVal("");}} className="p-1 rounded hover:bg-gray-700 text-gray-400"><X size={16}/></button>
      </div>}

      {deleteItem && <div className="mb-4 flex items-center gap-2 p-3 bg-red-950/40 rounded-lg border border-red-700/50">
        <Trash2 size={16} className="text-red-400"/>
        <span className="text-sm text-gray-200 flex-1">Delete <span className="font-semibold text-white">{deleteItem}</span>? This cannot be undone.</span>
        <button onClick={doDelete} disabled={deleting} className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50">{deleting?<Loader2 size={14} className="animate-spin"/>:"Delete"}</button>
        <button onClick={()=>setDeleteItem(null)} className="p-1 rounded hover:bg-gray-700 text-gray-400"><X size={16}/></button>
      </div>}

      {loading ? <div className="flex items-center gap-2 text-gray-400 py-8 justify-center"><Loader2 size={16} className="animate-spin"/> Loading files...</div>
      : error ? <div className="text-red-400 text-sm py-4">{error}</div>
      : items.length===0 ? <p className="text-gray-400 text-sm py-4">This directory is empty.</p>
      : <div className="space-y-0.5">
          {path!=="/" && <button onClick={()=>nav("/"+segs.slice(0,-1).join("/")||"/")} className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-800/60 text-left"><ArrowLeft size={16} className="text-gray-500"/><span className="text-gray-400 text-sm">..</span></button>}
          {items.map((item:any)=>{const a=item.attributes;const isDir=!a.is_file;return(
            <div key={a.name} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-800/60 group">
              {isDir?<Folder size={16} className="text-emerald-400 flex-shrink-0"/>:<FileText size={16} className="text-blue-400 flex-shrink-0"/>}
              <button onClick={()=>isDir?into(a.name):openFile(a.name)} className="flex-1 text-left text-sm text-gray-200 hover:text-white truncate">{a.name}</button>
              <span className="text-xs text-gray-500 w-20 text-right flex-shrink-0">{isDir?"dir":fmtSize(a.size)}</span>
              <span className="text-xs text-gray-500 w-32 text-right flex-shrink-0 hidden sm:block">{fmtDate(a.modified_at)}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {a.is_file&&<button onClick={()=>download(a.name)} title="Download" className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-blue-400"><Download size={14}/></button>}
                <button onClick={()=>{setRenameItem(a.name);setRenameVal(a.name);}} title="Rename" className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-amber-400"><Pencil size={14}/></button>
                <button onClick={()=>setDeleteItem(a.name)} title="Delete" className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
              </div>
            </div>
          );})}
        </div>}
    </div>
  );
}
