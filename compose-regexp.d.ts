export type Param = string | RegExp | [Param] | (() => Param)

export type Quantifier = '*' | '+' | '?' | '*?' | '+?' | '??' | number | [number] | {'0': number, length: 2} | [number, number]

export declare function either(...x: [Param]) : RegExp
export declare function sequence(...x: [Param]) : RegExp
export declare function suffix(s: Quantifier, ...x: [Param]) : RegExp
export declare function maybe(...x: [Param]) : RegExp
export interface flags {
    add(flags: string, ...x: [Param]) : RegExp
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

