//By and Copyright 2022-2024 Greg Abbott. Version YMD 2025_0404
const perline=(()=>{
  function log(...x){console.log(...x);return x}
  const unit_separator='\u001f'//String.fromCharCode(31)
  const temporary_comma=`\u001E`//record_separator
  const temporary_dot=unit_separator
  //Use NBSP here too^
  let glob = {
    one_indent:'  ',
  }
  let touching_lines_regex=
    /([^\n][^]*?)(\n[ \t]*\n+|\n[ \t]*$|$)+/g
    function chain(x, ...l){ return l
      .reduce((a,c)=>Array.isArray(c)?a[c[0]](...c.slice(1)):c(a),x)
      }
  function map(f){return l=>l.map(f)}
  function to_normal({string,one_indent}){
    if(one_indent)glob.one_indent=one_indent//for wanted output
    function process_line(x){
      function is_a_list_item(x){
        return /^[\+\*]+ /.test(x)
        //Excludes DASH bullet, 
        //reserving dash: `- parentheticals -` may start lines
      }
      if(is_a_list_item(x)){
        //ensure the list item starts on a new line
        //don't merge it into the line above
        return `\n${
          x
          .replace(
            /([^ ]+) /,//Get bullet string: `***`
            (all,bullets)=>{
              //convert to N indents followed by one bullet
              return glob.one_indent.repeat(bullets.length-1)+'- '//<- Normal bullet
            }
          )
        } `
      }
      var is_a_header=/^#+ .*/.test(x)
      if(is_a_header){
        //preserve newline before and after header
        return `\n${x}\n`
      }
      return x.trim()+' '//1 space between joined items
    }
    return  match_all_reduce_to_arr({
      string,
      regex:touching_lines_regex,
      fn:([,block])=>{//process block
        return block//block of many lines
          .split('\n')//each line
          .map(process_line)
          .join('')
          //prevent empty line splitting block
            .replaceAll('\n\n','\n')
          .trim()
      }
    })
    .join('\n\n')
    .trim()
  }
  function from_normal({
      max_line_length=64,
      string,
      flag_if_too_long = false,
      indent_wrapped_lines = true,
      one_indent
  }){
   
    //validate max_line_length
    let is_valid_max_line_length=/^\d+$/.test(max_line_length)
    max_line_length = is_valid_max_line_length?parseInt(max_line_length):0
    //min == zero
    max_line_length = max_line_length<1?0:max_line_length
    
    if(one_indent){
      glob.one_indent=one_indent
    }//XXX
    function split_sentence_to_smallest_parts (s){
    return s
    .trim()
    //sentence has no '\n' character
    //so use '\n' as split point delimiter 
    /*
    //Caught earlier
    //split any wrapped unit to its own line 
    .replace(/(\(.*?\))/g,"\n$1\n")
    .replace(/(\{.*?\})/g,"\n$1\n")
    .replace(/(\[\[*[^\[\]]+?\]\]*)/g,"\n$1\n")//[] or [[Wiki]]
    .replace(/(\<.*?\>)/g,"\n$1\n")
    .replace(/( “.*?”)/g,"\n$1\n")//Quotes Double CURLY
    .replace(/( ".*?")/g,"\n$1\n")//Quotes Double Straight
    .replace(/( '.*?')/g,"\n$1\n")//Quote single straight
    .replace(/( ‘.*?’)/g,"\n$1\n")//Quote single curly
    */
    //parenthetical comment
    .replace(/( – .*? – )/g,'$1\n')//dash em
    .replace(/( - .*? - )/g,'$1\n')//dash ascii
    //split before this match
    .replaceAll(` but`,`\nbut`)
    .replaceAll(` and`,`\nand`)
      //↑ beware: conjunctions don't always start units
      // sometimes they form a unit `Mr. and Mrs.`
    //↓ any 'which' not asking a question (with no '?' ending)
    .replace(/( which[^?]+$)/gm,(all,group1)=>`\n ${group1}`)
    .replaceAll(` because `,`\nbecause `)
    .replaceAll(` that `,`\nthat `)
    //split After this match
    .replace(/([:;,] +)/g,'$1\n')
      //↑ NOTE: space follows these symbols
        //this prevents splitting any elements like:
        //time 00:00 | unit separated number 10,000
    //Abbreviations with break points before 
      //note: muted these earlier
      // to avoid treating end '.' or ',' as break point
    .replace(new RegExp(`e\.g${temporary_dot} `,'gi'),`\ne.g. `)
    .replace(new RegExp(`i\.e${temporary_dot} `,'gi'),`\ni.e. `)
    .replace(
      new RegExp(`i\.e\.${temporary_comma} `,'gi'),
      `\ni.e., `
    )
    .replace(
      new RegExp(`e\.g\.${temporary_comma} `,'gi'),
      `\ne.g., `
    )
    //SOME (mid sentence) Prepositions
    /*
    .replace(
      / (with|of|to|by|in|at|from|for|on|as|per|up) /g,
      `\n$1 `
    )
      */
    .split('\n')
    .reduce(
      (a,part)=>{
        part=part.trim()
        if(part.length===0)return a
        a.push(part)
        return a
      },
      [])
    }
    function is_a_header(s){return /^#+ /.test(s)}
    function make_lines_from_parts_cram_max_per_line({start_indented=false}){return parts=>{
      let new_line_template=!indent_wrapped_lines?''
        :glob.one_indent.repeat(start_indented?2:1)
      return parts.reduce((a,part,i)=>{
        let part_must_sit_on_its_own_line=
          //too long to share line with other parts 
          //&& unshrinkable
          part.length>=max_line_length-1||
          //a link
          is_a_link(part)
        if(part_must_sit_on_its_own_line){
          let need_new_line=
            //current line has text content
            a[a.length-1].trim().length!==0
          if(need_new_line){
            //when user wants indents,
              //indent continuation lines
              //(lines that follow the first part)
            a.push(
              i>0?new_line_template
              :start_indented
                  ?glob.one_indent
                  :''
            )
          }
          //make it the current line value
          a[a.length-1]+=part
          //make new line for next item
          a.push(new_line_template)
          return a
        }
        let adding_this_part_wont_exceed_line_length=
            //length of current line 
            //&& length of 1 space between parts
            //&& length of the part
            //all fits within any limit
            a[a.length-1].length+1+part.length<=max_line_length//XXXX
        if(adding_this_part_wont_exceed_line_length){
          let is_first_part_on_line=
            a[a.length-1].trim().length==0
          let starts_with_punctuation=
            !is_first_part_on_line&&//need to eval:
            ['?','!','.',':',';',',','”'].includes(part[0])
            //when a Sentence ends after a bracketed part ()[]{}""'', 
            //the end punctuation will ends up on its own part
              //in that case: don't add a space before it
            let space_before_part=
              is_first_part_on_line||starts_with_punctuation
              ?''
              :' '
            a[a.length-1]+=space_before_part+part
            return a
        }
        else{
            //need new line
            a.push(new_line_template)
            a[a.length-1]+=part
            return a
        }
      },[start_indented
        ?glob.one_indent
        :''])
      .map(x=>x.trimEnd())//keep indentation if wanted
      .join('\n')
    }}
    function swap_indent_bullet_to_n_bullets({
      leading_space='',
      current_block_in_inputs_indent_value
    }){  
      //count indents
      let o = {indent_count : 0}
        const remaining_leading_space =
        current_block_in_inputs_indent_value === "unknown"
            ? ""
            : leading_space.replaceAll(
              current_block_in_inputs_indent_value,
              () => {
                o.indent_count++
                return ""
              })
              .length > 0
        if (remaining_leading_space) {
          o.error=	`the first indent in block equals ` +
              `"${current_block_in_inputs_indent_value}"\n` +
              `This line's indent isn't a multiple of that. ` +
              `It equals "${leading_space}":\n`
        }
      //swap to indent_count to N Bullets
      o.bullets = '*'+'*'.repeat(o.indent_count)
      return o
    }
    function is_a_link (s){return /^\(*http/.test(s)}
    //for accurate width calculations
      //temporary_dot.length must equal 1
      //so the temporary string length remains the same
    function mute_abbreviations (s){
      //Target abbreviations which usually form part of a unit
        //e.g "Dr. No", "Prof. Plum"
      //only match if abbreviation 
      //follows space or starts string
        //vs any that where break points precede or follow
        // ['i.e.','e.g.'] 
      //NOTE: mute the 'i.e.' and 'e.g.' here
        //so that it doesn't treat the end dot as a sentence end
        //a later function finds the muted abbreviations
          //and then places a break point before them
          //so 'e.g.` `the example 1,2,3` stays on one line
      return s.replace(
        /\b(Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|Jr|Sr|St|Ave|Blvd|Rd|Co|Etc|No|P\.S|A\.M|P\.M|e\.g|i\.e)\.(?= |$|\n)/gi,
        (all,x)=>{
          return `${x}${temporary_dot}`
        }
      )
      //e.g and i.e. when followed by comma:
      .replace(/ (e\.g|i\.e)\.\, /gi,` $1.${temporary_comma} `)
    }
    return chain(
      match_all_reduce_to_arr({
      string:mute_abbreviations(string),
      regex:touching_lines_regex,
      fn:([,block])=>{
        glob.current_block_in_inputs_indent_value=false//Reset
        return chain(process_lines_in_block(block),log)//XXX
      }
      }),
      (x)=>x.join('\n\n'),
      unmute_abbreviations
    )
    function unmute_abbreviations(s){
      return s
        .replaceAll(temporary_dot,'.')
        .replaceAll(temporary_comma,',')
    }
    function process_lines_in_block(lines){
      //next: break any line over max width over many lines 
      //where new sub-units of a sentence begin
      //to fit any maximum line width
      return match_all_reduce_to_arr({
        string:lines,
        regex://line matcher
          /([ |\t]*)(.+)(\r\n|\r|\n|$)/g,
        fn:([line,leading_space,line_content,line_end])=>{
          return process_a_line({
            //e.g. list items lines may 
              //touch lines above below
              // AND may have many sentences
            leading_space,
            line:line_content
          })
          .trim()
        }
      })
      .join('\n')
      .replace(/\n{2,}/g,'\n')
      .trimEnd()
    }
    function process_a_line({leading_space='',line}){
      //handle list item (converts indents to bullet per indent)
      let is_first_block_line_with_leading_whitespace =
        !glob.current_block_in_inputs_indent_value&&
        leading_space.length>0
      if(is_first_block_line_with_leading_whitespace){
        //Store this block's value equivalent to one indent
        glob.current_block_in_inputs_indent_value=
          leading_space
      }
      var is_a_list_item = line.match(/^[*|+|-] (.*)/)
      let bullets = ''
      let item_text=false
      if(is_a_list_item){
        item_text=is_a_list_item[1]
        let rv= swap_indent_bullet_to_n_bullets({
          leading_space,
          current_block_in_inputs_indent_value:
            glob.current_block_in_inputs_indent_value
        })
        bullets=rv.bullets
        if(bullets.error){
          console.error(bullets.error,item_text)
          bullets='*'//1
        }
        line= bullets+' '+item_text//`\t\t- LI`-> `*** LI`
      }
      /* Whole line may fit BUT may have many sentences
        must split 1 line per sentence.
        NOT: 'as many whole sentences will fit on a line'
      //handle normal item Whole thing fits
      if(line.length <= max_line_length){
        return line
      }
        */
      //belongs on its own line
      //if(is_a_link(line))return line
      if(is_a_header(line)){
        return line
      }
      if(max_line_length===0){
        //1 full sentence per line no matter its length.
        let rv = chain(
          line,
          split_string_to_sentences({//1 per line
          //but not to parts
          and_parts:false
          })
        )
        .join('\n')
        
        return rv
      }
      let rv = chain(
        line,
        split_string_to_sentences({and_parts:true}),
        map(process_sentence_parts)
        //log
      ).join('\n')
      return rv
    }
    function process_sentence_parts(sentence){
        //Whole sentence fits within max width DONE
        if(sentence.full.length<=max_line_length){
          return sentence.full
        }
        //Sentence exceeds max line width
        //must evaluate its parts to break sentence over lines
          //parts == main parts already collected
            //e.g. [`pre quote`,`"quote text"`,`post quote`]
        function new_line(part_i){
          return indent_wrapped_lines
           &&part_i>0
           ?glob.one_indent
           :''
        }
        return sentence.parts.reduce((lines,part_string,part_i)=>{
          //part content and current line content fit limit
          if(
            (
              //current line, length
              lines[lines.length-1]?.length+
              1//space
              +part_string.length
            )<=max_line_length){
              //concat
              lines[lines.length-1]+=' '+part_string
              return lines 
          }
          //part will fit on its own line
          if(part_string.length<=max_line_length) {
            lines.push(new_line(part_i)+part_string)
            return lines
          }
          // part exceeds max width, needs to split to lines
          else{
            let indent = new_line(part_i)
            let subparts_string = chain(
              part_string,
              split_sentence_to_smallest_parts,
              make_lines_from_parts_cram_max_per_line
              ({start_indented:indent}),
            )
            //could extend lastLine of prev part
              // with first line of current part
              //IF it would all fit max_line_length
              //BUT choosing not to
            //instead, keeping start of this part on new line
           // console.log({part_i,subparts_string})
            lines.push(subparts_string)
            //AND
            //to avoid any next part start merging with this
            //make new slot for next
            //lines.push('')
          }
          return lines
        },
        [//lines
          ``//first line
        ])
        .join('\n')
      }
  }
  function match_all_reduce_to_arr({string,regex,fn}){
    let acc=[]
    for (let match of string.matchAll(regex)){
      acc.push(fn(match))
    }
    return acc
  }
  const split_string_to_sentences=({and_parts=false}={})=>text=>{
    // 2024-11-25 Split string to sentence
      //AND allow any sentence to contain instances of wrapped sub-content
        // i.e. text inside of pairs: (){}[]<> “”‘’ "" ''
          // which may contain end punctuation: .!?
        // Example sentence 
          // `The title "Never!" has an exclamation point.` 
        // Treat above example as 1 sentence with 3 parts
      // 2 FNs herein,
      //1 just get array of sentences based on above style
        // suitable (for no max line width)
      //2 get sentences and parts e.g Normal WrappedPart Normal etc.
        //to serve as initial split points for sentence > max width
      const wrap_pairs = new Map([
          ["(", ")"],["[", "]"],["{", "}"],["<", ">"],
          ['"', '"'],["'", "'"],["“", "”"],["‘", "’"],
        ])
      let punctuation = ['.','!','?',':',';',',']
      const isOpeningChar = ch => wrap_pairs.has(ch)
        const isClosingChar = ch => [...wrap_pairs.values()].includes(ch)
        const getClosingChar = openChar => wrap_pairs.get(openChar)
        function isValidOpeningPosition (i, text, nextChar){
          //wrapped content e.g. (){}<>[]‘’ 
        //can start
          return (i === 0 ||//a string 
            text[i - 1] === " "//after space
           ||text[i - 1] === "\n" //after newline
           ||text[i - 1] === "\t"//after tab
          ) &&
            //always preceed another character (eg `"hi` not `" hi`)
          nextChar &&
            //that isn't a space 
              //allows sentence to hold for example a less than symbol
            //without it opening a parenthetical
          nextChar !== " "&&
          nextChar !== ","
        }
      return and_parts
        ?split_to_sentences_and_parts(text)
        :split_to_sentences_basic(text)
    function split_to_sentences_basic(text){
      console.log('234')//XXX
        let sentences = []
        let currentSentence = ""
        let stack = []
        let i = -1
        const addSentence = () => {
          let trimmed = currentSentence.trim()
          if (trimmed) {sentences.push(trimmed)}
          currentSentence = ""
        }
        let t = {}
        while (i < text.length-1) { i++
          t.char = text[i]
          t.next_char = text[i + 1]
          t.opener=isOpeningChar(t.char) && isValidOpeningPosition(i, text, t.next_char)
          t.closer = isClosingChar(t.char) && t.char === stack[stack.length - 1]
          t.is_end_punc= [".", "!", "?"].includes(t.char) && 
                (!t.next_char||t.next_char===" "||t.next_char==="\n") &&
            stack.length==0
            // Handle opening wrapped content
          if (t.opener) stack.push(getClosingChar(t.char))
            // Handle closing wrapped content
          else if (t.closer)stack.pop()
          //normal character
          currentSentence += t.char
          if (t.is_end_punc){
            addSentence()
          }
        }
        addSentence()//add any final sentence
        return sentences
    }
    function split_to_sentences_and_parts(text){
        // Parts provide initial places to split a sentence further
        let sentences = []
        let currentSentence = ""
        let currentPart = ""
        let currentParts = []
        let stack = []
        let i = -1
        const addPart = () => {
          if (currentPart.trim()) {
            currentParts.push(currentPart.trim())
          }
          currentPart = ""
        }
        const addSentence = () => {
          let trimmed = currentSentence.trim()
          addPart()
          if (trimmed) {
            sentences.push({
              full: trimmed,
              parts: currentParts,
            })
          }
          currentParts = []
          currentSentence = ""
        }
        let just_ended_wrapped_pair=false
        while (i < text.length-1) {i++
          const char = text[i]
          const nextChar = text[i + 1]
          if (isOpeningChar(char) && isValidOpeningPosition(i, text, nextChar)) {
            just_ended_wrapped_pair=false
             addPart()
            stack.push(getClosingChar(char))
            currentSentence += char
            currentPart += char
          }
          else if (isClosingChar(char) && char === stack[stack.length - 1]) {
            just_ended_wrapped_pair=true
            stack.pop()
            currentSentence += char
            currentPart += char
            addPart()
          }
          else if(punctuation.includes(char)) {
           //let punctuation end wrapped pair
           if(just_ended_wrapped_pair ){
             currentParts[currentParts.length-1]+=char
            just_ended_wrapped_pair=false
           }
            else{currentPart += char}
            currentSentence += char  
            if (//sentence end
                [".", "!", "?"].includes(char)
                &&(!nextChar
                   //handle 3 dots for ellipses (vs proper glyph …)
                //||((char=='.'&&text[i-1]!=='.')&& nextChar === " ")
                   || nextChar === " "
                   || nextChar === "\n")
                &&stack.length === 0
              ) {
              addSentence()
            }
          }
          // Handle all other characters
          else {
            if(char!==' '){
              //the first character after wrapped_pair close character, 
                //other than space or end punctuation, 
             //flips this flag:
              //until then, keep it true,
                //so end punctuation may join end of wrapped_pair
              just_ended_wrapped_pair=false
            }
            currentSentence += char
            currentPart += char
          }
        }
        // Add final sentence if there is one
          addSentence()
        return sentences
      }
    }
  return {
  from_normal:from_normal,
  to_normal:to_normal
  }
})()