import {expect,it} from 'vitest';
import {EditorState} from '@tiptap/pm/state';
import {assemblePMSchema,type BlockdocManifest} from '../src/core';
import {proseShortcuts} from '../src/react/prose-shortcuts';
const manifest:BlockdocManifest={profile:'test',version:1,doc:{admitsChildCategories:['prose']},'x-prose':{p:'block',h1:'block',strong:'mark'},nodes:[
 {name:'p',category:'prose',admitsChildCategories:null,admitsText:true},
 {name:'h1',category:'prose',admitsChildCategories:null,admitsText:true},
],marks:[{name:'strong'}]};
it('does not install shortcuts without declared prose metadata',()=>{
 const schema=assemblePMSchema([manifest]);
 const plain={...manifest};delete plain['x-prose'];
 expect(proseShortcuts(schema,[plain])).toEqual([]);
});
it('turns a Markdown heading prefix into the declared heading through a real input rule',()=>{
 const schema=assemblePMSchema([manifest]);
 let state=EditorState.create({schema,doc:schema.node('doc',null,[schema.node('p',null,[schema.text('#')])]),plugins:proseShortcuts(schema,[manifest])});
 const view={get state(){return state;},composing:false,dispatch(tr:Parameters<typeof state.apply>[0]){state=state.apply(tr);}};
 let handled=false;
 for(const plugin of state.plugins){
  const handler=plugin.props.handleTextInput;
  if(handler&&handler.call(plugin,view as never,2,2,' ',()=>state.tr)){handled=true;break;}
 }
 expect(handled).toBe(true);
 expect(state.doc.firstChild?.type.name).toBe('h1');
 expect(state.doc.textContent).toBe('');
});

it('turns Markdown strong delimiters into a mark without retaining the delimiters',()=>{
 const schema=assemblePMSchema([manifest]);
 let state=EditorState.create({schema,doc:schema.node('doc',null,[schema.node('p',null,[schema.text('**bold*')])]),plugins:proseShortcuts(schema,[manifest])});
 const view={get state(){return state;},composing:false,dispatch(tr:Parameters<typeof state.apply>[0]){state=state.apply(tr);}};
 let handled=false;
 for(const plugin of state.plugins){
  const handler=plugin.props.handleTextInput;
  if(handler&&handler.call(plugin,view as never,8,8,'*',()=>state.tr)){handled=true;break;}
 }
 expect(handled).toBe(true);
 expect(state.doc.textContent).toBe('bold');
 expect(state.doc.firstChild?.firstChild?.marks.map(mark=>mark.type.name)).toEqual(['strong']);
});
