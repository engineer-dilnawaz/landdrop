/** What a pasted message turns out to be, for the button that opens it full screen. JSON has its own viewer. */
export type SnippetKind = "curl" | "code" | "markdown";

export interface Snippet {
  kind: SnippetKind;
  /** The text to show: for code in a single fence, what's inside the fence. */
  text: string;
  /** highlight.js's name for the language, when it's known; others are identified by the viewer. */
  language?: string;
  /** The language as people write it ("C#", "HTML"), when it's known. */
  languageName?: string;
  /** The button's words, and the viewer's title. */
  label: string;
  title: string;
}

/** Only this much of a long paste is looked at to tell what it is. */
const SAMPLE_CHARS = 6000;

/** A sign and its weight; with `many`, each line it appears on counts, up to four. */
type Rule = readonly [RegExp, number, many?: boolean];
/** Scores a language from the whole text; for languages that are a pattern across lines. */
type Measure = (text: string, lines: string[]) => number;

interface Language {
  /** The name highlight.js colours it with. */
  id: string;
  /** Languages in one family (JavaScript and TypeScript, C and C++) don't count against each other's lead. */
  family?: string;
  name: string;
  /** Signs that it is this language, each worth its weight when found. */
  rules: Rule[];
  /** Signs that it isn't: they take their weight off. */
  against?: Rule[];
  measure?: Measure;
}

const m = (source: string, flags = "m") => new RegExp(source, flags);

/** How many lines match; a share of the non-empty ones is a strong sign for formats like YAML and CSS. */
const share = (lines: string[], pattern: RegExp) => {
  const filled = lines.filter((line) => line.trim());
  return filled.length ? filled.filter((line) => pattern.test(line)).length / filled.length : 0;
};

/** JavaScript's and TypeScript's shared signs. */
const JS_RULES: Rule[] = [
  [m(String.raw`\b(const|let|var)\s+[\w${"$"}]+\s*(=|;)`), 2],
  [m(String.raw`=>`), 2],
  [m(String.raw`\([\w, {}=]*\)\s*=>`), 3],
  [m(String.raw`^\s*\}\)\s*;?\s*$`), 3],
  [m(String.raw`\b\w+\.(get|post|put|delete|use|listen|send|json|status|on|emit)\(`), 2],
  [m(String.raw`\bfunction\s*[\w${"$"}]*\s*\(`), 3],
  [m(String.raw`console\.(log|error|warn|info|table)\(`), 4],
  [m(String.raw`\brequire\(\s*['"]`), 4],
  [m(String.raw`module\.exports|\bexport\s+(default|const|function|class|async)\b`), 3],
  [m(String.raw`\bimport\s+[\w{},*\s${"$"}]+\s+from\s+['"]`), 4],
  [m(String.raw`\b(document|window|localStorage)\.\w+`), 3],
  [m(String.raw`===|!==`), 3],
  [m(String.raw`\bnew\s+(Promise|Map|Set|Date|Error)\b`), 2],
  [m(String.raw`\.(then|catch|map|filter|reduce|forEach)\(`), 2],
  [m(String.raw`\bawait\s+\w`), 2],
  [m("`[^`]*\\$\\{[^}]+\\}[^`]*`"), 2],
  [m(String.raw`\)\s*\{\s*$`), 1],
];

const LANGUAGES: Language[] = [
  {
    id: "rust",
    name: "Rust",
    rules: [
      [m(String.raw`\bfn\s+\w+\s*(<[^>\n]*>)?\s*\(`), 5],
      [m(String.raw`\blet\s+mut\s+\w+`), 6],
      [m(String.raw`\blet\s+\w+\s*:\s*[&\w<]`), 3],
      [m(String.raw`\bimpl(\s*<[^>\n]*>)?\s+[\w:<>]+(\s+for\s+\w+)?\s*\{`), 5],
      [m(String.raw`\bpub\s+(\(crate\)\s+)?(fn|struct|enum|mod|use|trait|const|static|type)\b`), 5],
      [m(String.raw`\b(println|print|eprintln|format|vec|panic|assert|assert_eq|write|writeln|matches|todo|unimplemented)!\s*[(\[{]`), 6],
      [m(String.raw`\buse\s+(std|crate|super|self|core|alloc)\b(::|;)`), 6],
      [m(String.raw`&mut\s|&self\b|&str\b|&'\w+\s|&\[\w+\]`), 4],
      [m(String.raw`\b(Option|Result|Vec|Box|Rc|Arc|RefCell|HashMap|HashSet|BTreeMap)\s*<`), 3],
      [m(String.raw`#!?\[(derive|cfg|allow|test|tokio::main|macro_use)\b`), 6],
      [m(String.raw`\.(unwrap|expect|unwrap_or|unwrap_or_else|ok_or|clone|iter|into_iter|collect)\(`), 2],
      [m(String.raw`'(static|a|b|_)\b`), 3],
      [m(String.raw`\btrait\s+\w+`), 3],
      [m(String.raw`\bmatch\s+[\w.&*()]+\s*\{`), 3],
      [m(String.raw`\b(Some|None|Ok|Err)\(`), 3],
      [m(String.raw`\?\s*;`), 2],
      [m(String.raw`->\s*[\w&<>\[\]():,\s']+\s*\{`), 2],
      [m(String.raw`::<`), 3],
      [m(String.raw`\b(Vec|String|HashMap|HashSet|Box|Rc|Arc|BTreeMap)::(new|from|with_capacity)\(`), 4],
      [m(String.raw`\benum\s+\w+\s*\{`), 3],
      [m(String.raw`:\s*&?(mut\s+)?(i8|i16|i32|i64|u8|u16|u32|u64|usize|isize|f32|f64|str|String)\b`), 3],
      [m(String.raw`\b[A-Z]\w*::[A-Za-z_]\w*\(`), 2],
      [m(String.raw`\bmod\s+\w+\s*[{;]`), 2],
    ],
    against: [
      [m(String.raw`\bfunction\b|===|\bconsole\.|\bdef\s+\w+\(|^\s*package\s+\w+`), 4],
      [m(String.raw`@import\(\s*"|\b(comptime|orelse)\b`), 8],
    ],
  },
  {
    id: "zig",
    name: "Zig",
    rules: [
      [m(String.raw`@import\(\s*"`), 10],
      [m(String.raw`\b(pub\s+)?fn\s+\w+\s*\([^)]*\)\s*!?[\w.\[\]*?]+\s*\{`), 5],
      [m(String.raw`\b(const|var)\s+\w+\s*:\s*[\w.\[\]*?]+\s*=`), 4],
      [m(String.raw`\bstd\.\w+(\.\w+)*\(`), 3],
      [m(String.raw`\.\{[^}\n]*\}`), 3],
      [m(String.raw`\b(comptime|orelse|errdefer)\b|@as\(|@intCast|\btry\s+\w`), 4],
    ],
    against: [[m(String.raw`->\s*[\w&<>\[\]]+\s*\{|\blet\s+(mut\s+)?\w+|println!`), 5]],
  },
  {
    id: "python",
    name: "Python",
    rules: [
      [m(String.raw`^\s*def\s+\w+\s*\(.*\)\s*(->\s*[^:\n]+)?\s*:\s*$`), 6],
      [m(String.raw`^\s*async\s+def\s+\w+\s*\(`), 5],
      [m(String.raw`^\s*class\s+\w+(\([\w., =]*\))?\s*:\s*$`), 6],
      [m(String.raw`^\s*from\s+[\w.]+\s+import\s+[\w*(]`), 5],
      [m(String.raw`^\s*import\s+[\w.]+(\s+as\s+\w+)?(\s*,\s*[\w.]+)*\s*$`), 3],
      [m(String.raw`^\s*import\s+[\w.]+\s+as\s+\w+\s*$`), 3],
      [m(String.raw`^\s*(elif\s+.+|else|try|finally|except(\s+[\w.(), ]+)?(\s+as\s+\w+)?|with\s+.+|while\s+.+)\s*:\s*$`), 5],
      [m(String.raw`^\s*for\s+[\w, ()]+\s+in\s+.+\s*:\s*$`), 5],
      [m(String.raw`^\s*if\s+.+[^{;]\s*:\s*$`), 3],
      [m(String.raw`\bself\.\w+`), 3],
      [m(String.raw`\b(None|True|False)\b`), 2],
      [m(String.raw`__\w+__`), 4],
      [m(String.raw`\bf["'][^"'\n]*\{[^}\n]+\}`), 3],
      [m(String.raw`^\s*@\w+(\.\w+)*(\(.*\))?\s*$`), 2],
      [m(String.raw`^\s*#!.*python`), 8],
      [m(String.raw`\b(print|len|range|enumerate|isinstance|open)\(`), 1],
      [m(String.raw`\bin\s+range\(`), 3],
      [m(String.raw`\bwith\s+open\(`), 4],
      [m(String.raw`\.(read|readlines|write|append|strip|split|join|items|keys|values)\(`), 1],
      [m(String.raw`\blambda\s+[\w, ]*:`), 3],
      [m(String.raw`\[[^\]\n]+\bfor\s+[\w, ()]+\s+in\s+[^\]\n]+\]|\{[^}\n]+\bfor\s+[\w, ()]+\s+in\s+[^}\n]+\}`), 6],
      [m(String.raw`\b(zip|sorted|sum|enumerate|isinstance|map|filter)\(`), 1],
      [m(String.raw`\brequests\.(get|post|put|delete)\(|\bnp\.|\bpd\.`), 3],
      [m(String.raw`\band\b|\bor\b|\bnot\b`), 1],
      [m(String.raw`^\s*(return|yield|raise|pass|break|continue)\b[^;{]*$`), 1],
    ],
    against: [
      [m(String.raw`[;{]\s*$`), 5],
      [m(String.raw`\bfn\s+\w+|\bfunction\b|\bconst\s+\w+\s*=|\blet\s+\w+\s*=`), 4],
    ],
  },
  {
    id: "javascript",
    name: "JavaScript",
    family: "js",
    rules: JS_RULES,
    against: [
      [m(String.raw`:\s*(string|number|boolean|any|unknown|void)\b|\binterface\s+\w+|\btype\s+\w+\s*=|\breadonly\b`), 2],
      [m(String.raw`\bfn\s+\w+|\blet\s+mut\b|^\s*def\s+\w+\(.*\):`), 5],
    ],
  },
  {
    id: "typescript",
    name: "TypeScript",
    family: "js",
    rules: [
      ...JS_RULES,
      [m(String.raw`(\w|\))\s*:\s*(string|number|boolean|any|unknown|void|never|object|bigint)(\[\])?\s*[,;)=>{|]`), 5],
      [m(String.raw`\binterface\s+\w+(\s+extends\s+[\w, <>]+)?\s*\{`), 6],
      [m(String.raw`\btype\s+\w+(<[^>\n]*>)?\s*=`), 5],
      [m(String.raw`\b(enum|namespace|declare|abstract)\s+\w+`), 3],
      [m(String.raw`\breadonly\s+\w+|\bprivate\s+\w+\s*[:(]|\bpublic\s+\w+\s*[:(]`), 3],
      [m(String.raw`\bimport\s+type\b|\bexport\s+type\b`), 6],
      [m(String.raw`\bas\s+(const|string|number|any|unknown)\b|<[A-Z]\w*(\[\])?>\(`), 2],
      [m(String.raw`\b(Promise|Array|Record|Partial|Omit|Pick)\s*<`), 3],
    ],
    against: [[m(String.raw`\bfn\s+\w+|\blet\s+mut\b|^\s*def\s+\w+\(.*\):`), 5]],
  },
  {
    id: "xml",
    name: "HTML",
    family: "xml",
    rules: [
      [m(String.raw`^\s*<!doctype\s+html`, "mi"), 9],
      [m(String.raw`<(html|head|body|div|span|section|article|nav|header|footer|main|aside|ul|ol|li|table|thead|tbody|tr|td|th|form|input|button|label|select|textarea|img|a|p|h[1-6]|script|style|link|meta|svg|canvas|video|audio|iframe|pre|code|strong|em|br|hr)(\s[^<>]*)?\/?>`, "i"), 5],
      [m(String.raw`<(script|style)(\s[^>]*)?>[\s\S]*?</\1>`, "i"), 7],
      [m(String.raw`</\w+>`), 2],
      [m(String.raw`\s(class|id|href|src|alt|style|type|rel|name|value|placeholder|onclick|data-[\w-]+|aria-[\w-]+)=["'][^"'\n]*["']`), 3],
      [m(String.raw`^\s*<[\w-]+(\s[^<>]*)?>\s*$`), 1],
    ],
    against: [[m(String.raw`^\s*(SELECT|INSERT INTO|CREATE TABLE)\b`), 3]],
  },
  {
    id: "xml",
    name: "XML",
    family: "xml",
    rules: [
      [m(String.raw`^\s*<\?xml\b`), 10],
      [m(String.raw`<\w+:\w+[\s>/]`), 3],
      [m(String.raw`<(\w[\w.-]*)(\s[\w:.-]+=["'][^"']*["'])*\s*>[\s\S]*</\1>`), 3],
      [m(String.raw`xmlns(:\w+)?=`), 5],
    ],
    against: [[m(String.raw`<(html|head|body|div|span|p|a|ul|li|script|style)[\s>]`, "i"), 6]],
  },
  {
    id: "sql",
    name: "SQL",
    rules: [
      [m(String.raw`^\s*SELECT\s+[\s\S]*?\bFROM\s+[\w."]+`, "m"), 6],
      [m(String.raw`^\s*select\s+(\*|[\w."]+(\.[\w*]+)?(\s*,\s*[\w."*]+(\.[\w*]+)?)*(\s+as\s+\w+)?)\s*$[\s\S]*?^\s*from\s+[\w."]+`, "m"), 6],
      [m(String.raw`^\s*select\s+(\*|\w+\s*,[\w\s,.*]+)\s+from\s+[\w."]+`, "m"), 6],
      [m(String.raw`^\s*INSERT\s+INTO\s+[\w."]+\s*(\(|VALUES\b|SELECT\b|$)`, "mi"), 8],
      [m(String.raw`^\s*CREATE\s+(OR\s+REPLACE\s+)?(TABLE|INDEX|VIEW|DATABASE|SCHEMA|FUNCTION|TRIGGER)\s+\w`, "mi"), 8],
      [m(String.raw`^\s*UPDATE\s+[\w."]+\s+SET\s+[\w."]+\s*=`, "mi"), 8],
      [m(String.raw`^\s*DELETE\s+FROM\s+[\w."]+\s*(WHERE\b[^\n]*)?;?\s*$`, "mi"), 8],
      [m(String.raw`^\s*(ALTER|DROP|TRUNCATE)\s+TABLE\b`, "mi"), 8],
      [m(String.raw`^\s*(WHERE|AND|OR)\s+[\w."]+\s*(=|<|>|<=|>=|<>|!=|\bIN\b|\bLIKE\b|\bIS\b|\bBETWEEN\b)`, "mi"), 3],
      [m(String.raw`^\s*(LEFT\s+|RIGHT\s+|INNER\s+|OUTER\s+|CROSS\s+)?JOIN\s+[\w."]+`), 4],
      [m(String.raw`^\s*(GROUP|ORDER)\s+BY\b`), 4],
      [m(String.raw`^\s*(group|order)\s+by\s+[\w.]+(\s*,\s*[\w.]+)*(\s+(asc|desc))?\s*;?\s*$`), 3],
      [m(String.raw`\b(VARCHAR|INTEGER|BIGINT|TIMESTAMP|BOOLEAN|PRIMARY\s+KEY|NOT\s+NULL|REFERENCES|AUTO_INCREMENT)\b`), 3],
      [m(String.raw`^\s*(LIMIT|OFFSET|HAVING|UNION|VALUES)\b`), 2],
    ],
    against: [[m(String.raw`</?\w+[^>]*>|\bfunction\b|\bconst\b`), 6]],
  },
  {
    id: "go",
    name: "Go",
    rules: [
      [m(String.raw`^\s*package\s+\w+\s*$`), 6],
      [m(String.raw`\bfunc\s+(\(\w+\s+\*?\w+\)\s*)?\w+\s*\(`), 6],
      [m(String.raw`\w+\s*:=\s*\S`), 4],
      [m(String.raw`^\s*import\s*\(\s*$|^\s*import\s+"[\w./-]+"`), 5],
      [m(String.raw`\b(fmt|http|json|os|log|strings|errors|time|sync|context)\.\w+\(`), 4],
      [m(String.raw`if\s+err\s*!=\s*nil`), 8],
      [m(String.raw`\btype\s+\w+\s+(struct|interface)\s*\{`), 6],
      [m(String.raw`\b(go\s+func|defer\s+\w|make\(\s*(chan|\[\]|map)|<-\s*\w|\bchan\s+\w)`), 4],
      [m(String.raw`\[\]\w+\{`), 2],
      [m(String.raw`\bfor\s+\w+(,\s*\w+)?\s*:=\s*range\b`), 6],
    ],
    against: [[m(String.raw`\bfn\s+\w+|\bfunction\b|\bdef\s+\w+`), 5]],
  },
  {
    id: "java",
    name: "Java",
    rules: [
      [m(String.raw`\bpublic\s+static\s+void\s+main\b`), 9],
      [m(String.raw`System\.(out|err)\.print`), 7],
      [m(String.raw`\b(public|private|protected)\s+(abstract\s+|final\s+)?(class|interface|enum)\s+\w+`), 5],
      [m(String.raw`^\s*import\s+(java|javax|org|com|jakarta)\.[\w.*]+;`), 7],
      [m(String.raw`^\s*package\s+[\w.]+;`), 5],
      [m(String.raw`@(Override|Autowired|Service|Component|RestController|GetMapping|PostMapping|Entity|Test)\b`), 4],
      [m(String.raw`\b(private|protected|public)\s+(static\s+)?(final\s+)?[\w<>\[\],? ]+\s+\w+\s*(=|;|\()`), 3],
      [m(String.raw`\b(List|ArrayList|Map|HashMap|Set|Optional)<[\w, <>?]+>\s+\w+\s*=`), 3],
      [m(String.raw`\bnew\s+[A-Z]\w*(<[^>]*>)?\(`), 2],
      [m(String.raw`\bthrows\s+\w+`), 4],
    ],
    against: [[m(String.raw`\bfn\s+\w+|\bfunction\b|\bdef\s+\w+`), 5]],
  },
  {
    id: "csharp",
    name: "C#",
    rules: [
      [m(String.raw`^\s*using\s+System(\.[\w.]+)?;`), 8],
      [m(String.raw`^\s*namespace\s+[\w.]+\s*(\{|;)?\s*$`), 5],
      [m(String.raw`Console\.(Write|WriteLine|ReadLine)\(`), 7],
      [m(String.raw`\{\s*get;\s*(set;|init;|private set;)?\s*\}`), 7],
      [m(String.raw`\b(public|private|internal|protected)\s+(static\s+)?(async\s+)?(Task(<[\w<>]+>)?|void|string|int|bool|var)\s+\w+\s*\(`), 4],
      [m(String.raw`\bforeach\s*\(\s*var\b`), 5],
      [m(String.raw`\b(string|int|bool|double|decimal)\[\]\s+\w+|\bList<\w+>\s+\w+\s*=\s*new\b`), 3],
      [m(String.raw`\[(HttpGet|HttpPost|ApiController|Route|Serializable|Fact|Test)\b`), 6],
      [m(String.raw`\bawait\s+\w+\.\w+Async\(`), 4],
      [m(String.raw`=>\s*\w+\.\w+\(`), 1],
    ],
    against: [[m(String.raw`\bfn\s+\w+|\bfunction\b|\bdef\s+\w+`), 5]],
  },
  {
    id: "cpp",
    name: "C++",
    family: "c",
    rules: [
      [m(String.raw`^\s*#include\s*<(iostream|vector|string|map|set|memory|algorithm|fstream|sstream|queue|unordered_map|thread|cstdio|cstdlib)>`), 8],
      [m(String.raw`\bstd::\w+`), 6],
      [m(String.raw`\b(cout|cin|cerr)\s*(<<|>>)`), 7],
      [m(String.raw`\btemplate\s*<[^>]*>`), 6],
      [m(String.raw`\b(nullptr|constexpr|noexcept|auto&?&?\s+\w+\s*=|override|virtual\s+\w+)\b`), 4],
      [m(String.raw`^\s*(class|struct)\s+\w+(\s*:\s*(public|private|protected)\s+\w+)?\s*\{`), 4],
      [m(String.raw`\b(public|private|protected)\s*:\s*$`), 4],
      [m(String.raw`\busing\s+namespace\s+\w+\s*;`), 6],
      [m(String.raw`\bnew\s+\w+(<[^>]*>)?\s*[(\[]|\bdelete(\[\])?\s+\w+`), 2],
      [m(String.raw`\w+::\w+\s*\(`), 3],
    ],
  },
  {
    id: "c",
    name: "C",
    family: "c",
    rules: [
      [m(String.raw`^\s*#include\s*<(stdio|stdlib|string|math|stdint|stdbool|unistd|ctype|time|errno|signal|pthread)\.h>`), 8],
      [m(String.raw`^\s*#include\s*"[\w./-]+\.h"`), 5],
      [m(String.raw`\b(int|void)\s+main\s*\(`), 6],
      [m(String.raw`\b(printf|scanf|fprintf|sprintf|snprintf|puts|fgets|fopen|fclose)\s*\(`), 5],
      [m(String.raw`\b(malloc|calloc|realloc|free|sizeof|memcpy|memset|strlen|strcmp)\s*\(`), 4],
      [m(String.raw`^\s*#(define|ifdef|ifndef|endif|pragma)\b`), 4],
      [m(String.raw`\b(typedef\s+(struct|enum)|struct\s+\w+\s*\*|\w+\s*\*\s*\w+\s*=)`), 3],
      [m(String.raw`\b(unsigned|char|uint\d+_t|size_t)\s+\*?\w+`), 2],
    ],
    against: [[m(String.raw`\bstd::|\b(cout|cin)\b|\bclass\s+\w+|\btemplate\s*<`), 6]],
  },
  {
    id: "php",
    name: "PHP",
    rules: [
      [m(String.raw`<\?php\b|<\?=`), 12],
      [m(String.raw`\$\w+\s*(=|->|\[|;|\))`), 3],
      [m(String.raw`\b(echo|print)\s+["'$]`), 3],
      [m(String.raw`\b(namespace|use)\s+[\w\\]+\\\w+;`), 5],
      [m(String.raw`\bfunction\s+\w+\s*\(.*\$\w+`), 5],
      [m(String.raw`\barray\s*\(|=>\s*['"$\d]`), 2],
      [m(String.raw`\$this->|::class\b|\bself::|\bstatic::`), 4],
      [m(String.raw`\b(public|private|protected)\s+(static\s+)?(function|\$\w+)`), 3],
    ],
  },
  {
    id: "ruby",
    name: "Ruby",
    rules: [
      [m(String.raw`^\s*def\s+\w+[?!=]?(\([^)]*\))?\s*$`), 5],
      [m(String.raw`^\s*end\s*$`), 4],
      [m(String.raw`\bputs\s+["'\w]`), 4],
      [m(String.raw`\bdo\s*(\|[\w, ]+\|)?\s*$`), 4],
      [m(String.raw`\battr_(accessor|reader|writer)\b`), 6],
      [m(String.raw`^\s*(class|module)\s+[A-Z]\w*(\s*<\s*[\w:]+)?\s*$`), 5],
      [m(String.raw`\brequire(_relative)?\s+['"]`), 4],
      [m(String.raw`:\w+\s*=>|\w+:\s+:\w+|\bnil\b`), 2],
      [m(String.raw`@\w+\s*=|\b(unless|elsif)\b`), 3],
      [m(String.raw`\.each(_with_index)?\s+do\b|\.map\s*\{\s*\|`), 5],
      [m(String.raw`#\{[^}]+\}`), 3],
    ],
    against: [
      [m(String.raw`[;{]\s*$`), 3],
      [m(String.raw`\blocal\s+(function\s+)?\w+|\{:(ok|error)\b|\|>\s*\w|\bIO\.\w+|\bdefmodule\b`), 6],
      [m(String.raw`@\w+\s*:\s*[A-Z]\w*|\(\s*\w+\s*:\s*[A-Z]\w*\s*\)|\bdef\s+\w+\([^)]*\w\s*:\s*[A-Z]`), 16],
    ],
  },
  {
    id: "swift",
    name: "Swift",
    rules: [
      [m(String.raw`^\s*import\s+(UIKit|SwiftUI|Foundation|Combine|AppKit)\b`), 9],
      [m(String.raw`\b(guard|if)\s+let\s+\w+`), 6],
      [m(String.raw`\bvar\s+body\s*:\s*some\s+View`), 10],
      [m(String.raw`\bfunc\s+\w+\s*(<[^>]*>)?\s*\([^)]*\)\s*(throws\s*)?(->\s*[\w<>?\[\]]+\s*)?\{`), 5],
      [m(String.raw`@(State|Binding|Published|ObservedObject|StateObject|EnvironmentObject|objc|IBOutlet|main)\b`), 6],
      [m(String.raw`\b(struct|class|enum|protocol|extension)\s+\w+\s*(:\s*[\w, ]+)?\s*\{`), 3],
      [m(String.raw`\b(let|var)\s+\w+\s*:\s*[\w<>?\[\]]+\s*=`), 3],
      [m(String.raw`\bprint\(`), 1],
      [m(String.raw`\b(nil|self\.\w+|\.init\()`), 1],
      [m(String.raw`"[^"\n]*\\\([^)\n]+\)[^"\n]*"`), 5],
      [m(String.raw`\b(let|var)\s+\w+\s*:\s*(Int|String|Double|Bool|Float|\[\w+\]|\w+\?)`), 3],
    ],
    against: [[m(String.raw`\bfn\s+\w+|\bfunction\b|\bdef\s+\w+`), 4]],
  },
  {
    id: "kotlin",
    name: "Kotlin",
    rules: [
      [m(String.raw`\bfun\s+(<[^>]*>\s*)?[\w.]+\s*\(`), 6],
      [m(String.raw`\b(val|var)\s+\w+(\s*:\s*[\w<>?]+)?\s*=`), 3],
      [m(String.raw`\bdata\s+class\b|\bsealed\s+(class|interface)\b|\bcompanion\s+object\b|\blateinit\b`), 7],
      [m(String.raw`^\s*import\s+(android|androidx|kotlin|kotlinx)\.`), 7],
      [m(String.raw`\bwhen\s*(\(.*\))?\s*\{`), 4],
      [m(String.raw`\bprintln\(`), 2],
      [m(String.raw`\?\.\w+|\?:\s|!!\.`), 3],
      [m(String.raw`\b(override\s+fun|suspend\s+fun)\b`), 5],
    ],
    against: [[m(String.raw`\bfn\s+\w+|\bfunction\b|\bdef\s+\w+|;\s*$`), 3]],
  },
  {
    id: "bash",
    name: "Shell",
    rules: [
      [m(String.raw`^#!\s*/(usr/)?bin/(env\s+)?(ba|z|da)?sh\b`), 10],
      [m(String.raw`^\s*(\$\s+)?(sudo\s+\S|apt(-get)?\s+(install|update|upgrade|remove)|brew\s+(install|update|upgrade)|npm\s+(install|i|run|start|test|init|publish|ci)\b|npx\s+\S|yarn(\s+(add|install|dev|build))?\s*|pnpm\s+(add|install|run|dev)|pip3?\s+install|git\s+(clone|pull|push|commit|add|checkout|status|log|diff|merge|rebase|fetch|init|branch|stash|reset)\b|docker(-compose)?\s+(run|build|compose|ps|pull|push|exec|up|down)\b|kubectl\s+\S|ssh\s+\S|scp\s+\S|chmod\s+\S|chown\s+\S|mkdir\s+(-p\s+)?\S|export\s+\w+=|source\s+\S|cd\s+[~./]\S*)`), 4, true],
      [m(String.raw`^\s*\$\s+\w+`), 2],
      [m(String.raw`^\s*if\s+\[\[?\s.*\]\]?\s*;?\s*(then)?\s*$`), 6],
      [m(String.raw`^\s*(fi|done|esac|then|do)\s*$|\bthen\s*$`), 4],
      [m(String.raw`\$\{?[A-Za-z_]\w*\}?|\$\(.*\)`), 2],
      [m(String.raw`\|\s*(grep|awk|sed|xargs|sort|uniq|head|tail|wc|tee)\b`), 4],
      [m(String.raw`^\s*(echo|printf)\s+["'$\w]`), 3],
      [m(String.raw`^\s*for\s+\w+\s+in\s+.*;\s*do\b|^\s*while\s+.*;\s*do\b`), 6],
      [m(String.raw`\s(>|>>|2>&1)\s*[\w/.&-]`), 2],
    ],
    against: [[m(String.raw`\bfn\s+\w+|\bfunction\s*\(|\bdef\s+\w+|=>|;\s*$`), 3]],
  },
  {
    id: "powershell",
    name: "PowerShell",
    rules: [
      [m(String.raw`\b(Get|Set|New|Remove|Write|Invoke|Import|Export|Start|Stop|Test|Add|Out|Select|Where|ForEach|Sort)-[A-Z]\w+`), 6],
      [m(String.raw`\bWrite-(Host|Output|Error)\b`), 4],
      [m(String.raw`\|\s*(Where|ForEach|Select|Sort|Group|Measure|Out)-\w+`), 5],
      [m(String.raw`\[(string|int|bool|switch|datetime|array)\]\s*\$\w+`), 4],
      [m(String.raw`\$_\b|\$PSScriptRoot|\$env:\w+|\$PSVersionTable`), 4],
      [m(String.raw`^\s*param\s*\(`), 5],
      [m(String.raw`^\s*function\s+[\w-]+\s*(\(.*\))?\s*\{`), 3],
    ],
    against: [[m(String.raw`<\?php|\$this->|\bfn\s+\w+|\bdef\s+\w+`), 6]],
  },
  {
    id: "dart",
    name: "Dart",
    rules: [
      [m(String.raw`^\s*import\s+'(package|dart):[\w/.]+'`), 9],
      [m(String.raw`\b(StatelessWidget|StatefulWidget|BuildContext|MaterialApp|Scaffold|Widget\s+build|setState)\b`), 7],
      [m(String.raw`\bvoid\s+main\s*\(\s*(List<String>\s+\w+)?\s*\)`), 3],
      [m(String.raw`\b(Future|Stream)<[\w<>?]+>`), 4],
      [m(String.raw`\b(final|const)\s+\w+(<[\w<>?, ]+>)?\s+\w+\s*=|\blate\s+\w+`), 3],
      [m(String.raw`\b(String|int|double|bool)\?\s+\w+`), 3],
      [m(String.raw`@override\b`), 1],
      [m(String.raw`\b(Future|Stream)<[\w<>?, ]+>\s+\w+\s*\(.*\)\s*async\b`), 7],
      [m(String.raw`\b(final|const)\s+\w+\s*=\s`), 2],
      [m(String.raw`\bUri\.parse\(|\bprint\(\s*'|\$\{?\w+\}?'`), 2],
    ],
    against: [[m(String.raw`\bfn\s+\w+|\bdef\s+\w+|\bfunction\b`), 5]],
  },
  {
    id: "scala",
    name: "Scala",
    rules: [
      [m(String.raw`\bobject\s+\w+\s+extends\s+App\b`), 9],
      [m(String.raw`^\s*import\s+(scala|akka|cats|zio)\.`), 8],
      [m(String.raw`\bdef\s+\w+\s*(\[[^\]]*\])?\s*(\([^)]*\))*\s*(:\s*[\w\[\], ]+)?\s*=\s*`), 6],
      [m(String.raw`\bcase\s+class\b|\bsealed\s+trait\b|\bimplicit\s+(val|def|class)\b`), 8],
      [m(String.raw`\b(val|var)\s+\w+\s*(:\s*[\w\[\], ]+)?\s*=`), 2],
      [m(String.raw`\bmatch\s*\{|\bcase\s+[\w(]+.*=>`), 4],
      [m(String.raw`\b(Option|Seq|List|Map|Future)\[\w+`), 3],
      [m(String.raw`\.(foreach|map|flatMap|filter)\s*\{\s*\w*\s*(=>|case)`), 3],
    ],
    against: [[m(String.raw`\bfun\s+\w+|\bfn\s+\w+|\bdef\s+\w+\(.*\)\s*:\s*$|\bfunction\b`), 5]],
  },
  {
    id: "haskell",
    name: "Haskell",
    rules: [
      [m(String.raw`^\s*module\s+[A-Z][\w.]*(\s*\(.*\))?\s+where\b`), 9],
      [m(String.raw`^\s*[a-z]\w*'?\s*::\s*.+`), 6],
      [m(String.raw`^\s*import\s+(qualified\s+)?[A-Z][\w.]*(\s+(as|hiding)\b.*)?\s*$`), 4],
      [m(String.raw`^\s*(data|newtype|type|class|instance)\s+[A-Z]\w*`), 5],
      [m(String.raw`^\s*\w+\s+.*=\s*do\s*$|\bwhere\s*$|<-\s*\w`), 3],
      [m(String.raw`->\s*[A-Z\[(]\w*|\bIO\s*\(\)|\bMaybe\b|\bEither\b`), 3],
      [m(String.raw`^\s*\|\s+\w+.*=`), 3],
    ],
    against: [[m(String.raw`[;{]\s*$|\bfunction\b|\bdef\s+\w+`), 4]],
  },
  {
    id: "elixir",
    name: "Elixir",
    rules: [
      [m(String.raw`^\s*defmodule\s+[\w.]+\s+do\b`), 10],
      [m(String.raw`^\s*defp?\s+\w+[?!]?(\(.*\))?(\s+when\s+.+)?\s+do\b`), 7],
      [m(String.raw`\|>\s*\w`), 5],
      [m(String.raw`\bIO\.(puts|inspect)\b|\bEnum\.\w+|\bString\.\w+\(`), 5],
      [m(String.raw`\{:(ok|error)\b`), 5],
      [m(String.raw`\{:\w+\b`), 2],
      [m(String.raw`^\s*(case|cond|with|if|unless)\s+.+\s+do\s*$`), 3],
      [m(String.raw`@(moduledoc|doc|spec|impl)\b`), 4],
      [m(String.raw`\bfn\s+.*->`), 3],
    ],
    against: [[m(String.raw`[;{]\s*$|\bfunction\b`), 4]],
  },
  {
    id: "objectivec",
    name: "Objective-C",
    rules: [
      [m(String.raw`^\s*#import\s*[<"]`), 8],
      [m(String.raw`@(interface|implementation|end|property|selector|protocol|synthesize)\b`), 8],
      [m(String.raw`\b(NSString|NSArray|NSDictionary|NSLog|NSObject|NSNumber|UIView|UIViewController)\b`), 6],
      [m(String.raw`^\s*[-+]\s*\(\w[\w *<>]*\)\s*\w+`), 5],
      [m(String.raw`\[\s*\[?\w+\s+\w+(:[^\]]*)?\]`), 3],
      [m(String.raw`@"[^"\n]*"`), 3],
    ],
  },
  {
    id: "perl",
    name: "Perl",
    rules: [
      [m(String.raw`^#!.*\bperl\b`), 10],
      [m(String.raw`^\s*use\s+(strict|warnings|utf8|feature|lib|parent|base)\b`), 7],
      [m(String.raw`\bmy\s+[\$@%]\w+`), 5],
      [m(String.raw`^\s*sub\s+\w+\s*\{`), 6],
      [m(String.raw`=~|!~\s*(m|s|tr)?/`), 4],
      [m(String.raw`\b(foreach|elsif|unless)\b|\$_\b|@ARGV|\$ENV\{`), 3],
      [m(String.raw`->\{|->\[|\bprint\s+["'\$]`), 2],
    ],
    against: [[m(String.raw`\bfn\s+\w+|\bfunction\b|\bdef\s+\w+`), 4]],
  },
  {
    id: "r",
    name: "R",
    rules: [
      [m(String.raw`\blibrary\(\s*\w+\s*\)|\brequire\(\s*\w+\s*\)`), 6],
      [m(String.raw`^\s*[\w.]+\s*<-\s*\S`), 5],
      [m(String.raw`\b(data\.frame|ggplot|tibble|filter|mutate|summarise|read\.csv)\s*\(|%>%|\|>\s*\w+\(`), 5],
      [m(String.raw`\b(TRUE|FALSE|NULL|NA)\b`), 2],
      [m(String.raw`\bfunction\s*\(.*\)\s*\{`), 1],
      [m(String.raw`\bc\(\s*[\w"']`), 2],
    ],
    against: [[m(String.raw`[;]\s*$|\bconst\b|=>|\bfn\s+\w+`), 4]],
  },
  {
    id: "matlab",
    name: "MATLAB",
    rules: [
      [m(String.raw`^\s*function\s+(\[?[\w, ]+\]?\s*=\s*)?\w+\s*\(`), 5],
      [m(String.raw`\b(zeros|ones|eye|linspace|meshgrid|plot|figure|disp|fprintf|numel|size|rand|randn|xlabel|ylabel|title)\s*\(`), 4],
      [m(String.raw`^\s*%.*$`), 3],
      [m(String.raw`\.\*|\.\^|\./`), 3],
      [m(String.raw`\b(clear\s+all|clc|close\s+all|hold\s+on)\b`), 6],
      [m(String.raw`\w+\s*=\s*\[[\d\s.,;:-]+\]\s*;?`), 3],
    ],
    against: [[m(String.raw`[{]\s*$|\bconst\b|=>|\bdef\s+\w+`), 4]],
  },
  {
    id: "groovy",
    name: "Groovy",
    rules: [
      [m(String.raw`^\s*pipeline\s*\{`), 6],
      [m(String.raw`\bstage\s*\(\s*['"]`), 5],
      [m(String.raw`\bsteps\s*\{|\bstages\s*\{`), 3],
      [m(String.raw`\bagent\s+(any|none|\{)`), 3],
      [m(String.raw`\b(sh|bat|echo)\s+['"]`), 2],
      [m(String.raw`\bdef\s+\w+\s*(=|\()`), 3],
      [m(String.raw`\bprintln\s+["'\w]`), 3],
      [m(String.raw`\.each\s*\{\s*\w+\s*->`), 4],
      [m(String.raw`@(Grab|CompileStatic|TypeChecked)\b|\bapply\s+plugin:|\bdependencies\s*\{`), 6],
    ],
    against: [[m(String.raw`\bfn\s+\w+|\bfun\s+\w+|\bfunction\b`), 4]],
  },
  {
    id: "vbnet",
    name: "VB.NET",
    rules: [
      [m(String.raw`^\s*(Imports|Module|Namespace)\s+[\w.]+\s*$`), 6],
      [m(String.raw`^\s*(Public|Private|Protected|Friend)?\s*(Shared\s+)?(Sub|Function)\s+\w+\s*\(`), 6],
      [m(String.raw`^\s*End\s+(Sub|Function|If|Class|Module|Namespace|While|Select)\b`), 7],
      [m(String.raw`^\s*Dim\s+\w+(\s+As\s+\w+)?`), 6],
      [m(String.raw`\bThen\s*$|^\s*Next\b|\bAs\s+(String|Integer|Boolean|Double|New)\b`), 4],
    ],
  },
  {
    id: "makefile",
    name: "Makefile",
    rules: [
      [m(String.raw`^\.PHONY\b`), 9],
      [m(String.raw`^[\w./%-]+\s*:(?!=)[^=\n]*$[\s\S]*?^\t\S`), 6],
      [m(String.raw`\$\(\w+\)|\$@|\$<|\$\^`), 3],
      [m(String.raw`^[A-Z_]+\s*[:?+]?=\s*\S`), 2],
    ],
    against: [[m(String.raw`\bfunction\b|\bdef\s+\w+|\bconst\b`), 4]],
  },
  {
    id: "css",
    name: "CSS",
    family: "css",
    rules: [
      [m(String.raw`@(media|import|keyframes|font-face|charset|supports|layer|tailwind|apply)\b`), 6],
      [m(String.raw`^\s*[.#:\[]?[\w-][\w\s.#:>+~,*\[\]="'()-]*\{\s*$`), 3],
      [m(String.raw`^\s*[\w-]+\s*:\s*[^;{}\n]+;\s*$`), 2],
      [m(String.raw`:\s*(flex|grid|block|none|auto|center|relative|absolute|inherit|solid|transparent|bold|\d+(px|rem|em|%|vh|vw))\b`), 3],
      [m(String.raw`#[0-9a-fA-F]{3,8}\b|rgba?\(|var\(--`), 2],
      [m(String.raw`^\s*\}\s*$`), 1],
    ],
    against: [[m(String.raw`\bfunction\b|\bconst\b|\bdef\s+\w+|\bfn\s+\w+|=>`), 5]],
    measure: (_text, lines) => (share(lines, /^\s*([.#:\[]?[\w-][^:;]*\{|[\w-]+\s*:\s*[^;]+;|\})\s*$/) >= 0.7 ? 6 : 0),
  },
  {
    id: "scss",
    name: "SCSS",
    family: "css",
    rules: [
      [m(String.raw`@(mixin|include|extend|use|forward|function|each|if|else|return)\b`), 7],
      [m(String.raw`^\s*\$[\w-]+\s*:\s*[^;]+;`), 6],
      [m(String.raw`^\s*&[:.\w-]*\s*\{`), 5],
      [m(String.raw`#\{\$[\w-]+\}`), 6],
    ],
  },
  {
    id: "yaml",
    name: "YAML",
    rules: [
      [m(String.raw`^---\s*$`), 3],
      [m(String.raw`^\s*-\s+[\w."'-]+:\s`), 3],
      [m(String.raw`^\s*(apiVersion|kind|metadata|spec|services|version|name|on|jobs|steps|runs-on|image|ports|volumes|environment):`), 3],
    ],
    against: [[m(String.raw`[{};]\s*$|=>|\bfunction\b`), 5]],
    measure: (text, lines) => (lines.filter((l) => l.trim()).length >= 3 && share(lines, /^\s*(-\s+)?[\w."'/@-]+:(\s+\S.*|\s*)$|^\s*-\s+\S.*$|^\s*#.*$/) >= 0.8 && /^\s*(-\s+)?[\w."'-]+:\s*\S/m.test(text) && /^\s+\S|^\s*-\s+\S|^---\s*$/m.test(text) && lines.filter((l) => /^\s*(-\s+)?[\w."'-]+:(\s|$)/.test(l)).length >= 2 ? 7 : 0),
  },
  {
    id: "ini",
    name: "TOML / INI",
    rules: [
      [m(String.raw`^\[{1,2}[\w."' -]+\]{1,2}\s*$`), 5],
      [m(String.raw`^[A-Za-z_][\w.-]*\s*=\s*("[^"]*"|'[^']*'|\d[\d._]*|true|false|\[.*\])\s*$`), 3],
    ],
    against: [[m(String.raw`[;{]\s*$|\bfunction\b|=>|\bconst\b|\blet\b`), 4]],
  },
  {
    id: "dockerfile",
    name: "Dockerfile",
    rules: [
      [m(String.raw`^FROM\s+[\w./:@-]+(\s+AS\s+\w+)?\s*$`), 8],
      [m(String.raw`^(RUN|CMD|COPY|ADD|ENTRYPOINT|EXPOSE|WORKDIR|ENV|ARG|USER|VOLUME|HEALTHCHECK|LABEL)\s+\S`), 4],
    ],
  },
  {
    id: "graphql",
    name: "GraphQL",
    rules: [
      [m(String.raw`^\s*(query|mutation|subscription|fragment)\s+\w*\s*(\([^)]*\))?\s*(on\s+\w+\s*)?\{`), 8],
      [m(String.raw`\$\w+\s*:\s*[\w!\[\]]+`), 3],
      [m(String.raw`^\s*(type|input|enum|interface|union|scalar|schema)\s+\w*\s*[{=]?`), 2],
      [m(String.raw`\w+\s*(\([^)]*\))?\s*:\s*\[?[A-Z]\w*!?\]?!?\s*$`), 3],
    ],
    against: [[m(String.raw`\bfunction\b|\bconst\b|;\s*$`), 4]],
  },
  {
    id: "lua",
    name: "Lua",
    rules: [
      [m(String.raw`\blocal\s+(function\s+)?\w+`), 5],
      [m(String.raw`^\s*function\s+[\w.:]+\s*\(.*\)\s*$`), 4],
      [m(String.raw`^\s*end\s*[,)]?\s*$`), 2],
      [m(String.raw`\bthen\s*$|\bdo\s*$`), 2],
      [m(String.raw`~=|\bnil\b|\bipairs\(|\bpairs\(|\brequire\(["']`), 3],
      [m(String.raw`\.\.\s*["'\w]`), 2],
      [m(String.raw`\blocal\s+function\b`), 3],
      [m(String.raw`^\s*for\s+\w+\s*=\s*[\w(]+\s*,\s*[\w#()]+(\s*,\s*[\w-]+)?\s+do\s*$`), 6],
      [m(String.raw`\bfor\s+\w+(\s*,\s*\w+)?\s+in\s+i?pairs\(`), 6],
    ],
    against: [[m(String.raw`[;{]\s*$|\bfn\b|\bdef\b`), 3]],
  },
  {
    id: "diff",
    name: "Diff",
    rules: [
      [m(String.raw`^diff --git `), 10],
      [m(String.raw`^@@ -\d+(,\d+)? \+\d+(,\d+)? @@`), 10],
      [m(String.raw`^(---|\+\+\+) \S`), 4],
    ],
    measure: (_text, lines) => (lines.length >= 4 && share(lines, /^[+-][^+-]|^ /) >= 0.8 && lines.some((l) => l.startsWith("+")) && lines.some((l) => l.startsWith("-")) ? 8 : 0),
  },
];

/** How strongly the text reads as one language, and which signs it matched. */
function score(lang: Language, text: string, lines: string[]): number {
  let total = 0;
  for (const [pattern, weight, many] of lang.rules) {
    if (many) total += weight * Math.min(4, text.match(new RegExp(pattern.source, pattern.flags.replace("g", "") + "g"))?.length ?? 0);
    else if (pattern.test(text)) total += weight;
  }
  for (const [pattern, weight] of lang.against ?? []) if (pattern.test(text)) total -= weight;
  return total + (lang.measure?.(text, lines) ?? 0);
}

/** A language needs at least this much evidence, and to beat the runner-up by this much. */
const MIN_SCORE = 7;
const MIN_LEAD = 3;

export interface Guess {
  /** highlight.js's name for it. */
  id: string;
  name: string;
  score: number;
}

/** What language code is in, or undefined when nothing stands out (the viewer then asks highlight.js). */
export function guessLanguage(raw: string): Guess | undefined {
  const text = raw.slice(0, SAMPLE_CHARS);
  const lines = text.split("\n");
  // Equal scores keep the list's order, which puts JavaScript before TypeScript and C++ before C.
  const scored = LANGUAGES.map((lang, order) => ({ lang, order, score: score(lang, text, lines) })).sort((a, b) => b.score - a.score || a.order - b.order);
  const best = scored[0];
  if (!best || best.score < MIN_SCORE) return undefined;
  // The runner-up has to be from another family: TypeScript beating JavaScript by a hair is still one answer.
  const rival = scored.find((other) => other !== best && (!best.lang.family || other.lang.family !== best.lang.family));
  if (rival && best.score - rival.score < MIN_LEAD) return undefined;
  const { lang } = best;
  return { id: lang.id, name: lang.name, score: best.score };
}

/** Fence names people write, as highlight.js knows them. */
const ALIASES: Record<string, string> = {
  js: "javascript", jsx: "javascript", node: "javascript", mjs: "javascript", cjs: "javascript",
  ts: "typescript", tsx: "typescript",
  py: "python", python3: "python", rs: "rust", golang: "go", rb: "ruby", kt: "kotlin", kts: "kotlin",
  sh: "bash", shell: "bash", zsh: "bash", console: "bash", terminal: "bash",
  yml: "yaml", html: "xml", htm: "xml", svg: "xml", vue: "xml",
  "c++": "cpp", cxx: "cpp", hpp: "cpp", "c#": "csharp", cs: "csharp",
  ps1: "powershell", pwsh: "powershell", ps: "powershell", hs: "haskell", ex: "elixir", exs: "elixir", pl: "perl", pm: "perl",
  objc: "objectivec", "objective-c": "objectivec", vb: "vbnet", vbs: "vbnet", make: "makefile", octave: "matlab", gradle: "groovy", jenkinsfile: "groovy", sc: "scala",
  docker: "dockerfile", toml: "ini", md: "markdown", pgsql: "sql", postgres: "sql", mysql: "sql", gql: "graphql",
};
const NAMES: Record<string, string> = Object.fromEntries(LANGUAGES.map((l) => [l.id, l.name]));
Object.assign(NAMES, { xml: "HTML", bash: "Shell", markdown: "Markdown", json: "JSON", php: "PHP", sql: "SQL" });


/** A fence's language word, as highlight.js's name and as people write it; undefined if it isn't one we colour. */
function fromFence(word: string): { id: string; name: string } | undefined {
  const key = word.toLowerCase();
  const id = ALIASES[key] ?? key;
  return NAMES[id] ? { id, name: NAMES[id] } : undefined;
}

const MARKDOWN_SIGNS = [
  /^#{1,6}\s+[A-Za-z0-9`*[]/m, // a heading
  /^\s*[-*+]\s+\S/m, // a bullet
  /^\s*\d+\.\s+\S/m, // a numbered item
  /```/, // a fenced block
  /^\s*\|.+\|\s*$/m, // a table row
  /\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)/, // a link
  /\*\*[^*\n]+\*\*/, // bold
  /^>\s+\S/m, // a quote
];

/** A line that reads as code rather than prose. Keywords are matched as written, so a sentence starting "If" isn't code. */
const CODE_LINE =
  /(;\s*$|[{}]\s*$|=>|\)\s*\{|::|\b(async|await)\b|^\s*(import|export|const|let|var|function|class|def|return|if|for|while|public|private|package|func|#include)\b|^\s*<\/?[a-z][\w-]*[^>]*>|^\s{2,}\S)/;

/** An assignment or a call on its own line: how scripts read, where prose doesn't. */
const STATEMENT = /^\s*([\w.[\]'"]+\s*[-+*/]?=\s*\S|[\w.]+\(.*\)\s*;?\s*$)/;

const codeSnippet = (text: string, guess?: { id: string; name: string }): Snippet => ({
  kind: "code",
  text,
  language: guess?.id,
  languageName: guess?.name,
  label: "View code",
  title: guess ? `${guess.name} code` : "Code",
});

/** Recognises a curl command, code or Markdown in a message; undefined for ordinary text. */
export function detectSnippet(raw: string): Snippet | undefined {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  if (!text) return undefined;

  if (/^curl\s/i.test(text)) return { kind: "curl", text, language: "bash", languageName: "Shell", label: "View cURL", title: "cURL command" };

  // The whole message is one fenced block: it's code, shown without the fences.
  const fence = text.match(/^```([\w+#.-]*)[^\n]*\n([\s\S]*?)\n?```$/);
  if (fence && !fence[2].includes("```")) {
    const named = fence[1] ? fromFence(fence[1]) : undefined;
    const guess = named ?? guessLanguage(fence[2]);
    return codeSnippet(fence[2], guess && { id: guess.id, name: guess.name });
  }

  const lines = text.split("\n");
  const guess = guessLanguage(text);
  const signs = MARKDOWN_SIGNS.filter((sign) => sign.test(text)).length;
  const statements = lines.filter((line) => CODE_LINE.test(line) || STATEMENT.test(line)).length;
  const looksLikeCode = statements / Math.max(1, lines.filter((line) => line.trim()).length) >= 0.4;
  const markdown = lines.length >= 2 && (signs >= 2 || (signs >= 1 && /^#{1,6}\s+\S/m.test(text) && lines.length >= 3)) && !(signs < 2 && looksLikeCode);

  // Code wins over Markdown when its language is clear: a Python comment looks like a heading, a
  // dash-led line like a bullet. Markdown that merely quotes a code block still has no language of its own.
  if (guess && (lines.length >= 2 || guess.score >= 12) && (!markdown || guess.score >= 10)) {
    return codeSnippet(text, { id: guess.id, name: guess.name });
  }
  if (markdown) return { kind: "markdown", text, label: "Read Markdown", title: "Markdown" };

  // Code in a language we have no signs for (Dart, Scala, Perl…): it still reads as code, and the viewer
  // asks highlight.js which one it is.
  const filled = lines.filter((line) => line.trim());
  const codeLines = filled.filter((line) => CODE_LINE.test(line)).length;
  if (filled.length >= 4 && codeLines >= 4 && codeLines / filled.length >= 0.6) return codeSnippet(text);
  return undefined;
}
