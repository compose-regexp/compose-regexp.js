(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define('compose-regexp', ['exports'], factory) :
    (factory((global.composeRegexp = {})));
}(this, function (exports) { 'use strict';

    var empty = new RegExp('')

    function normalize (source, degroup) {
        if (source instanceof RegExp) return source.source
        else return (source+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&")
    }

    function either() {
        if (!arguments.length) return empty;
        return new RegExp('(?:' + [].map.call(arguments, normalize).join('|') + ')')
    }

    function group() {
        if (!arguments.length) return empty;
        return new RegExp('(?:' + [].map.call(arguments, normalize).join('') + ')')
    }

    function sequence() {
        if (!arguments.length) return empty;
        return new RegExp([].map.call(arguments, normalize).join(''))
    }

    var validSuffix = sequence(
        /^/,
        either(
            '+', '*', '?',
            /\{\s*\d+\s*,?\s*\d*\s*\}/
        ),
        /$/
    )

    function greedy(suffix) {
        if (!validSuffix.test(suffix)) throw new Error("Invalid suffix '" + suffix+ "'.")
        var args = [].slice.call(arguments, 1)
        if (!args.length) return empty;
        return new RegExp(group.apply(null, args).source + suffix)
    }

    function frugal(suffix) {
        if (!validSuffix.test(suffix)) throw new Error("Invalid suffix '" + suffix+ "'.")
        var args = [].slice.call(arguments, 1)
        if (!args.length) return empty;
        return new RegExp(group.apply(null, args).source + suffix + '?')
    }


    function ref(n) {
        return new RegExp('\\' + n)
    }

    function lookAhead() {
        if (!arguments.length) return empty;
        return new RegExp('(?=' + [].map.call(arguments, normalize).join('') + ')')
    }

    function avoid() {
        if (!arguments.length) return empty;
        return new RegExp('(?!' + [].map.call(arguments, normalize).join('') + ')')
    }

    function flags(opts) {
        var args = [].slice.call(arguments, 1)
        var expr
        if (!args.length) expr = '';
        else expr = args.map(normalize).join('')
        return new RegExp(expr, opts)
    }


    function capture () {
        if (!arguments.length) return new RegExp('()');
        return new RegExp('(' + [].map.call(arguments, normalize).join('') + ')')
    }

    exports.either = either;
    exports.group = group;
    exports.sequence = sequence;
    exports.greedy = greedy;
    exports.frugal = frugal;
    exports.ref = ref;
    exports.lookAhead = lookAhead;
    exports.avoid = avoid;
    exports.flags = flags;
    exports.capture = capture;

}));