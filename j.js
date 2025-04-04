// By + Copyright 2022-2025 Greg Abbott. Version YMD 2025_0404
function download_file({ name, ext, data }) {
	let blob = new Blob([data], { type: "application/octet-stream" })
	let link = document.createElement("a")
	link.href = URL.createObjectURL(blob)
	link.download = `${name}.${ext}`
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(link.href)
}
let el={}
function main(){
function log(x){console.log(x);return x}
function gebi(x){return document.getElementById(x)}
let ids = [
  `perline`,
  `normal_wrapped`,
  `max_line_width`,
  `perline_ruler`,
  `indent_wrapped_lines`,
  `custom_value_for_one_indent`
]
ids.forEach(id=>{
  el[id]=gebi(id)
})
el.perline.onchange=
el.perline.onkeyup=()=>{
	el.normal_wrapped.value=
  perline.to_normal({
      string:el.perline.value,
      one_indent:el.custom_value_for_one_indent.value,
  })
}
function handle_indentation(textarea){
  let one_indent = ''
  const get_key_code = e => e.keyCode || e.charCode || e.which
  const indent_nearest_line = (el, e) => {
    e.preventDefault()
    const start = el.selectionStart
    const line_start = el.value.lastIndexOf('\n', start - 1) + 1
    el.value = el.value.slice(0, line_start) + one_indent + el.value.slice(line_start)
    el.selectionStart = el.selectionEnd = start + one_indent.length
  }
  const outdent_nearest_line = (el, e) => {
    e.preventDefault()
    const start = el.selectionStart
    const line_start = el.value.lastIndexOf('\n', start - 1) + 1
    if (el.value.slice(line_start, line_start + one_indent.length) === one_indent) {
      el.value = el.value.slice(0, line_start) + el.value.slice(line_start + one_indent.length)
      el.selectionStart = el.selectionEnd = start - one_indent.length
    }
  }
  const insert_str_at_position = (el, e, str) => {
    const { selectionStart: start, selectionEnd: end, scrollTop } = el
    e.preventDefault()
    el.value = el.value.slice(0, start) + str + el.value.slice(end)
    el.selectionStart = el.selectionEnd = start + str.length
    el.scrollTop = scrollTop
  }
  const unindent_nearest_tab_on_left = (el, e) => {
    let { selectionStart: s, selectionEnd: eS, scrollTop: sT, value } = el
    let before = value.slice(0, s), after = value.slice(eS)
    if (before.endsWith(one_indent)) {
      before = before.slice(0, -one_indent.length)
      s -= one_indent.length
    } else if (/\n[ \t]*$/.test(before)) {
      let match = before.match(/\n[ \t]*$/)
      before = before.slice(0, match.index + 1)
      s -= match[0].length - 1
    }
    el.value = before + after
    el.setSelectionRange(s, s)
    el.scrollTop = sT
    e.preventDefault()
  }
  const indent_logic = e => {
    one_indent=el?.custom_value_for_one_indent.value || "\t"
    const inp = e.target
    const code = get_key_code(e)
    const cmd = e.metaKey
    const shift = e.shiftKey
    const cmd_left_bracket = cmd && code === 219
    const cmd_right_bracket = cmd && code === 221
    const tab_only = code === 9 && !shift
    const shift_tab = code === 9 && shift
    if (cmd_left_bracket) outdent_nearest_line(inp, e)
    else if (cmd_right_bracket) indent_nearest_line(inp, e)
    else if (tab_only) insert_str_at_position(inp, e, one_indent)
    else if (shift_tab) unindent_nearest_tab_on_left(inp, e)
  }
  textarea.addEventListener('keydown', indent_logic)
}
[
  el.custom_value_for_one_indent,
  el.perline,
  el.normal_wrapped
].forEach(handle_indentation);
([
  el.perline,
  el.normal_wrapped
]).forEach(el=>{
  move_line_and_children(el)
  delete_current_line(el)
});
function delete_current_line(el){
  function delete_line(el){
    let lines = el.value.split('\n')
    let pos = el.selectionStart
    let line = el.value.substring(0, pos).split('\n').length - 1
    lines.splice(line, 1)
    el.value = lines.join('\n')
    let new_pos = lines.slice(0, line).join('\n').length
    el.setSelectionRange(new_pos, new_pos)
  }
  el.addEventListener('keydown', e => {
    if (e.altKey && e.code === 'KeyX') {
      e.preventDefault()
      delete_line(e.target)
    }
  })
}
function move_line_and_children(el){
/*Summary:
grab textarea value
insert character in string to mark caret position
split string to blocks
  each block starts with an unindented line
  further lines in a block have more indentation than the first
move the current block (the one containing the caret position) 
  up or down in the list
join to a string again
replace textarea value
update the caret position using the marker character
*/
  let caret_position_holder=String.fromCharCode(31)
  function split_at_caret(textarea) {
    const value = textarea.value
    const caret_pos = textarea.selectionStart
    let first_part = value.slice(0, caret_pos)
      .replaceAll(caret_position_holder, '')
    let second_part = value.slice(caret_pos)
      .replaceAll(caret_position_holder, '')
    return first_part + caret_position_holder + second_part
  }
  function split_into_blocks(text) {
    const blocks = []
    let current_block = []
    let block_to_move_index = null
    text.split('\n').forEach((line, line_index) => {
      const is_leading_whitespace = /^\s/.test(line)
      if (!is_leading_whitespace && current_block.length) {
        blocks.push(current_block.join('\n'))
        current_block = []
      }
      if (line.includes(caret_position_holder)){
        block_to_move_index = blocks.length
      }
      current_block.push(line)
    })
    if (current_block.length) blocks.push(current_block.join('\n'))
    return { blocks, block_to_move_index }
  }
  function move_block(blocks, block_to_move_index, direction) {
    const new_index = block_to_move_index + (direction === 'up' ? -1 : 1)
    if (new_index < 0 || new_index >= blocks.length) {
      //can't move block (at top or bottom already)
      return { blocks, block_to_move_index }
    }
    //move block
    const temp = blocks[block_to_move_index]
    blocks[block_to_move_index] = blocks[new_index]
    blocks[new_index] = temp
    return blocks
  }
  function reassemble_and_update_textarea(textarea, blocks) {
    const joined_text = blocks.join('\n')
    const caret_pos = joined_text.indexOf(caret_position_holder)
    textarea.value = joined_text.replace(caret_position_holder, '')
    textarea.setSelectionRange(caret_pos, caret_pos)
  }
  function handle_move(textarea, direction) {
    const text_with_character_at_caret_position = 
      split_at_caret(textarea)
    const { blocks, block_to_move_index } = split_into_blocks(text_with_character_at_caret_position)
    const moved_blocks = move_block(blocks, block_to_move_index, direction)
    reassemble_and_update_textarea(textarea, moved_blocks)
  }
  el.addEventListener('keydown', e => {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      handle_move(e.target, e.key === 'ArrowUp' ? 'up' : 'down')
    }
  })
}
function position_perline_ruler(){
  let left =
    2+//<-NOTE: must account for textarea css padding
    Number(el.max_line_width.value)
  el.perline_ruler.style.left=left+'ch'
}
el.custom_value_for_one_indent.onkeyup=normal_to_perline
el.normal_wrapped.onchange=normal_to_perline
el.normal_wrapped.onkeyup=normal_to_perline
el.max_line_width.onkeyup=
el.max_line_width.onchange=()=>{
  /*
  let v = parseInt(el.max_line_width.value)
  //soft wrap confuses whether a line is hard wrapped or not
  if(v===0){
    el.perline.style.overflowX= "hidden"
    el.perline.style.whiteSpace= "normal"
  }
  else{
    el.perline.style.overflowX= "auto"
    el.perline.style.whiteSpace= "pre"
  }*/
  position_perline_ruler()
  normal_to_perline()
}
el.indent_wrapped_lines.onchange=normal_to_perline
function normal_to_perline(){
	el.perline.value=
  perline.from_normal({
      one_indent:el.custom_value_for_one_indent.value,
      max_line_length:el.max_line_width.value,
      string:el.normal_wrapped.value,
      indent_wrapped_lines:el.indent_wrapped_lines.checked
    })
}
function get_date_parts (date=new Date()){
	function p(n){return n.toString().padStart(2,'0')}
	return {
	y:p(date.getFullYear()),
	M:p(date.getMonth() + 1),
	d:p(date.getDate()),
	h:p(date.getHours()),
	m:p(date.getMinutes()),
	s:p(date.getSeconds())
	}
}
function get_date_stamp(date){
  const {y,M,d,h,m} = get_date_parts(date)
  return `${y}_${M}${d}_${h}${m}`
}
function copy(string, el) {
	navigator.clipboard
		.writeText(string)
		.then(() => {
			button_notice("Copied!")
		})
		.catch(err => {
			button_notice("Failed")
		})
	function button_notice(s) {
		let init = el.innerText
		el.innerText = s
		setTimeout(() => {
			el.innerText = init
		}, 1000)
	}
}
gebi("save_perline").onclick = () => {
  download_file({
    name: get_date_stamp() + ` Perline`,
    ext:'md',
		data: el.perline.value,
	})
}
gebi("save_normal_wrapped").onclick = () => {
  download_file({
    name: get_date_stamp() + ` Normal`,
    ext:'md',
		data: el.normal_wrapped.value,
	})
}
gebi("button_to_copy_perline").onclick = e => {
  copy(el.perline.value, e.target)
}
gebi("button_to_copy_normal_wrapped").onclick = e => {
  copy(el.normal_wrapped.value, e.target)
}
let perline_templates={}
perline_templates['Intro to Perline']=`# Perline
This site features a live two-way Perline text converter.
Perline names a one sentence "per line" style text format.
Set a maximum line width value for further semantic wrapping.
A maximum width value of 0 keeps each sentence on one line.

# Converting to Perline
The tool first reformats text to a one sentence per line style.
It then checks if the user has set any maximum line width.
If so, it finds any sentences over this maximum width,
  and aims to split these across further lines.
To find logical places to split,
  the tool uses ordered rules based on punctuation and grammar.
If a line exceeds any maximum width
  and the tool finds no more logical places to split it further,
  the tool preserves it and moves to the next line.
Perline lines should hold a complete part of a sentence.

The tool has an option to indent wrapped sentence lines.
This makes it easy to see which lines start a sentence,
  and which lines continue a sentence.
It also clarifies the length of each sentence per text block.

# Shortcuts
* ALT + UP/DOWN: Moves a line, any parent and indented siblings.
* ALT + X: Deletes the current line.
* Indents
** CMD ]: Indents the line.
** CMD [: Outdents the line.
** TAB: Inserts 'one indent' at caret position.
** SHIFT + TAB: Removes 'one indent' to left of caret.
** The tool lets the user set the value of 'one indent'.

# Nested Lists
* Perline also supports list blocks.
* List block lines can start or continue list items.
* Lines that begin with a bullet point start new list items.
Lines that begin without a bullet continue any list item above.
** Bullet quantity controls the hierarchy of a list item.
Add or remove bullets from a list item to change its depth.

# Other
Elements the tool aims to handle when encountered include: 
time stamps,
acronyms,
ellipses, 
abbreviations,
and numbers with unit separators.

## Abbreviations
Mr. Mrs. Ms. Dr. Prof. Inc. Ltd. Jr. Sr. St. Ave. Blvd. Rd. Co. Etc. No. P.S. A.M. P.M.

(May form a break point before 'i.e.' or 'e.g.')

## Numbers with unit separators
1,000 10,000 1,000,000

## Time Stamps
09:41

## Acronyms
e.g. N.A.S.A, R.A.D.A.R`
let normal_wrapped_templates={}
let alice_name='Alice in Wonderland (Sample)'//Very long sentences
normal_wrapped_templates[alice_name]=`# Alice in Wonderland

## Chapter 1
Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversation?'

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, 'Oh dear! Oh dear! I shall be late!' (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.`

normal_wrapped_templates.demo_2=`The tool first reformats text to a one sentence per line style. It then checks if the user has set any maximum line width. If so, it finds any sentences over this maximum width, and aims to split these across further lines. To find logical places to split, the tool uses ordered rules based on punctuation and grammar. If a line exceeds any maximum width and the tool finds no more logical places to split it further, the tool preserves it and moves to the next line. Perline lines should hold a complete part of a sentence.`

function populate_templates_list() {
	let the_popover_el = gebi("template_picker")
  //NORMAL TEMPLATES
	let normal_wrapped_templates_list = gebi("normal_wrapped_templates_list")
	
	Object.entries(normal_wrapped_templates)
  .forEach(([k, v]) => {
		let option_el = document.createElement("button")
		normal_wrapped_templates_list.appendChild(option_el)
		option_el.innerText = k.replaceAll('_',' ')
		option_el.onclick = () => {
			el.normal_wrapped.value = v
			el.normal_wrapped.onchange()
			the_popover_el.hidePopover()
		}
	})
  //PERLINE TEMPLATES
  let perline_templates_list = gebi("perline_templates_list")
  Object.entries(perline_templates)
  .forEach(([k, v]) => {
		let option_el = document.createElement("button")
		normal_wrapped_templates_list.appendChild(option_el)
		option_el.innerText = k.replaceAll('_',' ')
		option_el.onclick = () => {
			el.perline.value = v
			el.perline.onchange()
			the_popover_el.hidePopover()
		}
	})
  
}
normal_wrapped_templates.Abbreviations=
`When wrapping a sentence across lines, the tool treats EG and IE as the beginning of a sub-unit.

# Examples

The abbreviation belongs with the content that follows it e.g. the abbreviation stays with text that follows it. 

The abbreviation belongs with the content that follows it i.e. the abbreviation stays with text that follows it.

The abbreviation belongs with the content that follows it e.g., the abbreviation stays with text that follows it.

The abbreviation belongs with the content that follows it i.e., the abbreviation stays with text that follows it.

`
  //let abbreviations_2 = `Mr. Mrs. Ms. Dr. Prof. Inc. Ltd. Jr. Sr. St. Ave. Blvd. Rd. Co. Etc. No. P.S. A.M. P.M.`
  function start_with_normal(){
    el.normal_wrapped.value=
    //abbreviations_2
    normal_wrapped_templates['demo_2']//.Abbreviations
    el.normal_wrapped.onchange()
  }
  function start_with_wrapped(){
    el.perline.value=
    perline_templates["Intro to Perline"]
    el.perline.onchange()
  }
  populate_templates_list()
  start_with_wrapped()
  //start_with_normal()
  position_perline_ruler()
}
window.addEventListener('load',main)