
type NonNegInteger<N extends number, S extends string> = `${N}` extends Subtract<S, NotInInteger> ? N : never

export type Param = string | RegExp | [Param] | (() => Param)

export declare function either(...x: [Param]) : RegExp
export declare function sequence(...x: [Param]) : RegExp
export declare function maybe(...x: [Param]) : RegExp


// Machinery for the quantifiers

type Subtract<T, U> = T & Exclude<T, U>

type Interrogation = '' | '?'

type SimpleQuantifier = '*' | '+' | '?' | '*?' | '+?' | '??'

type NotInInteger = 
    | `${string}.${string}`
    | `${string}E${string}`
    | `${string}N${string}` 
    | `${string}I${string}` 
    | `${string}e${string}` 
    | `${string}-${string}`

type HackyQuantifier =
    | number
    | [number]
    | [number, number]
    | {'0': number, '1': undefined, length: 2} & Array<any>

type BracketQuantifier = `{${number}}${Interrogation}` | `{${number},}${Interrogation}` | `{${number},${number}}${Interrogation}`

export declare function suffix<BQ extends BracketQuantifier>(
    s: SimpleQuantifier | HackyQuantifier | Subtract<BQ, NotInInteger>,
    ...x: [Param]
) : RegExp


// Machinery for the flags
// Based on https://glitch.com/~efficacious-valley-repair 's output for
// `/^[dgimsuy]{6}$/`
// That glitch is the work of https://github.com/AnyhowStep
// repo: https://github.com/AnyhowStep/efficacious-valley-repair

type Head<StrT extends string> = StrT extends `${infer HeadT}${string}` ? HeadT : never;

type Tail<StrT extends string> = StrT extends `${string}${infer TailT}` ? TailT : never;

interface Dfa {
    startState : string,
    acceptStates : string,
    transitions : Record<string, Record<string, string>>,
}
type AcceptsImpl<
    DfaT extends Dfa,
    StateT extends string,
    InputT extends string
> =
    InputT extends "" ?
    (StateT extends DfaT["acceptStates"] ? true : false) :
    AcceptsImpl<
        DfaT,
        DfaT["transitions"][StateT][Head<InputT>],
        Tail<InputT>
    >;

type Accepts<DfaT extends Dfa, InputT extends string> = AcceptsImpl<DfaT, DfaT["startState"], InputT>;

type DGIMSUY<Next> = 
    & Record<"d"|"g"|"i"|"m"|"s"|"u"|"y", Next>
    & Record<string, "fail">

interface Flags {
    startState : "0",
    acceptStates : "0"|"1"|"2"|"3"|"4"|"5"|"6",
    transitions : {
        "0": DGIMSUY<"1">,
        "1": DGIMSUY<"2">,
        "2": DGIMSUY<"3">,
        "3": DGIMSUY<"4">,
        "4": DGIMSUY<"5">,
        "5": DGIMSUY<"6">,
        "6": Record<string, "fail">,
        "fail": Record<string, "fail">,
    },
}

type InLanguage_0 = Accepts<Flags, "df"> /** Insert your string here */

type CheckType<F extends Flags, Str extends string> = Accepts<F, Str> extends true ? Str : [`Invalid flags: ${Str}`];

type TwoFlags = 
    | `${string}d${string}d${string}`
    | `${string}g${string}g${string}`
    | `${string}i${string}i${string}`
    | `${string}m${string}m${string}`
    | `${string}s${string}s${string}`
    | `${string}u${string}u${string}`
    | `${string}y${string}y${string}`
    | `${string}g${string}y${string}`
    | `${string}y${string}g${string}`

export interface flags<Str extends string>{
    add(
        flags: Subtract<CheckType<Flags, Str>, TwoFlags>,
        ...x: [Param]
    ) : RegExp
}

export declare function capture(...x: [Param]) : RegExp
export declare function namedCapture(label: string, ...x: [Param]) : RegExp
export declare function ref(n:number): RegExp
export declare function ref(n:number, depth:number): RegExp
export declare function ref(s:string): RegExp


export declare function lookAhead(...x: [Param]) : RegExp
export declare function notAhead(...x: [Param]) : RegExp
export declare function lookBehind(...x: [Param]) : RegExp
export declare function notBehind(...x: [Param]) : RegExp

export declare function atomic(...x: [Param]) : RegExp

export declare function bound(x: Param) : RegExp
export declare function noBound(x: Param) : RegExp

export type CharSet = RegExp | string

export type charSet = {
    difference: (a: CharSet, b:CharSet) => RegExp
    invert: (a: CharSet) => RegExp
    intersection: (a: CharSet, b:CharSet) => RegExp
    union: (a: CharSet, b:CharSet) => RegExp
}

