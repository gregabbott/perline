// By and Copyright Greg Abbott 2024-2025. V 2025_0311
let file_picker = document.getElementById('file_picker')
add_drag_drop(file_picker)
function add_drag_drop(el){
  let drag_notice=document.getElementById('drag_notice')
  function on(f){return n=>window.addEventListener(n,f,false)}
  function stop(e){e.stopPropagation();e.preventDefault()}
  function deactivate(){drag_notice.classList.add('hide')}
  function activate(){drag_notice.classList.remove('hide')};
  ['dragenter','dragover','dragleave','drop'].forEach(on(stop));
  ['dragenter', 'dragover'].forEach(on(activate))
  on(deactivate)('dragleave')
  on(handle_drop)('drop')
  function handle_drop(e){
    deactivate()
    el.files = ([...e.dataTransfer.files])
    .reduce((a,f)=>{a.items.add(f);return a},new DataTransfer())
    .files
    read_files_user_picked(e.dataTransfer)
  }
}
file_picker.addEventListener('change',e=>{
  read_files_user_picked(e.target)
})
const text_types='txt,md,html,json,js,css,csv,svg'
	//Consider SVG text type as to read requires 'readAsText'
const text_extensions=new Set(text_types.split(','))
function should_read_this_file(file){
	//Customise per tool
	//e.g. text files only
	let is_a_text_file= text_extensions.has(file.ext)
	return is_a_text_file
}
function read_files_user_picked(e){
	let selected_files = [...e.files]
	let user_cancelled=selected_files.length==0
	if (user_cancelled){return}
	//filter out unwanted types etc:
	let to_process=selected_files.reduce((a,ref)=>{
		//Setup base object
		let file = {
			handle:ref,//reference to file on system, to read
			ext:ref.name.split('.').pop(),//`basename.EXT`->`EXT`
			date:ref.lastModified,//no access to creationDate so use this
			type:ref.type
		}
		//optionally filter out unwanted by date/ext/type
		//if(!should_read_this_file(file)){return a}
		a.push(file)//<collect it
		return a
	},[])
	let collection=[]//List of files successfully read
	let taken_base_names=[]
	read_file({i:0,files:to_process})
	//file1.onread FN calls `read(file2)` etc. until done
	function read_file({i,files}){
		const file = files[i]
		const file_reader=new FileReader()
		file_reader.onload=()=>{
			file.data=file_reader.result
			file.name=get_closest_unused_name(strip_extension(file.handle.name))
			taken_base_names.push(file.name)//mark as taken
			collection.push(file)
			let have_read_all_files=i==files.length-1
			if(have_read_all_files){when_all_loaded_fn(collection)}
			else{read_file({i:i+1,files})}//read next 'til read all
		}
		//Read as data unless has text-like extension
		if(text_extensions.has(file.ext)){
			file_reader.readAsText(file.handle)
		}
		else{
			file_reader.readAsDataURL(file.handle)
		}
	}
	function strip_extension(n){
		return n.substring(0,n.lastIndexOf('.'))
	}
	function get_closest_unused_name(wanted_name){
		let current=wanted_name
		var n=0
		while(taken_base_names.includes(current)){
			n++
			current=wanted_name+' '+n//test name +1
		}
		return current
	}
}
function perlinify(file){
  return perline.from_normal({
    one_indent:el.custom_value_for_one_indent.value,
    max_line_length:el.max_line_width.value,
    string:file.data,
    indent_wrapped_lines:el.indent_wrapped_lines.checked
  })
}
function make_perline_file(original_file){
  return {
    name:original_file.name+'.md',
    date:original_file.date,
    data:perlinify(original_file)
    //path:''
  }
}
function when_all_loaded_fn(files){
	//files[{data,date,ext,handle,name}…]
  if(files.length>1){
  save_blob(
    create_tar_blob(
      files.map(make_perline_file)),
      'Perline files'//unarchived name
    ),
    'Perline files.tar'//tar name
  }
  if(files.length==1){
    let file = files[0]
    download_file({ name:file.name, ext:'md', data:perlinify(file) })
	//here replace previous files stores
	//global.files=files etc
}
}
function create_tar_blob(files, tar_root = '') {
  function base64_to_uint8array(base64) {
    const binary_string = atob(base64.split(',')[1])
    const len = binary_string.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i)
    }
    return bytes
  }
  function date_to_octal(date) {
    return Math.floor(new Date(date).getTime() / 1000).toString(8).padStart(11, '0') + '\0'
  }
  function create_tar_header(filename, file_size, mtime) {
    const encoder = new TextEncoder()
    const header = new Uint8Array(512)
    const name_bytes = encoder.encode(filename)
    header.set(name_bytes.slice(0, 100), 0)
    const size_octal = file_size.toString(8).padStart(11, '0') + '\0'
    header.set(encoder.encode(size_octal), 124)
    header.set(encoder.encode(date_to_octal(mtime)), 136)
    header.set(encoder.encode('0000777\0'), 100)
    header.set(encoder.encode('0000000\0'), 108)
    header.set(encoder.encode('0000000\0'), 116)
    header.set(encoder.encode('ustar  \0'), 257)
    const checksum = header.reduce((sum, byte) => sum + byte, 0) + 256
    header.set(encoder.encode(checksum.toString(8).padStart(6, '0') + '\0 '), 148)
    return header
  }
  const encoder = new TextEncoder()
  let tar_data = []
  for (const { name, data, date, path =''} of files) {
    let file_data = data.startsWith('data:image/') ? base64_to_uint8array(data) : encoder.encode(data)
    const full_path = tar_root ? `${tar_root}/${path}${name}` : `${path}${name}`
    const mtime = date ? new Date(date) : new Date()
    tar_data.push(create_tar_header(full_path, file_data.length, mtime), file_data)
    tar_data.push(new Uint8Array((512 - (file_data.length % 512)) % 512))
  }
  tar_data.push(new Uint8Array(512), new Uint8Array(512))
  return new Blob(tar_data, { type: 'application/x-tar' })
}
function save_blob(blob, filename) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
