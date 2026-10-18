import {InputRule,inputRules,textblockTypeInputRule,wrappingInputRule} from '@tiptap/pm/inputrules';
import {keymap} from '@tiptap/pm/keymap';
import {splitListItem,liftListItem,sinkListItem} from '@tiptap/pm/schema-list';
import type {Schema} from '@tiptap/pm/model';
import type {Plugin} from '@tiptap/pm/state';
import type {BlockdocManifest} from '../core';

/** Markdown gestures are offered only for roles in this editor's Manifest Profile. */
export function proseShortcuts(schema:Schema,manifests:BlockdocManifest[]):Plugin[] {
 const roles=Object.assign({},...manifests.map(m=>m['x-prose']??{})) as Record<string,string>;
 if(!Object.keys(roles).length)return [];
 const rules:InputRule[]=[];
 for(let level=1;level<=6;level++){
  const name=`h${level}`;
  if(roles[name]==='block'&&schema.nodes[name])rules.push(textblockTypeInputRule(new RegExp(`^(#{${level}})\\s$`),schema.nodes[name]));
 }
 for(const [name,pattern] of [['blockquote',/^>\s$/],['ul',/^[-+*]\s$/],['ol',/^\d+\.\s$/]] as const){
  if(roles[name]==='container'&&schema.nodes[name])rules.push(wrappingInputRule(pattern,schema.nodes[name]));
 }
 for(const [name,pattern] of [['strong',/\*\*([^*]+)\*\*$/],['em',/\*([^*]+)\*$/],['code',/`([^`]+)`$/]] as const){
  if(roles[name]!=='mark'||!schema.marks[name])continue;
  rules.push(new InputRule(pattern,(state,match,start,end)=>{
   const tr=state.tr.insertText(match[1],start,end);
   tr.addMark(start,start+match[1].length,schema.marks[name].create());
   tr.removeStoredMark(schema.marks[name]);
   return tr;
  }));
 }
 const list=schema.nodes.li;
 return [inputRules({rules}),...(roles.li==='container'&&list?[keymap({Enter:splitListItem(list),Tab:sinkListItem(list),'Shift-Tab':liftListItem(list)})]:[])];
}
