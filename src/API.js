import {slice, supportsU, unescape} from './utils.js'

import {assemble, decorate, $direction, finalize, flagsMatcher, $flagValidator, groupNameMatcher, metadata, needsWrappingForQuantifier, $$_resetRefCapsAndFlags} from './core.js'


//- - - - - - - - - - -//
// - - ~ - -   - -   - //
//                     //
//    ,--.  ,--.  .    //
//    |  |  |  |  |    //
//    |--|  |--´  |    //
//    '  '  '     '    //
//                     //
// -   - -   - - ~ - - //
//- - - - - - - - - - -//

// public API

var empty = /(?:)/

export function either() {
	if (!arguments.length) return empty
    $$_resetRefCapsAndFlags()
    return finalize(assemble(arguments, true, false, 0))
}

function _sequence() {
	return assemble(arguments, false, false, 0)
}

export function sequence() {
    if (!arguments.length) return empty
    $$_resetRefCapsAndFlags()
    return finalize(_sequence.apply(null, arguments))
}

function makeAssertion (before, after, direction) {
	return function () {
		if (!arguments.length) return empty
        var previousDir = $direction.current
        $direction.current = direction
        try {
            $$_resetRefCapsAndFlags()
            var result = _sequence.apply(null, arguments)
            return finalize(decorate(result, {wrapper: [before, after]}), {direction: 0})
        } finally {
            $direction.current = previousDir
        }
	}
}

export var lookAhead = makeAssertion('(?=', ')', 1)
export var avoid = makeAssertion('(?!', ')', 1)
export var lookBehind = makeAssertion('(?<=', ')', -1)
export var notBehind = makeAssertion('(?<!', ')', -1)

var suffixMatcher = /^(?:\+|\*|\?|\{(\d+),?(\d*)\})\??$/

var call = _suffix.call

function _suffix() {
	// the quantifier is passed as context
	$$_resetRefCapsAndFlags()
	// a neat hack to pass all arguements but the operator to `_sequence()`
	// without allocating an array. The operator is passed as `this` which is ignored.
	var res = call.apply(_sequence, arguments)
	return finalize(decorate(res, {condition: needsWrappingForQuantifier, wrapper: ['(?:', ')'], suffix: this}))
}

export function suffix(quantifier) {
	if (typeof quantifier !== 'string') quantifier = '{' + String(quantifier) + '}'
	var match = quantifier.match(suffixMatcher)
	if (!match || match[2] && Number(match[2]) < Number(match[1])) throw new SyntaxError("Invalid suffix '" + quantifier+ "'.")
	return arguments.length === 1
	? _suffix.bind(quantifier, quantifier)
	: _suffix.apply(quantifier, arguments)
}

export var maybe = suffix('?')


// Named groups are AFAIK not supported in engines that don't support the u flag.
// Even if they were, the validator would be huge: Clipped to the BMP, 
// - /\p{ID_Start}/u     is  /[A-Za-zªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶ-ͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙՠ-ֈא-תׯ-ײؠ-يٮ-ٯٱ-ۓەۥ-ۦۮ-ۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴ-ߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࡠ-ࡪࡰ-ࢇࢉ-ࢎࢠ-ࣉऄ-हऽॐक़-ॡॱ-ঀঅ-ঌএ-ঐও-নপ-রলশ-হঽৎড়-ঢ়য়-ৡৰ-ৱৼਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલ-ળવ-હઽૐૠ-ૡૹଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହଽଡ଼-ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘ-ౚౝౠ-ౡಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೝ-ೞೠ-ೡೱ-ೲഄ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖൟ-ൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะา-ำเ-ๆກ-ຂຄຆ-ຊຌ-ຣລວ-ະາ-ຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥ-ၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜑᜟ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡸᢀ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭌᮃ-ᮠᮮ-ᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᲀ-ᲈᲐ-ᲺᲽ-Ჿᳩ-ᳬᳮ-ᳳᳵ-ᳶᳺᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-ⳤⳫ-ⳮⳲ-ⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ々-〇〡-〩〱-〵〸-〼ぁ-ゖ゛-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎㆠ-ㆿㇰ-ㇿ㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪ-ꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꟊꟐ-ꟑꟓꟕ-ꟙꟲ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꣽ-ꣾꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꩾ-ꪯꪱꪵ-ꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]/
// - /\p{ID_Continue}/u  is  /[0-9A-Z_a-zªµ·ºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮ̀-ʹͶ-ͷͺ-ͽͿΆ-ΊΌΎ-ΡΣ-ϵϷ-ҁ҃-҇Ҋ-ԯԱ-Ֆՙՠ-ֈ֑-ֽֿׁ-ׂׄ-ׇׅא-תׯ-ײؐ-ؚؠ-٩ٮ-ۓە-ۜ۟-۪ۨ-ۼۿܐ-݊ݍ-ޱ߀-ߵߺ߽ࠀ-࠭ࡀ-࡛ࡠ-ࡪࡰ-ࢇࢉ-ࢎ࢘-ࣣ࣡-ॣ०-९ॱ-ঃঅ-ঌএ-ঐও-নপ-রলশ-হ়-ৄে-ৈো-ৎৗড়-ঢ়য়-ৣ০-ৱৼ৾ਁ-ਃਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹ਼ਾ-ੂੇ-ੈੋ-੍ੑਖ਼-ੜਫ਼੦-ੵઁ-ઃઅ-ઍએ-ઑઓ-નપ-રલ-ળવ-હ઼-ૅે-ૉો-્ૐૠ-ૣ૦-૯ૹ-૿ଁ-ଃଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହ଼-ୄେ-ୈୋ-୍୕-ୗଡ଼-ଢ଼ୟ-ୣ୦-୯ୱஂ-ஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹா-ூெ-ைொ-்ௐௗ௦-௯ఀ-ఌఎ-ఐఒ-నప-హ఼-ౄె-ైొ-్ౕ-ౖౘ-ౚౝౠ-ౣ౦-౯ಀ-ಃಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹ಼-ೄೆ-ೈೊ-್ೕ-ೖೝ-ೞೠ-ೣ೦-೯ೱ-ೲഀ-ഌഎ-ഐഒ-ൄെ-ൈൊ-ൎൔ-ൗൟ-ൣ൦-൯ൺ-ൿඁ-ඃඅ-ඖක-නඳ-රලව-ෆ්ා-ුූෘ-ෟ෦-෯ෲ-ෳก-ฺเ-๎๐-๙ກ-ຂຄຆ-ຊຌ-ຣລວ-ຽເ-ໄໆ່-ໍ໐-໙ໜ-ໟༀ༘-༙༠-༩༹༵༷༾-ཇཉ-ཬཱ-྄྆-ྗྙ-ྼ࿆က-၉ၐ-ႝႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፝-፟፩-፱ᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-᜕ᜟ-᜴ᝀ-ᝓᝠ-ᝬᝮ-ᝰᝲ-ᝳក-៓ៗៜ-៝០-៩᠋-᠍᠏-᠙ᠠ-ᡸᢀ-ᢪᢰ-ᣵᤀ-ᤞᤠ-ᤫᤰ-᤻᥆-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉ᧐-᧚ᨀ-ᨛᨠ-ᩞ᩠-᩿᩼-᪉᪐-᪙ᪧ᪰-᪽ᪿ-ᫎᬀ-ᭌ᭐-᭙᭫-᭳ᮀ-᯳ᰀ-᰷᱀-᱉ᱍ-ᱽᲀ-ᲈᲐ-ᲺᲽ-Ჿ᳐-᳔᳒-ᳺᴀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼ‿-⁀⁔ⁱⁿₐ-ₜ⃐-⃥⃜⃡-⃰ℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-ⳤⳫ-ⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯ⵿-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⷠ-ⷿ々-〇〡-〯〱-〵〸-〼ぁ-ゖ゙-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎㆠ-ㆿㇰ-ㇿ㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘫꙀ-꙯ꙴ-꙽ꙿ-꛱ꜗ-ꜟꜢ-ꞈꞋ-ꟊꟐ-ꟑꟓꟕ-ꟙꟲ-ꠧ꠬ꡀ-ꡳꢀ-ꣅ꣐-꣙꣠-ꣷꣻꣽ-꤭ꤰ-꥓ꥠ-ꥼꦀ-꧀ꧏ-꧙ꧠ-ꧾꨀ-ꨶꩀ-ꩍ꩐-꩙ꩠ-ꩶꩺ-ꫂꫛ-ꫝꫠ-ꫯꫲ-꫶ꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯪ꯬-꯭꯰-꯹가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻ︀-️︠-︯︳-︴﹍-﹏ﹰ-ﹴﹶ-ﻼ０-９Ａ-Ｚ＿ａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]/
// i.e. 2 extra KiB

export function validateGroupName(name) {
	return !supportsU || groupNameMatcher.test(unescape(name))
}

function checkRef(name) {
	var type = typeof name
	return type === 'string' && validateGroupName(name)
	|| type === 'number' && 0 < name && Math.round(name) === name
}

export function ref(n, depth) {
	if (!checkRef(n)) throw new SyntaxError("Bad ref: " + n)
	if ((depth != null) && (typeof depth !== 'number' || depth < 1 || (depth !== depth|0))) throw new RangeError("Bad depth: " + depth)
    if (typeof n === 'string') return new RegExp('\\k<' + n + '>')
	var result = new RegExp('(?:$ ^d:' + (depth || '0')+ ",n:" + n + ")")
	metadata.set(result, {
        direction: $direction.current,
        hasFinalRef: true,
        hasRefs: true,
    })
	return result
}

export function capture() {
	$$_resetRefCapsAndFlags()
    var res = assemble(arguments, false, false, 1)
	return finalize(decorate(res, {wrapper: ['(', ')']}))
}

function _namedCapture(name) {
	if (typeof name !== 'string') throw new TypeError("String expected, got " + typeof name)
	validateGroupName(name)
	$$_resetRefCapsAndFlags()
    var res = assemble(slice.call(arguments, 1), false, false, 1)
    return finalize(decorate(res, {wrapper: ['(?<' + name + '>', ')']}))
}

export function namedCapture(name) {
	return (arguments.length === 1
	? _namedCapture.bind(null, name)
	: _namedCapture.apply(null, arguments))
}

export function atomic() {
    return $direction.current === 1 
    // forward: 
    ? sequence(lookAhead(capture.apply(null, arguments)), ref(1))
    // backward:
    : sequence(ref(1), lookBehind(capture.apply(null, arguments)))
}


//- - - - - - - - - - - - - - - //
//-- -  -   -    -     -      - //
//    ,---                      //
//    |__ |   ,--. ,--. ,--.    //
//    |   |   ,--| |  | `--.    //
//    '   `-- `--' `--| `--´    //
//                 `--´         //
// -      -     -    -   -  - --//
//- - - - - - - - - - - - - - - //

// flag operations

// core functions

function flagAdd(a, b) {
	a = a.split('')
	b.split('').forEach(function(flag){if (a.indexOf(flag) === -1) a.push(flag)})
	return a.sort().join('')
}

function _flags(fl) {
	// the operation is passed as context
	$$_resetRefCapsAndFlags()
    // flags.remove throws if passed 'u' so if present here, it is to be added and the engine should know
    // beforehand
	if (fl.indexOf('u') !== -1) $flagValidator.U = true
	// bad hack, see _suffix
	var source = call.apply(_sequence, arguments)
	return finalize(source, {flagsOp: this, flags: fl})
}

export var flags = {add: function add(flags) {
	if (typeof flags !== 'string') throw TypeError("String expected as first argument, got " + typeof flags)
	if (!flagsMatcher.test(flags)) throw new SyntaxError("Invalid flags: " + flags)
	return arguments.length === 1
	? _flags.bind(flagAdd, flags)
	: _flags.apply(flagAdd, arguments)
}}


function csDiff(a, b) {return sequence(avoid(b), a)}
function csInter(a, b) {return sequence(avoid(csDiff(a, b)), a)}

export var charSet = {
	union: either,
	difference: csDiff,
	intersection: csInter
}

export function bound() {
	return either(
		[notBehind.apply(null, arguments), lookAhead.apply(null, arguments)],
		[lookBehind.apply(null, arguments), avoid.apply(null, arguments)]
	)
}